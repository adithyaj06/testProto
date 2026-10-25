import { useState } from 'react'
import { Alert, Button, Chip, IconButton, Paper, TextField, Tooltip } from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded'
import type { GeneratedStep } from '../types'

type TestStepsGeneratorProps = { context: string }

function isGeneratedStep(value: unknown): value is GeneratedStep {
  return !!value && typeof value === 'object'
    && 'step' in value && typeof value.step === 'string'
    && 'expectedResult' in value && typeof value.expectedResult === 'string'
}

function getApiError(result: unknown, fallback: string) {
  return result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
    ? result.error
    : fallback
}

export function TestStepsGenerator({ context }: TestStepsGeneratorProps) {
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState<GeneratedStep[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    if (!context.trim() || !title.trim()) {
      setError('Add project context and a test case title to draft steps.')
      return
    }
    setError('')
    setCopied(false)
    setGenerating(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, title }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getApiError(result, 'Could not generate test steps. Please try again.'))
      if (!result || typeof result !== 'object' || !('steps' in result) || !Array.isArray(result.steps)) {
        throw new Error('The server returned an invalid response.')
      }
      const generatedSteps = result.steps.filter(isGeneratedStep)
      if (!generatedSteps.length) throw new Error('No test steps were returned. Please try again.')
      setSteps(generatedSteps)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Could not generate test steps. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const copySteps = async () => {
    await navigator.clipboard.writeText(steps.map((step, index) => `${index + 1}. ${step.step}\n   Expected result: ${step.expectedResult}`).join('\n'))
    setCopied(true)
  }

  const clearDraft = () => {
    setSteps([])
    setCopied(false)
  }

  return (
    <Paper component="section" elevation={0} className="input-panel test-case-panel">
      <div className="panel-title">
        <span className="step-index"><AssignmentOutlinedIcon fontSize="small" /></span>
        <div><h2>Test case</h2><p>Name the behavior and generate its steps.</p></div>
      </div>
      <div className="step-generation-controls">
        <TextField
          fullWidth
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') generate() }}
          placeholder="e.g. Member resets a forgotten password"
          slotProps={{ htmlInput: { 'aria-label': 'Test case title' } }}
        />
        <Button className="generate-button" variant="contained" onClick={generate} disabled={generating} startIcon={<AutoAwesomeRoundedIcon />}>
          {generating ? 'Generating...' : 'Generate test steps'}
        </Button>
      </div>
      {error && <Alert severity="warning" className="form-alert">{error}</Alert>}
      <p className="local-note">Generated with Gemini. Review steps before use.</p>
      <div className="output-heading">
        <div className="panel-title">
          <span className="step-index output-index"><ChecklistRoundedIcon fontSize="small" /></span>
          <div><h2>Test steps</h2><p>Steps and expected results.</p></div>
        </div>
        {steps.length > 0 && <div className="output-actions">
          <Tooltip title={copied ? 'Copied' : 'Copy steps'}>
            <IconButton aria-label="Copy steps" onClick={copySteps} size="small"><ContentCopyRoundedIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Clear draft">
            <IconButton aria-label="Clear draft" onClick={clearDraft} size="small"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
          </Tooltip>
        </div>}
      </div>
      {steps.length ? (
        <>
          <div className="generated-title"><Chip label="DRAFT" size="small" /></div>
          <ol className="steps-list">{steps.map((step, index) => <li key={`${index}-${step.step}`}>
            <span className="list-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="step-content">
              <strong className="step-label">Action</strong><span>{step.step}</span>
              <strong className="step-label expected-label">Expected result</strong><span className="expected-result">{step.expectedResult}</span>
            </div>
          </li>)}</ol>
          <div className="draft-footer">{copied ? 'Steps copied to clipboard' : 'Generated with Gemini · Review before use'}</div>
        </>
      ) : (
        <div className="empty-output">
          <div className="empty-glyph"><AutoAwesomeRoundedIcon /></div>
          <p>Testcase steps appear here.</p>
          <span>Your generated test procedure will land here.</span>
        </div>
      )}
    </Paper>
  )
}
