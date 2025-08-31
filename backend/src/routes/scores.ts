import { Hono } from "hono";
import sqlite3 from "sqlite3";
import type { Playlist, VideoMinusPlaylistId } from "../types.ts";

const db = new sqlite3.Database("./src/app.db");

const scores = new Hono();

scores.get("/all/:playlistId", async (c) => {
  const user = c.get("jwtPayload");

  try {
    const playlistId = c.req.param("playlistId");

    return new Promise((resolve) => {
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
              "SELECT * FROM videos WHERE playlistId = ?",
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
                              (score) => score.userId !== playlist.userId,
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
                            userId: video.userId,
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
    return new Promise((resolve) => {
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

    return new Promise((resolve) => {
      // Check if user already has a rating for this video
      db.get(
        "SELECT * FROM scores WHERE userId = ? AND videoId = ?",
        [user.id, videoId],
        (err, existingScore) => {
          if (err) {
            resolve(c.json({ error: "Database error" }, 500));
          } else if (existingScore) {
            db.run(
              "UPDATE scores SET score = ?, comment = ? WHERE userId = ? AND videoId = ?",
              [score, comment || null, user.id, videoId],
              function (err) {
                if (err) {
                  resolve(c.json({ error: "Database error" }, 500));
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
                  resolve(c.json({ error: "Database error" }, 500));
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
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default scores;
