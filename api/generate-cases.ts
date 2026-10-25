import type { VercelRequest, VercelResponse } from '@vercel/node'
import { describeGeminiError, generateTestCases } from '../server/generateSteps.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  const body: unknown = request.body
  if (!body || typeof body !== 'object' || !('context' in body) || !('section' in body) || !('testType' in body)) {
    return response.status(400).json({ error: 'Project context, test section, and test type are required.' })
  }
  const { context, section, testType } = body as { context: unknown; section: unknown; testType: unknown }
  if (typeof context !== 'string' || !context.trim() || context.length > 20_000) {
    return response.status(400).json({ error: 'Project context is required and must be no longer than 20,000 characters.' })
  }
  if (typeof section !== 'string' || !section.trim() || section.length > 200 || typeof testType !== 'string' || !testType.trim() || testType.length > 80) {
    return response.status(400).json({ error: 'Provide a test section and test type.' })
  }

  try {
    const startedAt = Date.now()
    const cases = await generateTestCases(context, section, testType, 5)
    console.info(`Gemini generated ${cases.length} test cases in ${Date.now() - startedAt}ms (context ${context.length} chars).`)
    return response.status(200).json({ cases })
  } catch (error) {
    console.error('Test case generation failed:', error)
    if (error instanceof Error && error.name === 'MissingApiKeyError') {
      return response.status(503).json({ error: error.message })
    }
    const result = describeGeminiError(error)
    return response.status(result.status).json({ error: result.message })
  }
}
