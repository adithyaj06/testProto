import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, TextField } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'

type ProjectContextDialogProps = {
  open: boolean
  context: string
  onContextChange: (context: string) => void
  onClose: () => void
}

export function ProjectContextDialog({ open, context, onContextChange, onClose }: ProjectContextDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="project-dialog-title">
        <div className="context-dialog-heading">
          <span className="context-dialog-kicker">PROJECT SETUP</span>
          <h2>Project context</h2>
          <p>Give the generators the background they need to create relevant test cases and steps.</p>
        </div>
        <IconButton className="context-dialog-close" aria-label="Close project context" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="context-dialog-content">
        <Paper component="section" elevation={0} className="input-panel project-context-panel">
          <TextField
            className="context-input"
            multiline
            minRows={8}
            maxRows={14}
            fullWidth
            value={context}
            onChange={(event) => onContextChange(event.target.value)}
            placeholder="Describe the product, users, key workflows, business rules, and important edge cases..."
            slotProps={{ htmlInput: { 'aria-label': 'Project context' } }}
          />
          <div className="context-field-footer">
            <span className="context-field-hint"><NotesRoundedIcon fontSize="small" />Used to guide both generators</span>
            <span className="char-count">{context.length.toLocaleString()} characters</span>
          </div>
        </Paper>
      </DialogContent>
      <DialogActions className="project-dialog-actions">
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}
