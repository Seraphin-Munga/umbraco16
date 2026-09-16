import { Header } from './components/Header/Header'
import { Footer } from './components/Footer/Footer'

function App() {
  return (
    <div className="app-shell">
      <Header />
      {/* Placeholder for page content - MasterNew.cshtml's @RenderBody() */}
      <main className="app-main" />
      <Footer />
    </div>
  )
}

export default App
