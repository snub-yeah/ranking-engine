import { Hono } from "hono";
import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./src/app.db");

const scores = new Hono();

export default scores;
