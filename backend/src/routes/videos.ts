import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist } from "../types.js";

const db = new sqlite3.Database("./src/app.db");

const videos = new Hono();

videos.get("/:id", async (c) => {
  const playlistId = c.req.param("id");

  return new Promise<Response>((resolve) => {
    db.all(
      "SELECT * FROM videos WHERE playlistId = ?",
      [playlistId],
      (err, videos) => {
        if (!videos) {
          resolve(c.json({ error: "Video not found" }, 404));
        }

        resolve(c.json({ videos }));
      },
    );
  });
});

videos.get("/my-submissions/:id", async (c) => {
  const user = c.get("jwtPayload");

  const playlistId = c.req.param("id");

  return new Promise<Response>((resolve) => {
    db.all(
      "SELECT * FROM videos WHERE userId = ? AND playlistId = ?",
      [user.id, playlistId],
      (err, videos) => {
        if (!videos) {
          resolve(c.json({ error: "Playlist not found" }, 404));
        }

        resolve(c.json({ videos }));
      },
    );
  });
});

videos.post("/:id", async (c) => {
  const user = c.get("jwtPayload");

  try {
    const playlistId = c.req.param("id");

    let { links } = await c.req.json<{
      links: string[];
    }>();

    return new Promise<Response>((resolve) => {
      db.get(
        "SELECT * FROM playlists WHERE id = ?",
        [playlistId],
        (err, playlist: Playlist) => {
          if (!playlist) {
            resolve(c.json({ error: "Playlist not found" }, 404));
          }
          if (links.length > playlist.videoLimit) {
            resolve(c.json({ error: "Too many videos bruh" }, 400));
          }

          //initial check to see if each link is formatted correctly, and get the video code to properly embed it
          for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (
              !link.startsWith("https://www.youtube.com/watch?v=") &&
              !link.startsWith("https://youtu.be/") &&
              !link.startsWith("https://www.youtube.com/embed/")
            ) {
              resolve(
                c.json(
                  {
                    error:
                      'Invalid video link. Please go to the youtube video, click "Share" and copy the link',
                  },
                  400,
                ),
              );
            }
            let videoCode;
            if (link.startsWith("https://www.youtube.com/watch?v=")) {
              videoCode = link.split("v=")[1];
              links[i] = `https://www.youtube.com/embed/${videoCode}`;
            } else if (link.startsWith("https://youtu.be/")) {
              videoCode = link.split("/")[3];
              links[i] = `https://www.youtube.com/embed/${videoCode}`;
            }
          }

          //clear the user's current submissions. i dont wanna check if they exist and do updates, so we're doing this
          db.run(
            "DELETE FROM videos WHERE playlistId = ? AND userId = ?",
            [playlistId, user.id],
            (err) => {
              if (err) {
                resolve(c.json({ error: "Internal server error" }, 500));
              }
            },
          );
          for (const link of links) {
            db.run(
              "INSERT INTO videos (playlistId, link, userId) VALUES (?, ?, ?)",
              [playlistId, link, user.id],
              (err) => {
                if (err) {
                  resolve(c.json({ error: "Internal server error" }, 500));
                }
              },
            );
          }
          resolve(c.json({ message: "Videos added successfully" }, 200));
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default videos;
