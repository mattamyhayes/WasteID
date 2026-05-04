import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NewDetermination from './pages/NewDetermination'
import DeterminationResults from './pages/DeterminationResults'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f7f5' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/determine" element={<NewDetermination />} />
          <Route path="/results/:id" element={<DeterminationResults />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
