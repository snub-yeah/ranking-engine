import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { cors } from "hono/cors";
import users from "./routes/users.js";
import playlists from "./routes/playlists.js";
import videos from "./routes/videos.js";
import scores from "./routes/scores.js";

const app = new Hono();

app.use("/api/*", cors({
  origin: process.env.FRONT_END || "http://localhost:5173",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const jwtMiddleware = jwt({
  secret: process.env.JWT_SECRET || "fallback-secret",
});

app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  if (path.endsWith("/login") || path.endsWith("/add")) {
    return next();
  }
  return jwtMiddleware(c, next);
});

app.route("/api/users", users);

app.route("/api/playlists", playlists);

app.route("/api/videos", videos);

app.route("/api/scores", scores);

app.get("/", (c) => {
  return c.text("Why are you here?");
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
