import './App.css'
import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import WorkflowPage from './pages/workflows/Workflows.page'

function App() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows')

  return (
    <ErrorBoundary>
      <div className="app">
        <nav className="tab-navigation">
          <button 
            className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            🚀 Workflows
          </button>
        </nav>
        
        <main className="tab-content">
          {activeTab === 'workflows' && <WorkflowPage />}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App