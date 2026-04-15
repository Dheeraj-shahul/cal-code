import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import EventTypes from './pages/EventTypes'
import Availability from './pages/Availability'
import Bookings from './pages/Bookings'
import BookingPage from './pages/BookingPage'
import Confirmation from './pages/Confirmation'
import PublicProfile from './pages/PublicProfile'

function AdminLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/event-types" element={<AdminLayout><EventTypes /></AdminLayout>} />
        <Route path="/availability" element={<AdminLayout><Availability /></AdminLayout>} />
        <Route path="/bookings" element={<AdminLayout><Bookings /></AdminLayout>} />

        {/* Public Routes */}
        <Route path="/alex-johnson" element={<PublicProfile />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/book/:slug/confirmation" element={<Confirmation />} />
      </Routes>
    </BrowserRouter>
  )
}
