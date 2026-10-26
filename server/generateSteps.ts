export type GeneratedStep = { step: string; expectedResult: string }
export type GeneratedTestCase = { title: string; section: string; steps: GeneratedStep[] }

type GroqError = { message?: unknown; code?: unknown; type?: unknown }
type GroqResponse<T> = {
  choices?: { message?: { content?: string | null; refusal?: string | null } }[]
  error?: GroqError
}
type GroqStep = { step: string; expected_result?: string; expectedResult?: string }

class GroqApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
    this.name = 'GroqApiError'
  }
}

async function generateJson<T>(systemPrompt: string, userPrompt: string, schema: object): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    const error = new Error('Set GROQ_API_KEY in your environment variables to enable generation.')
    error.name = 'MissingApiKeyError'
    throw error
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: `${systemPrompt}\nReturn only a valid JSON object matching this structure. Include every listed key exactly as written:\n${JSON.stringify(schema)}` },
        { role: 'user', content: userPrompt },
      ],
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
    }),
  })

  const result = await response.json() as GroqResponse<T>
  if (!response.ok) {
    const message = typeof result.error?.message === 'string' ? result.error.message : 'Groq request failed.'
    const code = typeof result.error?.code === 'string' ? result.error.code : undefined
    throw new GroqApiError(message, response.status, code)
  }

  const choice = result.choices?.[0]?.message
  if (choice?.refusal) throw new Error('Groq could not generate this content. Please revise the project context or request.')
  if (!choice?.content) throw new Error('Groq returned an empty response.')
  return JSON.parse(choice.content) as T
}

const stepSchema = {
  type: 'object',
  properties: {
    step: { type: 'string' },
    expected_result: { type: 'string' },
  },
  required: ['step', 'expected_result'],
  additionalProperties: false,
}

export async function generateSteps(context: string, title: string): Promise<GeneratedStep[]> {
  const result = await generateJson<{ steps: GroqStep[] }>(
    'You write precise, actionable software test procedures based on the supplied project context and test case title.',
    `Project context:\n${context.trim()}\n\nTest case title:\n${title.trim()}\n\nWrite 3 to 5 short, actionable, ordered test steps. Every step must include both a distinct action and an observable expected result. Use the exact JSON keys “step” and “expected_result” for each item. Use only details supported by the context; state an assumption only when needed. Return no extra explanation.`,
    {
      type: 'object',
      properties: { steps: { type: 'array', items: stepSchema } },
      required: ['steps'],
      additionalProperties: false,
    },
  )

  if (!result || !Array.isArray(result.steps)) throw new Error('Groq did not return a valid steps array.')
  const steps = result.steps.filter(isGroqStep).map(toGeneratedStep)
  if (!steps.length) throw new Error('Groq did not return any valid test steps.')
  return steps
}

export async function generateTestCases(context: string, section: string, testType: string, count: number): Promise<GeneratedTestCase[]> {
  const result = await generateJson<{ cases: { title: string; steps: GroqStep[] }[] }>(
    'You create concise, non-duplicative software test cases with clear actions and verifiable expected results.',
    `Project context:\n${context.trim()}\n\nTest section: ${section.trim()}\nTest type: ${testType.trim()}\n\nGenerate exactly ${count} distinct ${testType.trim()} test cases for this section. Each case must have a concise title and exactly 3 short, ordered steps. Every step must include the exact keys “step” and “expected_result”, with one action and its distinct, observable expected result. Keep every field concise. Cover meaningfully different behaviors relevant to this test type; use only details supported by the context.`,
    {
      type: 'object',
      properties: {
        cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, steps: { type: 'array', items: stepSchema } },
            required: ['title', 'steps'],
            additionalProperties: false,
          },
        },
      },
      required: ['cases'],
      additionalProperties: false,
    },
  )

  if (!result || !Array.isArray(result.cases)) throw new Error('Groq did not return a valid test cases array.')
  const cases = result.cases.flatMap((item): GeneratedTestCase[] => {
    if (!item || typeof item.title !== 'string' || !item.title.trim() || !Array.isArray(item.steps)) return []
    const steps = item.steps.filter(isGroqStep).map(toGeneratedStep)
    return steps.length === 3 ? [{ title: item.title.trim(), section: section.trim(), steps }] : []
  })
  if (cases.length !== count) throw new Error(`Groq did not return ${count} valid test cases with exactly 3 steps each.`)
  return cases
}

function isGroqStep(value: unknown): value is GroqStep {
  if (!value || typeof value !== 'object' || !('step' in value) || typeof value.step !== 'string' || !value.step.trim()) return false
  const expectedResult = 'expected_result' in value ? value.expected_result : undefined
  const camelExpectedResult = 'expectedResult' in value ? value.expectedResult : undefined
  return (typeof expectedResult === 'string' && !!expectedResult.trim())
    || (typeof camelExpectedResult === 'string' && !!camelExpectedResult.trim())
}

function toGeneratedStep(step: GroqStep): GeneratedStep {
  return { step: step.step.trim(), expectedResult: (step.expected_result ?? step.expectedResult ?? '').trim() }
}

export function describeGroqError(error: unknown): { status: number; message: string } {
  if (!(error instanceof GroqApiError)) {
    return { status: 500, message: error instanceof Error ? error.message : 'Could not generate test content. Please try again.' }
  }

  if (error.status === 401 || error.status === 403) {
    return { status: 502, message: 'Groq rejected the API key or access to the selected model. Check GROQ_API_KEY and your Groq account access.' }
  }
  if (error.status === 429) {
    return { status: 429, message: 'Groq rate limit reached. Wait a little and try again, or check your Groq account limits.' }
  }
  if (error.status === 404) {
    return { status: 502, message: 'The configured Groq model was not found. Check GROQ_MODEL.' }
  }
  return { status: 502, message: `Groq request failed (${error.status}): ${error.message}` }
}
