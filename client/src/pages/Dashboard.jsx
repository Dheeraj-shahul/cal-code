import { useEffect, useState } from 'react'
import { getBookings, getEventTypes } from '../api/api'
import { format } from 'date-fns'

export default function Dashboard() {
  const [stats, setStats] = useState({ upcoming: 0, past: 0, eventTypes: 0 })
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [upRes, pastRes, etRes] = await Promise.all([
          getBookings('UPCOMING'),
          getBookings('PAST'),
          getEventTypes(),
        ])
        setStats({
          upcoming: upRes.data.length,
          past: pastRes.data.length,
          eventTypes: etRes.data.length,
        })
        setUpcoming(upRes.data.slice(0, 5))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="spinner">Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, Alex 👋</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-label">Upcoming Bookings</div>
          <div className="stat-value">{stats.upcoming}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-label">Past Meetings</div>
          <div className="stat-value">{stats.past}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div className="stat-label">Event Types</div>
          <div className="stat-value">{stats.eventTypes}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Upcoming Meetings</h2>
        {upcoming.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No upcoming meetings</h3>
            <p>Share your booking link to get started</p>
          </div>
        ) : (
          <div className="grid-list">
            {upcoming.map((b) => (
              <div className="booking-item" key={b.id}>
                <div className="booking-item-left">
                  <div className="booking-time-block">
                    <div className="bday">{format(new Date(b.startTime), 'd')}</div>
                    <div className="bmon">{format(new Date(b.startTime), 'MMM')}</div>
                  </div>
                  <div className="booking-info">
                    <h4>{b.bookerName}</h4>
                    <p>{b.eventType.title} · {format(new Date(b.startTime), 'h:mm a')}</p>
                  </div>
                </div>
                <span className="badge badge-green">Upcoming</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
