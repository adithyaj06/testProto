import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  IconButton,
  Paper,
  TextField,
  Tooltip,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import './App.css'

function App() {
  const [context, setContext] = useState('')
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState<string[]>([])
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
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error
          : 'Could not generate test steps. Please try again.'
        throw new Error(message)
      }
      if (!result || typeof result !== 'object' || !('steps' in result) || !Array.isArray(result.steps)) {
        throw new Error('The server returned an invalid response.')
      }
      const generatedSteps = result.steps.filter((step): step is string => typeof step === 'string')
      if (generatedSteps.length === 0) throw new Error('No test steps were returned. Please try again.')
      setSteps(generatedSteps)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Could not generate test steps. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const copySteps = async () => {
    await navigator.clipboard.writeText(steps.map((step, index) => `${index + 1}. ${step}`).join('\n'))
    setCopied(true)
  }

  const clearDraft = () => {
    setSteps([])
    setCopied(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Casework home">
          <span className="brand-mark"><FactCheckOutlinedIcon fontSize="small" /></span>
          <span>casework</span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> Test design workspace</div>
      </header>

      <section className="workspace" id="home">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TEST CASE BUILDER <span> / </span> NEW DRAFT</p>
            <h1>Turn context into<br className="heading-break" /> clear test steps.</h1>
            <p className="intro">Give your project a little context. Shape one test, then make its path unmistakable.</p>
          </div>
          <div className="heading-index" aria-hidden="true">01<span>—</span>03</div>
        </div>

        <div className="builder-grid">
          <Paper component="section" elevation={0} className="input-panel">
            <div className="panel-title">
              <span className="step-index">01</span>
              <div><h2>Project context</h2><p>What should the model know about this project?</p></div>
            </div>
            <TextField
              className="context-input"
              multiline
              minRows={8}
              maxRows={14}
              fullWidth
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Describe the product, important workflows, user roles, rules, or anything the test should account for..."
              slotProps={{ htmlInput: { 'aria-label': 'Project context' } }}
            />
            <div className="field-foot"><NotesRoundedIcon fontSize="small" /><span>More detail helps make the draft more relevant.</span><span className="char-count">{context.length}</span></div>
          </Paper>

          <div className="right-column">
            <Paper component="section" elevation={0} className="input-panel title-panel">
              <div className="panel-title">
                <span className="step-index">02</span>
                <div><h2>Test case title</h2><p>What behavior are you testing?</p></div>
              </div>
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
              {error && <Alert severity="warning" className="form-alert">{error}</Alert>}
              <p className="local-note">Generated with OpenAI. Review steps before use.</p>
            </Paper>

            <Paper component="section" elevation={0} className="output-panel">
              <div className="output-heading">
                <div className="panel-title">
                  <span className="step-index output-index">03</span>
                  <div><h2>Test steps</h2><p>Your draft will appear here.</p></div>
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
              {steps.length > 0 ? (
                <>
                  <div className="generated-title"><Chip label="DRAFT" size="small" /> <span>{title}</span></div>
                  <ol className="steps-list">{steps.map((step, index) => <li key={`${index}-${step}`}><span className="list-number">{String(index + 1).padStart(2, '0')}</span><span>{step}</span></li>)}</ol>
                  <div className="draft-footer">{copied ? 'Steps copied to clipboard' : 'Generated with OpenAI · Review before use'}</div>
                </>
              ) : (
                <div className="empty-output">
                  <div className="empty-glyph"><AutoAwesomeRoundedIcon /></div>
                  <p>Steps, in a sensible order.</p>
                  <span>Your generated test procedure will land here.</span>
                </div>
              )}
            </Paper>
          </div>
        </div>

        <footer className="workspace-footer"><span>CASEWORK <span className="footer-separator">/</span> TEST DESIGN</span><span>Drafts stay in this browser session</span></footer>
      </section>
    </main>
  )
}

export default App