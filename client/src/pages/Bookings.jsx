import { useEffect, useState } from 'react'
import { getBookings, cancelBooking } from '../api/api'
import { format } from 'date-fns'

export default function Bookings() {
  const [tab, setTab] = useState('UPCOMING')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async (status) => {
    setLoading(true)
    try {
      const res = await getBookings(status)
      setBookings(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(tab) }, [tab])

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try { await cancelBooking(id); load(tab) } catch (e) { console.error(e) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          <p>View and manage all your scheduled meetings</p>
        </div>
      </div>

      <div className="tabs">
        {['UPCOMING', 'PAST', 'CANCELLED'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">{tab === 'UPCOMING' ? '📭' : tab === 'PAST' ? '📁' : '🚫'}</div>
          <h3>No {tab.toLowerCase()} bookings</h3>
          <p>{tab === 'UPCOMING' ? 'Share your booking link to receive meetings' : 'No bookings to show here'}</p>
        </div>
      ) : (
        <div className="grid-list">
          {bookings.map((b) => (
            <div className="booking-item" key={b.id}>
              <div className="booking-item-left">
                <div className="booking-time-block">
                  <div className="bday">{format(new Date(b.startTime), 'd')}</div>
                  <div className="bmon">{format(new Date(b.startTime), 'MMM')}</div>
                </div>
                <div className="booking-info">
                  <h4>{b.bookerName}</h4>
                  <p>{b.eventType.title} · {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}</p>
                  <p style={{ fontSize: 12, marginTop: 2 }}>{b.bookerEmail}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {tab === 'UPCOMING' && (
                  <span className="badge badge-green">Upcoming</span>
                )}
                {tab === 'PAST' && (
                  <span className="badge badge-gray">Past</span>
                )}
                {tab === 'CANCELLED' && (
                  <span className="badge badge-red">Cancelled</span>
                )}
                {tab === 'UPCOMING' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
