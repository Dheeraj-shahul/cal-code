import { useEffect, useState } from 'react'
import { useSearchParams, Link, useParams } from 'react-router-dom'
import { getBookingById } from '../api/api'
import { format } from 'date-fns'

export default function Confirmation() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams()
  const bookingId = searchParams.get('bookingId')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getBookingById(bookingId)
        setBooking(res.data)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    if (bookingId) load()
    else setLoading(false)
  }, [bookingId])

  if (loading) return <div className="confirmation-page"><div className="spinner">Loading...</div></div>

  if (!booking) return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon"><i className="fa-solid fa-triangle-exclamation"></i></div>
        <h1>Booking not found</h1>
        <Link to={`/book/${slug}`} className="btn btn-primary" style={{ marginTop: 16 }}>Go back</Link>
      </div>
    </div>
  )

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <div className="confirmation-icon"><i className="fa-solid fa-circle-check" style={{color: 'var(--clr-success)'}}></i></div>
        <h1>Booking Confirmed!</h1>
        <p>
          A confirmation has been sent to <strong>{booking.bookerEmail}</strong>.<br />
          You're all set for your meeting.
        </p>

        <div className="confirmation-details">
          <div className="detail-row">
            <span className="detail-label">Event</span>
            <span className="detail-value">{booking.eventType.title}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">{format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Time</span>
            <span className="detail-value">
              {format(new Date(booking.startTime), 'h:mm a')} – {format(new Date(booking.endTime), 'h:mm a')}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{booking.eventType.durationMinutes} minutes</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span className="detail-value">{booking.bookerName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <Link to={`/book/${slug}`} className="btn btn-secondary">Book another slot</Link>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
