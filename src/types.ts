export type GeneratedStep = {
  step: string
  expectedResult: string
}

export type GeneratedTestCase = {
  title: string
  section: string
  steps: GeneratedStep[]
}
