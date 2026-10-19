import handler from '../api/chat.js'

// Run the same server-side endpoint during local Vite development.
export default function chatApi() {
  return {
    name: 'sarvam-chat-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/chat') return next()

        // Keep Node's native streaming and connection lifecycle methods.
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (body) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }

        try {
          if (req.method === 'POST') {
            req.setEncoding('utf8')
            let body = ''
            for await (const chunk of req) body += chunk
            try {
              req.body = JSON.parse(body)
            } catch {
              return res.status(400).json({ error: 'Invalid JSON body' })
            }
          }
          await handler(req, res)
        } catch (error) {
          if (res.headersSent) res.end()
          else next(error)
        }
      })
    },
  }
}
