import { useEffect, useState } from 'react'
import { getBookings, getEventTypes } from '../api/api'
import { format, isSameDay } from 'date-fns'

export default function Dashboard() {
  const [stats, setStats] = useState({ upcoming: 0, today: 0, eventTypes: 0 })
  const [todayMeetings, setTodayMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [upRes, etRes] = await Promise.all([
          getBookings('UPCOMING'),
          getEventTypes(),
        ])

        const now = new Date()
        const meetingsToday = upRes.data.filter(b => isSameDay(new Date(b.startTime), now))

        setStats({
          upcoming: upRes.data.length,
          today: meetingsToday.length,
          eventTypes: etRes.data.length,
        })
        setTodayMeetings(meetingsToday)
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
          <p>Welcome back, Dheeraj</p>
        </div>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon"> <i className="fa-regular fa-clock"></i></div>
          <div className="stat-label">Today's Meetings</div>
          <div className="stat-value">{stats.today}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-regular fa-calendar"></i></div>
          <div className="stat-label">Upcoming Bookings</div>
          <div className="stat-value">{stats.upcoming}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon"><i className="fa-solid fa-link"></i></div>
          <div className="stat-label">Event Types</div>
          <div className="stat-value">{stats.eventTypes}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Meetings Today</h2>
        {todayMeetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-regular fa-calendar"></i></div>
            <h3>No meetings scheduled for today</h3>
            <p>You're all clear! Share your booking link to fill your schedule.</p>
          </div>
        ) : (
          <div className="grid-list">
            {todayMeetings.map((b) => (
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
                <span className="badge badge-grey">Today</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
