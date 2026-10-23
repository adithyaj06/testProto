import { GoogleGenAI, Type } from '@google/genai'

export async function generateSteps(context: string, title: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error('Set GEMINI_API_KEY in your environment variables to enable generation.')
    error.name = 'MissingApiKeyError'
    throw error
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    contents: `Project context:\n${context.trim()}\n\nTest case title:\n${title.trim()}\n\nCreate 4 to 8 ordered test steps. Use only details supported by the context and make assumptions explicit.`,
    config: {
      systemInstruction: 'You write precise, actionable software test procedures based on the supplied project context and test case title.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['steps'],
      },
    },
  })

  const content = response.text
  if (!content) throw new Error('The model returned an empty response.')

  const parsed: unknown = JSON.parse(content)
  if (!parsed || typeof parsed !== 'object' || !('steps' in parsed) || !Array.isArray(parsed.steps)) {
    throw new Error('The model response did not contain a valid steps array.')
  }

  const steps = parsed.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
  if (steps.length === 0) throw new Error('The model did not return any test steps.')

  return steps
}

export function describeGeminiError(error: unknown): { status: number; message: string } {
  if (!error || typeof error !== 'object') {
    return { status: 500, message: 'Could not generate test steps. Please try again.' }
  }

  const apiError = error as { status?: unknown; message?: unknown; code?: unknown }
  const status = typeof apiError.status === 'number' ? apiError.status : 500
  const details = `${typeof apiError.code === 'string' ? apiError.code : ''} ${typeof apiError.message === 'string' ? apiError.message : ''}`.toLowerCase()

  if (status === 401 || details.includes('api key not valid') || details.includes('api_key_invalid')) {
    return { status: 502, message: 'Gemini rejected the API key. Check GEMINI_API_KEY in the server environment variables.' }
  }

  if (status === 429) {
    return {
      status: 429,
      message: 'Gemini usage limit reached. Check your model’s free-tier quota and rate limits in Google AI Studio, then try again later or select an available model.',
    }
  }

  if (status === 404) {
    return {
      status: 502,
      message: 'The configured Gemini model was not found or is unavailable to this API key. Check GEMINI_MODEL.',
    }
  }

  return { status: status >= 400 && status < 600 ? 502 : 500, message: `Gemini request failed (${status}).` }
}