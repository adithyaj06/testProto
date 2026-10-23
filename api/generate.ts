import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { generateSteps } from '../server/generateSteps.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const body: unknown = request.body
  if (!body || typeof body !== 'object' || !('context' in body) || !('title' in body)) {
    return response.status(400).json({ error: 'Project context and test case title are required.' })
  }

  const { context, title } = body as { context: unknown; title: unknown }
  if (typeof context !== 'string' || typeof title !== 'string' || !context.trim() || !title.trim()) {
    return response.status(400).json({ error: 'Project context and test case title are required.' })
  }
  if (context.length > 20_000 || title.length > 300) {
    return response.status(400).json({ error: 'Context or test case title exceeds the allowed length.' })
  }

  try {
    const steps = await generateSteps(context, title)
    return response.status(200).json({ steps })
  } catch (error) {
    console.error('Test step generation failed:', error)

    if (error instanceof Error && error.name === 'MissingApiKeyError') {
      return response.status(503).json({ error: error.message })
    }

    const message = error instanceof OpenAI.APIError
      ? error.status === 401
        ? 'OpenAI rejected the API key. Check OPENAI_API_KEY in the deployment environment variables.'
        : `OpenAI request failed (${error.status ?? 'unknown status'}).`
      : 'Could not generate test steps. Please try again.'
    return response.status(500).json({ error: message })
  }
}
