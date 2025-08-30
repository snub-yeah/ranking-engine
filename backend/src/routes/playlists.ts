import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist } from "../types.ts";

const db = new sqlite3.Database("./src/app.db");

const playlists = new Hono();

playlists.get("/all", async (c) => {
  return new Promise((resolve) => {
    db.all("SELECT * FROM playlists", (err, rows) => {
      if (err) {
        resolve(c.json({ error: "Database error" }, 500));
      } else {
        resolve(c.json({ playlists: rows }));
      }
    });
  });
});

playlists.get("/:id", async (c) => {
  const id = c.req.param("id");

  return new Promise((resolve) => {
    db.all("SELECT * FROM playlists WHERE id = ?", [id], (err, rows) => {
      if (err) {
        resolve(c.json({ error: "Database error" }, 500));
      } else {
        resolve(c.json({ playlist: rows }));
      }
    });
  });
});

playlists.delete("/:id", async (c) => {
  const user = c.get("jwtPayload");
  const id = c.req.param("id");

  return new Promise((resolve) => {
    db.run(
      "SELECT * FROM playlists WHERE id = ?",
      [id],
      (err, rows: Playlist[]) => {
        if (err) {
          resolve(c.json({ error: "Database error" }, 500));
        } else if (!rows.length) {
          resolve(c.json({ error: "Playlist not found" }, 404));
        } else {
          if (rows[0].userId !== user.id) {
            resolve(c.json({ error: "That's not yours to delete" }, 403));
          }
          db.run("DELETE FROM playlists WHERE id = ?", [id], (err) => {
            if (err) {
              resolve(c.json({ error: "Database error" }, 500));
            } else {
              resolve(
                c.json({
                  success: true,
                  message: "Playlist deleted successfully",
                }),
              );
            }
          });
        }
      },
    );
  });
});

playlists.post("/", async (c) => {
  const user = c.get("jwtPayload");

  try {
    const { name, videoLimit, doesOwnerVoteCount } = await c.req.json<{
      name: string;
      videoLimit: number;
      doesOwnerVoteCount: number;
    }>();

    if (!name || !videoLimit) {
      return c.json(
        { error: "Name, video limit, does owner vote count are required" },
        400,
      );
    } else if (doesOwnerVoteCount != 0 && doesOwnerVoteCount != 1) {
      return c.json({ error: "Fix your vars bruh" }, 400);
    }

    return new Promise((resolve) => {
      db.run(
        "INSERT INTO playlists (name, videoLimit, doesOwnerVoteCount, userId) VALUES (?, ?, ?, ?)",
        [name, videoLimit, doesOwnerVoteCount, user.id],
        function (err) {
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
          } else {
            resolve(
              c.json(
                { success: true, message: "Playlist created successfully" },
                201,
              ),
            );
          }
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default playlists;
