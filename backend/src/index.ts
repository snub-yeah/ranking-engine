import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import users from './routes/users.ts'

const app = new Hono()

app.route('/api/users', users)

app.get('/', (c) => {
  return c.text('Why are you here?')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
