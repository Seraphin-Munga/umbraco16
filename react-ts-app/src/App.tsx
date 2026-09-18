import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header/Header'
import { Footer } from './components/Footer/Footer'
import { KaraboChat } from './components/KaraboChat/KaraboChat'
import { Home } from './components/Home/Home'
import { DynamicPage } from './pages/DynamicPage/DynamicPage'
import { PERSONAL_MENU_PAGES } from './routes/personalMenuPages'
import { PERSONAL_MENU_PAGE_COMPONENTS } from './routes/personalMenuPageComponents'

// The catch-all route (DynamicPage) only ever runs for a path that doesn't
// match anything above it - React Router always prefers a more specific
// route over "*" regardless of declaration order, so every existing
// PERSONAL_MENU_PAGES route keeps working exactly as before. A brand-new
// Umbraco page an editor creates without a matching entry here falls
// through to DynamicPage, which renders it automatically as long as it's
// built the same way (a "sections" Block List - see that file's own
// comment) - no new route/component/deploy needed for that case.
function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main style={{ width: '100%', height: '100%' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/en/home/" replace />} />
            <Route path="/en/home/" element={<Home />} />
            {PERSONAL_MENU_PAGES.map((page) => {
              const PageComponent = PERSONAL_MENU_PAGE_COMPONENTS[page.path]
              return <Route key={page.path} path={page.path} element={<PageComponent />} />
            })}
            <Route path="*" element={<DynamicPage />} />
          </Routes>
        </main>
        <Footer />
        <KaraboChat />
      </div>
    </BrowserRouter>
  )
}

export default App
