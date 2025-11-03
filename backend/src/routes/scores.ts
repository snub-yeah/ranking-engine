import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist, VideoMinusPlaylistId } from "../types.ts";

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

const scores = new Hono();

scores.get("/all/:playlistId", async (c) => {
  const user = c.get("jwtPayload");

  try {
    const playlistId = c.req.param("playlistId");

    return new Promise<Response>((resolve) => {
      db.get(
        "SELECT * FROM playlists WHERE id = ?",
        [playlistId],
        (err, playlist: Playlist) => {
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
          } else if (!playlist) {
            resolve(c.json({ error: "Playlist not found" }, 404));
          } else if (playlist.userId !== user.id) {
            resolve(c.json({ error: "That's not your playlist" }, 401));
          } else {
            const ownerVoteCounts =
              playlist.doesOwnerVoteCount == 1 ? true : false;
            db.all(
              "SELECT v.id, v.link, v.userId, u.username FROM videos v JOIN users u ON v.userId = u.id WHERE playlistId = ?",
              [playlistId],
              (err, videos: VideoMinusPlaylistId[]) => {
                if (err) {
                  resolve(c.json({ error: "Database error" }, 500));
                } else {
                  const responseArray: any[] = [];
                  let completedVideos = 0;

                  if (videos.length === 0) {
                    resolve(c.json([]));
                    return;
                  }

                  for (const video of videos) {
                    db.all(
                      `SELECT s.id, s.score, s.comment, s.videoId, u.username, u.id as userId
                     FROM scores s
                     JOIN users u ON s.userId = u.id
                     WHERE s.videoId = ?`,
                      [video.id],
                      (err, scores: any[]) => {
                        if (err) {
                          resolve(c.json({ error: "Database error" }, 500));
                          return;
                        }

                        // Calculate average based on doesOwnerVoteCount
                        let average = 0;
                        if (scores.length > 0) {
                          let scoresToInclude = scores;
                          if (!ownerVoteCounts) {
                            // Exclude owner's scores from average
                            scoresToInclude = scores.filter(
                              (score) => score.userId !== video.userId,
                            );
                          }

                          if (scoresToInclude.length > 0) {
                            const sum = scoresToInclude.reduce(
                              (acc, score) => acc + score.score,
                              0,
                            );
                            average = sum / scoresToInclude.length;
                          }
                        }

                        responseArray.push({
                          video: {
                            id: video.id,
                            link: video.link,
                            username: video.username,
                          },
                          scores: scores.map((score) => ({
                            id: score.id,
                            score: score.score,
                            comment: score.comment,
                            username: score.username,
                          })),
                          average: average,
                        });

                        completedVideos++;
                        if (completedVideos === videos.length) {
                          resolve(c.json(responseArray));
                        }
                      },
                    );
                  }
                }
              },
            );
          }
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

scores.get("/:videoId", async (c) => {
  const user = c.get("jwtPayload");

  try {
    return new Promise<Response>((resolve) => {
      db.get(
        "SELECT * FROM scores WHERE userId = ? AND videoId = ?",
        [user.id, c.req.param("videoId")],
        (err, score) => {
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
          } else {
            resolve(c.json(score || { score: 0, comment: null }));
          }
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

scores.post("/:videoId", async (c) => {
  const user = c.get("jwtPayload");

  const videoId = c.req.param("videoId");

  try {
    const { score, comment } = await c.req.json<{
      score: number;
      comment?: string;
    }>();

    if (!score || score < 1 || score > 11 || !Number.isInteger(score)) {
      return c.json(
        { error: "Score must be an integer between 1 and 11" },
        400,
      );
    }

    return new Promise<Response>((resolve) => {
      // First get the video to find its playlist
      db.get(
        "SELECT playlistId FROM videos WHERE id = ?",
        [videoId],
        (err, video: { playlistId: number }) => {
          if (err) {
            resolve(c.json({ error: "Database error 1" }, 500));
            return;
          }
          if (!video) {
            resolve(c.json({ error: "Video not found" }, 404));
            return;
          }

          // Get the playlist
          db.get(
            "SELECT * FROM playlists WHERE id = ?",
            [video.playlistId],
            (err, playlist: Playlist) => {
              if (err) {
                resolve(c.json({ error: "Database error 2" }, 500));
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
                          "You don't have permission to rate videos in this playlist",
                      },
                      403,
                    ),
                  );
                  return;
                }

                // Check if user already has a rating for this video
                db.get(
                  "SELECT * FROM scores WHERE userId = ? AND videoId = ?",
                  [user.id, videoId],
                  (err, existingScore) => {
                    if (err) {
                      resolve(c.json({ error: "Database error 3" }, 500));
                      return;
                    } else if (existingScore) {
                      db.run(
                        "UPDATE scores SET score = ?, comment = ? WHERE userId = ? AND videoId = ?",
                        [score, comment || null, user.id, videoId],
                        function (err) {
                          if (err) {
                            resolve(c.json({ error: "Database error 4" }, 500));
                          } else {
                            resolve(
                              c.json(
                                {
                                  success: true,
                                  message: "Score updated successfully",
                                },
                                200,
                              ),
                            );
                          }
                        },
                      );
                    } else {
                      db.run(
                        "INSERT INTO scores (score, userId, videoId, comment) VALUES (?, ?, ?, ?)",
                        [score, user.id, videoId, comment || null],
                        function (err) {
                          if (err) {
                            resolve(c.json({ error: "Database error 5" }, 500));
                          } else {
                            resolve(
                              c.json(
                                {
                                  success: true,
                                  message: "Score created successfully",
                                },
                                201,
                              ),
                            );
                          }
                        },
                      );
                    }
                  },
                );
              });
            },
          );
        },
      );
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default scores;
