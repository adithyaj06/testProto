import { useState } from 'react'
import { Button } from '@mui/material'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import { ProjectContextDialog } from './components/ProjectContextDialog'
import { TestCaseGenerator } from './components/TestCaseGenerator'
import { TestStepsGenerator } from './components/TestStepsGenerator'
import './App.css'

function App() {
  const [context, setContext] = useState('')
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Casework home">
          <span className="brand-mark"><FactCheckOutlinedIcon fontSize="small" /></span>
          <span>TestProto</span>
        </a>
        <Button className="create-project-button" variant="outlined" onClick={() => setProjectDialogOpen(true)}>
          Project
        </Button>
      </header>

      <ProjectContextDialog
        open={projectDialogOpen}
        context={context}
        onContextChange={setContext}
        onClose={() => setProjectDialogOpen(false)}
      />

      <section className="workspace" id="home">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TEST CASE BUILDER <span> / </span> NEW DRAFT</p>
            <h1>Turn context into<br className="heading-break" /> Testcases.</h1>
            <p className="intro">Give your project a little context. Shape one test, then make its path unmistakable.</p>
          </div>
        </div>

        <div className="builder-grid">
          <TestCaseGenerator context={context} />
          <TestStepsGenerator context={context} />
        </div>

        <footer className="workspace-footer">
          <span>CASEWORK <span className="footer-separator">/</span> TEST DESIGN</span>
          <span>Drafts stay in this browser session</span>
        </footer>
      </section>
    </main>
  )
}

export default App
