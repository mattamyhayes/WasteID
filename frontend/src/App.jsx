import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NewDetermination from './pages/NewDetermination'
import DeterminationResults from './pages/DeterminationResults'
import History from './pages/History'
import Customers from './pages/Customers'
import AddCustomer from './pages/AddCustomer'
import Shippers from './pages/Shippers'
import EPAForm from './pages/EPAForm'

export default function App() {
  return (
    <BrowserRouter basename="/WasteID">
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 60px)', background: '#f5f7f5' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/determine" element={<NewDetermination />} />
          <Route path="/results/:id" element={<DeterminationResults />} />
          <Route path="/history" element={<History />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/shippers" element={<Shippers />} />
          <Route path="/epa-form" element={<EPAForm />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
