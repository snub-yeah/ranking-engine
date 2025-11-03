import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist, Video } from "../types.ts";

const db = new sqlite3.Database("./src/app.db");

const playlists = new Hono();

playlists.get("/all", async (c) => {
  return new Promise<Response>((resolve) => {
    db.all("SELECT * FROM playlists ORDER BY id DESC", (err, rows) => {
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

  return new Promise<Response>((resolve) => {
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

  return new Promise<Response>((resolve) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // check if playlist exists and user owns it
      db.get(
        "SELECT * FROM playlists WHERE id = ?",
        [id],
        (err, row: Playlist) => {
          if (err) {
            db.run("ROLLBACK");
            resolve(c.json({ error: "Database error" }, 500));
            return;
          }

          if (!row) {
            db.run("ROLLBACK");
            resolve(c.json({ error: "Playlist not found" }, 404));
            return;
          }

          if (row.userId !== user.id) {
            db.run("ROLLBACK");
            resolve(c.json({ error: "That's not yours to delete" }, 403));
            return;
          }

          // delete scores for all videos in this playlist
          db.run(
            "DELETE FROM scores WHERE videoId IN (SELECT id FROM videos WHERE playlistId = ?)",
            [id],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                resolve(c.json({ error: "Failed to delete scores" }, 500));
                return;
              }

              // delete videos in this playlist
              db.run("DELETE FROM videos WHERE playlistId = ?", [id], (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  resolve(c.json({ error: "Failed to delete videos" }, 500));
                  return;
                }

                // delete the playlist itself
                db.run("DELETE FROM playlists WHERE id = ?", [id], (err) => {
                  if (err) {
                    db.run("ROLLBACK");
                    resolve(
                      c.json({ error: "Failed to delete playlist" }, 500),
                    );
                    return;
                  }

                  // commit the transaction
                  db.run("COMMIT", (err) => {
                    if (err) {
                      resolve(
                        c.json({ error: "Failed to commit transaction" }, 500),
                      );
                    } else {
                      resolve(
                        c.json({
                          success: true,
                          message: "Playlist deleted successfully",
                        }),
                      );
                    }
                  });
                });
              });
            },
          );
        },
      );
    });
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

    return new Promise<Response>((resolve) => {
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

// Get contributors for a playlist
playlists.get("/:id/contributors", async (c) => {
  const user = c.get("jwtPayload");
  const id = c.req.param("id");

  return new Promise<Response>((resolve) => {
    // Check if user is the playlist owner
    db.get(
      "SELECT * FROM playlists WHERE id = ?",
      [id],
      (err, playlist: Playlist) => {
        if (err) {
          resolve(c.json({ error: "Database error" }, 500));
          return;
        }
        if (!playlist) {
          resolve(c.json({ error: "Playlist not found" }, 404));
          return;
        }
        if (playlist.userId !== user.id) {
          resolve(c.json({ error: "That's not your playlist" }, 403));
          return;
        }

        // Get all contributors
        db.all(
          `SELECT c.user_id, u.username 
           FROM CanContributeToPlaylist c 
           JOIN users u ON c.user_id = u.id 
           WHERE c.playlist_id = ?`,
          [id],
          (err, contributors) => {
            if (err) {
              resolve(c.json({ error: "Database error" }, 500));
              return;
            }
            resolve(c.json({ contributors }));
          },
        );
      },
    );
  });
});

// Add a contributor to a playlist
playlists.post("/:id/contributors", async (c) => {
  const user = c.get("jwtPayload");
  const id = c.req.param("id");

  try {
    const { userId } = await c.req.json<{ userId: number }>();

    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    return new Promise<Response>((resolve) => {
      // Check if user is the playlist owner
      db.get(
        "SELECT * FROM playlists WHERE id = ?",
        [id],
        (err, playlist: Playlist) => {
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
            return;
          }
          if (!playlist) {
            resolve(c.json({ error: "Playlist not found" }, 404));
            return;
          }
          if (playlist.userId !== user.id) {
            resolve(c.json({ error: "That's not your playlist" }, 403));
            return;
          }

          // Check if user exists
          db.get("SELECT * FROM users WHERE id = ?", [userId], (err, targetUser) => {
            if (err) {
              resolve(c.json({ error: "Database error" }, 500));
              return;
            }
            if (!targetUser) {
              resolve(c.json({ error: "User not found" }, 404));
              return;
            }

            // Check if already a contributor
            db.get(
              "SELECT * FROM CanContributeToPlaylist WHERE user_id = ? AND playlist_id = ?",
              [userId, id],
              (err, existing) => {
                if (err) {
                  resolve(c.json({ error: "Database error" }, 500));
                  return;
                }
                if (existing) {
                  resolve(c.json({ error: "User is already a contributor" }, 400));
                  return;
                }

                // Add contributor
                db.run(
                  "INSERT INTO CanContributeToPlaylist (user_id, playlist_id) VALUES (?, ?)",
                  [userId, id],
                  function (err) {
                    if (err) {
                      resolve(c.json({ error: "Database error" }, 500));
                    } else {
                      resolve(
                        c.json(
                          {
                            success: true,
                            message: "Contributor added successfully",
                          },
                          201,
                        ),
                      );
                    }
                  },
                );
              },
            );
          });
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Remove a contributor from a playlist
playlists.delete("/:id/contributors/:userId", async (c) => {
  const user = c.get("jwtPayload");
  const id = c.req.param("id");
  const userId = parseInt(c.req.param("userId"));

  return new Promise<Response>((resolve) => {
    // Check if user is the playlist owner
    db.get(
      "SELECT * FROM playlists WHERE id = ?",
      [id],
      (err, playlist: Playlist) => {
        if (err) {
          resolve(c.json({ error: "Database error" }, 500));
          return;
        }
        if (!playlist) {
          resolve(c.json({ error: "Playlist not found" }, 404));
          return;
        }
        if (playlist.userId !== user.id) {
          resolve(c.json({ error: "That's not your playlist" }, 403));
          return;
        }

        // Remove contributor
        db.run(
          "DELETE FROM CanContributeToPlaylist WHERE user_id = ? AND playlist_id = ?",
          [userId, id],
          function (err) {
            if (err) {
              resolve(c.json({ error: "Database error" }, 500));
            } else if (this.changes === 0) {
              resolve(c.json({ error: "Contributor not found" }, 404));
            } else {
              resolve(
                c.json({
                  success: true,
                  message: "Contributor removed successfully",
                }),
              );
            }
          },
        );
      },
    );
  });
});

export default playlists;
