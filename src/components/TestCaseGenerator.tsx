import { useState } from 'react'
import { Alert, Button, Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, TextField } from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded'
import { downloadCasesAsXlsx } from '../xlsx'
import type { GeneratedTestCase } from '../types'

type TestCaseGeneratorProps = { context: string }

const testTypes = ['End to end', 'Functional', 'Integration', 'Regression', 'Smoke', 'Performance', 'Security', 'Usability', 'Accessibility', 'Compatibility']

function isGeneratedTestCase(value: unknown): value is GeneratedTestCase {
  if (!value || typeof value !== 'object' || !('title' in value) || typeof value.title !== 'string'
    || !('section' in value) || typeof value.section !== 'string' || !('steps' in value) || !Array.isArray(value.steps)) return false
  return value.steps.every((step) => !!step && typeof step === 'object'
    && 'step' in step && typeof step.step === 'string'
    && 'expectedResult' in step && typeof step.expectedResult === 'string')
}

function getApiError(result: unknown, fallback: string) {
  return result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
    ? result.error
    : fallback
}

export function TestCaseGenerator({ context }: TestCaseGeneratorProps) {
  const [section, setSection] = useState('')
  const [testType, setTestType] = useState('Functional')
  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([])
  const [selectedCases, setSelectedCases] = useState<number[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!context.trim() || !section.trim()) {
      setError('Add project context and a test section to generate test cases.')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const response = await fetch('/api/generate-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, section, testType }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getApiError(result, 'Could not generate test cases. Please try again.'))
      if (!result || typeof result !== 'object' || !('cases' in result) || !Array.isArray(result.cases)) {
        throw new Error('The server returned an invalid test case response.')
      }
      const cases = result.cases.filter(isGeneratedTestCase)
      if (!cases.length) throw new Error('No valid test cases were returned. Please try again.')
      setGeneratedCases(cases)
      setSelectedCases(cases.map((_, index) => index))
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Could not generate test cases. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelection = (index: number) => {
    setSelectedCases((selected) => selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index])
  }

  const toggleAll = () => {
    setSelectedCases(selectedCases.length === generatedCases.length ? [] : generatedCases.map((_, index) => index))
  }

  const downloadSelected = () => {
    downloadCasesAsXlsx(generatedCases.filter((_, index) => selectedCases.includes(index)))
  }

  return (
    <Paper component="section" elevation={0} className="case-generator-card">
      <div className="case-generator-heading">
        <div className="panel-title">
          <span className="step-index case-index"><PlaylistAddCheckRoundedIcon fontSize="small" /></span>
          <div><h2>Test case generator</h2><p>Generate a set of cases for a section, then choose which ones to export.</p></div>
        </div>
        {generatedCases.length > 0 && <Button className="download-button" variant="contained" onClick={downloadSelected} disabled={!selectedCases.length} startIcon={<DownloadRoundedIcon />}>
          Download XLSX ({selectedCases.length})
        </Button>}
      </div>

      <div className="case-generator-controls">
        <TextField
          label="Test section"
          value={section}
          onChange={(event) => setSection(event.target.value)}
          placeholder="e.g. Account registration"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <FormControl className="case-type-control">
          <InputLabel id="case-type-label">Test type</InputLabel>
          <Select labelId="case-type-label" label="Test type" value={testType} onChange={(event) => setTestType(event.target.value)}>
            {testTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </Select>
        </FormControl>
        <Button className="generate-button case-generate-button" variant="contained" onClick={generate} disabled={generating} startIcon={<AutoAwesomeRoundedIcon />}>
          {generating ? 'Generating...' : 'Generate test cases'}
        </Button>
      </div>

      {error && <Alert severity="warning" className="form-alert">{error}</Alert>}
      {generatedCases.length ? (
        <div className="generated-cases">
          <div className="case-selection-toolbar">
            <span>{selectedCases.length} of {generatedCases.length} selected</span>
            <Button onClick={toggleAll}>{selectedCases.length === generatedCases.length ? 'Clear selection' : 'Select all'}</Button>
          </div>
          {generatedCases.map((testCase, index) => (
            <article className={`generated-case${selectedCases.includes(index) ? ' is-selected' : ''}`} key={`${index}-${testCase.title}`}>
              <FormControlLabel
                className="case-select-control"
                control={<Checkbox checked={selectedCases.includes(index)} onChange={() => toggleSelection(index)} />}
                label={<span className="generated-case-title">{testCase.title}</span>}
              />
              <Chip className="section-chip" label={testCase.section} size="small" />
              <ol className="case-preview-steps">
                {testCase.steps.map((step, stepIndex) => <li key={`${stepIndex}-${step.step}`}>
                  <span>{step.step}</span><small>Expected: {step.expectedResult}</small>
                </li>)}
              </ol>
            </article>
          ))}
        </div>
      ) : (
        <div className="case-generator-empty">
          <span className="empty-glyph"><FactCheckOutlinedIcon /></span>
          <p>Generated cases will appear here.</p>
          <span>Choose a test section and test type to get started.</span>
        </div>
      )}
    </Paper>
  )
}
