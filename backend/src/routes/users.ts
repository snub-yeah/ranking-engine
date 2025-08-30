import { Hono } from "hono";
import sqlite3 from "sqlite3";
import bcrypt from 'bcrypt';
import type {User} from "../types.js";

const db = new sqlite3.Database('./src/app.db');

const users = new Hono();

users.post('login', async (c) => {
    try {
        const {username, password} = await c.req.json<{
            username: string
            password: string
        }>()

        if (!username || !password) {
            return c.json({ success: false, error: 'Username and password are required' }, 400)
        }

        return new Promise((resolve) => {
            db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, row: User) => {
                if (err) {
                    resolve(c.json({ success: false, error: 'Database error', details: err.message }, 500))
                    return
                }

                if (!row) {
                    resolve(c.json({ success: false, error: 'Invalid username or password' }, 401))
                    return
                }

                const isMatch = await bcrypt.compare(password, row.password)
                if (isMatch) {
                    resolve(c.json({ success: true, user: row }))
                } else {
                    resolve(c.json({ success: false, error: 'Invalid username or password' }, 401))
                }
            })
        })
    } catch (error) {}
})

users.post('/add', async (c) => {
    // change to true to enable adding new users.
    if (true) {
        try {
            const {username, password} = await c.req.json<{
                username: string
                password: string
            }>()

            if (!username || !password) {
                return c.json({error: 'Username and password are required'}, 400)
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            return new Promise((resolve) => {
                db.run('INSERT INTO users (username, password) VALUES (?, ?)',
                    [username, hashedPassword], function (err) {})
            })


        } catch (error) {
            console.error(error);
            return c.json({error: 'Internal Server Error'}, 500);
        }
    }
})

export default users;