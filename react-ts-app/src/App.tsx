import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header/Header'
import { Footer } from './components/Footer/Footer'
import { Home } from './components/Home/Home'
import { PERSONAL_MENU_PAGES } from './routes/personalMenuPages'
import { PERSONAL_MENU_PAGE_COMPONENTS } from './routes/personalMenuPageComponents'

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
            <Route path="*" element={<Navigate to="/en/home/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
