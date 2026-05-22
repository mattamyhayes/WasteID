import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import NewDetermination from './pages/NewDetermination'
import DeterminationResults from './pages/DeterminationResults'
import History from './pages/History'
import Customers from './pages/Customers'
import AddCustomer from './pages/AddCustomer'
import Shippers from './pages/Shippers'
import EPAForm from './pages/EPAForm'
import Orders from './pages/Orders'
import ComingSoon from './pages/ComingSoon'
import Review from './pages/Review'
import ReviewSignOff from './pages/ReviewSignOff'
import Journey from './pages/Journey'
import Shipping from './pages/Shipping'
import Admin from './pages/Admin'
import Reports from './pages/Reports'
import Marketplace from './pages/Marketplace'
import Incinerators from './pages/Incinerators'

export default function App() {
  return (
    <BrowserRouter basename="/WasteID">
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - var(--navbar-height) - 60px)', background: '#f5f7f5' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/determine" element={<NewDetermination />} />
          <Route path="/results/:id" element={<DeterminationResults />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/review" element={<Review />} />
          <Route path="/review/:id/signoff" element={<ReviewSignOff />} />
          <Route path="/generators" element={<Customers />} />
          <Route path="/generators/new" element={<AddCustomer />} />
          <Route path="/generators/edit/:id" element={<AddCustomer />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/shippers" element={<Shippers />} />
          <Route path="/epa-form" element={<EPAForm />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/scheduling" element={<ComingSoon title="Scheduling" />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/incinerators" element={<Incinerators />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
