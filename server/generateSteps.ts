import { GoogleGenAI, Type } from '@google/genai'

export type GeneratedStep = { step: string; expectedResult: string }
export type GeneratedTestCase = { title: string; section: string; steps: GeneratedStep[] }

export async function generateSteps(context: string, title: string): Promise<GeneratedStep[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error('Set GEMINI_API_KEY in your environment variables to enable generation.')
    error.name = 'MissingApiKeyError'
    throw error
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    contents: `Project context:\n${context.trim()}\n\nTest case title:\n${title.trim()}\n\nWrite 3 to 5 short, actionable, ordered test steps. For each step, include a distinct expected result that can be observed or verified. Use only details supported by the context; state an assumption only when needed. Return no extra explanation.`,
    config: {
      systemInstruction: 'You write precise, actionable software test procedures based on the supplied project context and test case title.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                expectedResult: { type: Type.STRING },
              },
              required: ['step', 'expectedResult'],
            },
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

  const steps = parsed.steps.filter((step): step is GeneratedStep =>
    !!step && typeof step === 'object' && 'step' in step && typeof step.step === 'string' && step.step.trim().length > 0
      && 'expectedResult' in step && typeof step.expectedResult === 'string' && step.expectedResult.trim().length > 0,
  )
  if (steps.length === 0) throw new Error('The model did not return any test steps.')

  return steps
}

export async function generateTestCases(context: string, section: string, testType: string, count: number): Promise<GeneratedTestCase[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error('Set GEMINI_API_KEY in your environment variables to enable generation.')
    error.name = 'MissingApiKeyError'
    throw error
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
    contents: `Project context:\n${context.trim()}\n\nTest section: ${section.trim()}\nTest type: ${testType.trim()}\n\nGenerate exactly ${count} distinct ${testType.trim()} test cases for this section. Each case needs a concise title and 2 to 5 ordered, actionable steps. Each step must have a distinct, observable expected result. Cover meaningfully different behaviors relevant to this test type; use only details supported by the context.`,
    config: {
      systemInstruction: 'You create concise, non-duplicative software test cases with clear actions and verifiable expected results.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { step: { type: Type.STRING }, expectedResult: { type: Type.STRING } },
                    required: ['step', 'expectedResult'],
                  },
                },
              },
              required: ['title', 'steps'],
            },
          },
        },
        required: ['cases'],
      },
    },
  })

  if (!response.text) throw new Error('The model returned an empty response.')
  const parsed: unknown = JSON.parse(response.text)
  if (!parsed || typeof parsed !== 'object' || !('cases' in parsed) || !Array.isArray(parsed.cases)) {
    throw new Error('The model response did not contain a valid test cases array.')
  }

  const cases = parsed.cases.flatMap((item): GeneratedTestCase[] => {
    if (!item || typeof item !== 'object' || !('title' in item) || typeof item.title !== 'string' || !item.title.trim()
      || !('steps' in item) || !Array.isArray(item.steps)) return []
    const steps = item.steps.filter((step): step is GeneratedStep =>
      !!step && typeof step === 'object' && 'step' in step && typeof step.step === 'string' && !!step.step.trim()
        && 'expectedResult' in step && typeof step.expectedResult === 'string' && !!step.expectedResult.trim(),
    )
    return steps.length ? [{ title: item.title.trim(), section: section.trim(), steps }] : []
  })
  if (!cases.length) throw new Error('The model did not return any valid test cases.')
  return cases
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
