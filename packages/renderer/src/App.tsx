import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTheme } from './contexts/ThemeContext'
import WorkflowPage from './pages/workflows/Workflows.page'

function App() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows')
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <ErrorBoundary>
      <div>
        <header>
          <div>
            <div>
              <div>
                <div>
                  <span>D</span>
                </div>
                <h1>{t('app.title')}</h1>
              </div>
              
              <div>
                <select 
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                >
                  <option value="en">{t('language.english')}</option>
                  <option value="es">{t('language.spanish')}</option>
                  <option value="fr">{t('language.french')}</option>
                </select>
                
                <button
                  onClick={toggleTheme}
                  title={t('theme.toggle')}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav>
          <div>
            <button 
              className={` ${
                activeTab === 'workflows' 
                  ? '' 
                  : ''
              }`}
              onClick={() => setActiveTab('workflows')}
            >
              <span>
                🚀 {t('navigation.workflows')}
              </span>
            </button>
          </div>
        </nav>
        
        <main>
          <div>
            {activeTab === 'workflows' && <WorkflowPage />}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App