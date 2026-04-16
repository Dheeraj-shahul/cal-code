import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import EventTypes from './pages/EventTypes'
import Availability from './pages/Availability'
import Bookings from './pages/Bookings'
import BookingPage from './pages/BookingPage'
import Confirmation from './pages/Confirmation'
import PublicProfile from './pages/PublicProfile'
import ReschedulePage from './pages/ReschedulePage'

import { useState } from 'react'

function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile Sticky Header */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="mobile-header-user">
           <div className="sidebar-avatar" style={{width: 20, height: 20, fontSize: 9}}>DS</div>
           <span>Dheeraj Shahaul Syed</span>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
        <Route path="/dheeraj-shahaul-syed" element={<PublicProfile />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/book/:slug/confirmation" element={<Confirmation />} />
        <Route path="/reschedule/:id" element={<ReschedulePage />} />
      </Routes>
    </BrowserRouter>
  )
}
