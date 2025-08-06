import './App.css'
import { WorkflowPage } from './components/WorkflowPage'
import { TemplateManager } from './components/TemplateManager'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useState } from 'react'

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
          <button 
            className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            🖼️ Templates
          </button>
        </nav>
        
        <main className="tab-content">
          {activeTab === 'workflows' && <WorkflowPage />}
          {activeTab === 'templates' && <TemplateManager />}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App