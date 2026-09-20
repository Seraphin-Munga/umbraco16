import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header/Header'
import { Footer } from './components/Footer/Footer'
import { KaraboChat } from './components/KaraboChat/KaraboChat'
import { Home } from './components/Home/Home'
import { DynamicPage } from './pages/DynamicPage/DynamicPage'
import { GetAQuote } from './pages/GetAQuote/GetAQuote'

// Every Umbraco page except Home renders through the DynamicPage catch-all -
// no per-page route/component to add here as new content gets created. It
// fetches by the current URL (see DynamicPage.tsx) and renders whatever
// "sections" Block List content comes back, so a brand-new page just needs
// to be published in Umbraco to work - nothing to change in this file.
//
// "/en/home/get-a-quote" is the one exception: static, hardcoded product-
// picker content (see GetAQuote.tsx) rather than CMS-authored, so it's
// special-cased ahead of the catch-all the same way "/en/home/" is.
function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main style={{ width: '100%', height: '100%' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/en/home/" replace />} />
            <Route path="/en/home/" element={<Home />} />
            <Route path="/en/home/get-a-quote" element={<GetAQuote />} />
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
