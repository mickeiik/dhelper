import { ErrorBoundary } from './components/ErrorBoundary'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import WorkflowPage from './pages/workflows/Workflows.page'
// import { useTranslation } from 'react-i18next'

function App() {

  // const changeLanguage = (lng: string) => {
  //   i18n.changeLanguage(lng)
  // }

  return (
    <ErrorBoundary>
      {/* <div>
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
      </div> */}
      <div>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        Building Your Application
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <main className="flex p-4 pt-0">
              <WorkflowPage />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ErrorBoundary>
  )
}

export default App