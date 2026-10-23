import 'dotenv/config'
import OpenAI from 'openai'
import { createServer } from 'node:http'
import { generateSteps } from './generateSteps.js'

const port = Number(process.env.API_PORT ?? 3001)

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json')

  if (request.method !== 'POST' || request.url !== '/api/generate') {
    response.writeHead(404).end(JSON.stringify({ error: 'Route not found.' }))
    return
  }

  try {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (body.length > 32_000) {
        response.writeHead(413).end(JSON.stringify({ error: 'Request body is too large.' }))
        return
      }
    }

    const input: unknown = JSON.parse(body)
    if (!input || typeof input !== 'object' || !('context' in input) || !('title' in input)) {
      response.writeHead(400).end(JSON.stringify({ error: 'Project context and test case title are required.' }))
      return
    }

    const { context, title } = input as { context: unknown; title: unknown }
    if (typeof context !== 'string' || typeof title !== 'string' || !context.trim() || !title.trim()) {
      response.writeHead(400).end(JSON.stringify({ error: 'Project context and test case title are required.' }))
      return
    }
    if (context.length > 20_000 || title.length > 300) {
      response.writeHead(400).end(JSON.stringify({ error: 'Context or test case title exceeds the allowed length.' }))
      return
    }

    const steps = await generateSteps(context, title)
    response.writeHead(200).end(JSON.stringify({ steps }))
  } catch (error) {
    console.error('Test step generation failed:', error)
    if (error instanceof Error && error.name === 'MissingApiKeyError') {
      response.writeHead(503).end(JSON.stringify({ error: error.message }))
      return
    }

    const message = error instanceof OpenAI.APIError
      ? error.status === 401
        ? 'OpenAI rejected the API key. Check OPENAI_API_KEY.'
        : `OpenAI request failed (${error.status ?? 'unknown status'}).`
      : 'Could not generate test steps. Please try again.'
    response.writeHead(500).end(JSON.stringify({ error: message }))
  }
})

server.listen(port, () => {
  console.log(`Casework API listening on http://localhost:${port}`)
})