import 'dotenv/config'
import { createServer } from 'node:http'
import { describeGeminiError, generateSteps, generateTestCases } from './generateSteps.js'

const port = Number(process.env.API_PORT ?? 3001)

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json')

  if (request.method !== 'POST' || !['/api/generate', '/api/generate-cases'].includes(request.url ?? '')) {
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
    if (!input || typeof input !== 'object' || !('context' in input)) {
      response.writeHead(400).end(JSON.stringify({ error: 'Project context is required.' }))
      return
    }

    const { context } = input as { context: unknown }
    if (typeof context !== 'string' || !context.trim()) {
      response.writeHead(400).end(JSON.stringify({ error: 'Project context is required.' }))
      return
    }
    if (context.length > 20_000) {
      response.writeHead(400).end(JSON.stringify({ error: 'Project context exceeds the allowed length.' }))
      return
    }

    const startedAt = Date.now()
    if (request.url === '/api/generate-cases') {
      const { section, testType } = input as { section?: unknown; testType?: unknown }
      if (typeof section !== 'string' || !section.trim() || section.length > 200 || typeof testType !== 'string' || !testType.trim() || testType.length > 80) {
        response.writeHead(400).end(JSON.stringify({ error: 'Provide a test section and test type.' }))
        return
      }
      const cases = await generateTestCases(context, section, testType, 5)
      console.info(`Gemini generated ${cases.length} test cases in ${Date.now() - startedAt}ms (context ${context.length} chars).`)
      response.writeHead(200).end(JSON.stringify({ cases }))
      return
    }

    const { title } = input as { title?: unknown }
    if (typeof title !== 'string' || !title.trim()) {
      response.writeHead(400).end(JSON.stringify({ error: 'Test case title is required.' }))
      return
    }
    if (title.length > 300) {
      response.writeHead(400).end(JSON.stringify({ error: 'Test case title exceeds the allowed length.' }))
      return
    }
    const steps = await generateSteps(context, title)
    console.info(`Gemini generation completed in ${Date.now() - startedAt}ms (context ${context.length} chars).`)
    response.writeHead(200).end(JSON.stringify({ steps }))
  } catch (error) {
    console.error('Test step generation failed:', error)
    if (error instanceof Error && error.name === 'MissingApiKeyError') {
      response.writeHead(503).end(JSON.stringify({ error: error.message }))
      return
    }

    const result = describeGeminiError(error)
    response.writeHead(result.status).end(JSON.stringify({ error: result.message }))
  }
})

server.listen(port, () => {
  console.log(`Casework API listening on http://localhost:${port}`)
})
