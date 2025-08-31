import { Hono } from "hono";
import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./src/app.db");

const scores = new Hono();

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
