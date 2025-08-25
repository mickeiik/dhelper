import { ErrorBoundary } from './components/ErrorBoundary'
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

function AppContent() {
  const location = useLocation()
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/template':
        return 'Template'
      case '/workflow':
        return 'Workflow'
      default:
        return 'Workflow'
    }
  }

  return (
    <div className='overflow-hidden h-dvh flex flex-col'>
      <SidebarProvider className="flex-1 min-h-0">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-h-0">
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
                      {getPageTitle()}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {/* <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                  </BreadcrumbItem> */}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <main className="flex-1 flex flex-col p-4 pt-0 min-h-0">
            <Routes>
              {/* <Route path="/" element={<WorkflowPage />} />
              <Route path="/workflow" element={<WorkflowPage />} /> */}
              <Route path="/" element={<p>Test</p>} />
            </Routes>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App