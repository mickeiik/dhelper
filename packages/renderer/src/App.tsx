import './App.css'
import WorkflowPage from './Workflow.page'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <WorkflowPage />
    </ErrorBoundary>
  )
}

export default App