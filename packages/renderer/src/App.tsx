import './App.css'
import { WorkflowPage } from './components/WorkflowPage'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <WorkflowPage />
    </ErrorBoundary>
  )
}

export default App