import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist } from "../types.js";

const db = new sqlite3.Database("./src/app.db");

// Helper function to check if user can contribute to a playlist
function canUserContribute(
  userId: number,
  playlist: Playlist,
  callback: (canContribute: boolean) => void,
) {
  // Creator can always contribute
  if (playlist.userId === userId) {
    callback(true);
    return;
  }

  // Check if user is in CanContributeToPlaylist table
  db.get(
    "SELECT * FROM CanContributeToPlaylist WHERE user_id = ? AND playlist_id = ?",
    [userId, playlist.id],
    (err, row) => {
      if (err) {
        callback(false);
        return;
      }
      callback(!!row);
    },
  );
}

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
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
            return;
          }
          if (!playlist) {
            resolve(c.json({ error: "Playlist not found" }, 404));
            return;
          }

          // Check if user can contribute to this playlist
          canUserContribute(user.id, playlist, (canContribute) => {
            if (!canContribute) {
              resolve(
                c.json(
                  {
                    error:
                      "You don't have permission to add videos to this playlist",
                  },
                  403,
                ),
              );
              return;
            }

            if (links.length > playlist.videoLimit) {
              resolve(c.json({ error: "Too many videos bruh" }, 400));
              return;
            }

            //initial check to see if each link is formatted correctly, and get the video code to properly embed it
            for (let i = 0; i < links.length; i++) {
              const link = links[i];
              if (
                !link.startsWith("https://www.youtube.com/watch?v=") &&
                !link.startsWith("https://youtu.be/") &&
                !link.startsWith("https://www.youtube.com/embed/") &&
                !link.startsWith("https://drive.google.com/file/d/")
              ) {
                resolve(
                  c.json(
                    {
                      error:
                        'Invalid video link. Please go to the youtube video, click "Share" and copy the link, or set your google drive video to public and copy the link',
                    },
                    400,
                  ),
                );
                return;
              }
              let videoCode;
              if (link.startsWith("https://www.youtube.com/watch?v=")) {
                videoCode = link.split("v=")[1];
                links[i] = `https://www.youtube.com/embed/${videoCode}`;
              } else if (link.startsWith("https://youtu.be/")) {
                videoCode = link.split("/")[3];
                links[i] = `https://www.youtube.com/embed/${videoCode}`;
              } else if (link.startsWith("https://drive.google.com/file/d/")) {
                videoCode = link.split("/")[5];
                links[i] = `https://drive.google.com/file/d/${videoCode}/preview`;
              }
            }

            //clear the user's current submissions. i dont wanna check if they exist and do updates, so we're doing this
            db.run(
              "DELETE FROM videos WHERE playlistId = ? AND userId = ?",
              [playlistId, user.id],
              (err) => {
                if (err) {
                  resolve(c.json({ error: "Internal server error" }, 500));
                  return;
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
                    return;
                  }
                },
              );
            }
            resolve(c.json({ message: "Videos added successfully" }, 200));
          });
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default videos;
