import { Header } from './components/Header/Header'
import { Footer } from './components/Footer/Footer'
import { Home } from './components/Home/Home'

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main style={{ width: '100%', height: '100%' }}>
        <Home />
      </main>
      <Footer />
    </div>
  )
}

export default App
