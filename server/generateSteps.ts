import OpenAI from 'openai'

export async function generateSteps(context: string, title: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const error = new Error('Set OPENAI_API_KEY in your environment variables to enable generation.')
    error.name = 'MissingApiKeyError'
    throw error
  }

  const openai = new OpenAI({ apiKey })
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You write precise, actionable software test procedures. Return a JSON object with a "steps" property containing an array of concise, ordered strings. Use the project context to make steps specific. Do not invent UI details that are not supported by the context; make assumptions explicit when necessary.',
      },
      {
        role: 'user',
        content: `Project context:\n${context.trim()}\n\nTest case title:\n${title.trim()}\n\nReturn 4 to 8 ordered test steps.`,
      },
    ],
  })

  const content = completion.choices[0]?.message.content
  if (!content) throw new Error('The model returned an empty response.')

  const parsed: unknown = JSON.parse(content)
  if (!parsed || typeof parsed !== 'object' || !('steps' in parsed) || !Array.isArray(parsed.steps)) {
    throw new Error('The model response did not contain a valid steps array.')
  }

  const steps = parsed.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
  if (steps.length === 0) throw new Error('The model did not return any test steps.')

  return steps
}
