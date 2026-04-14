import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { getEventTypeBySlug, getAvailability, getAvailableSlots, createBooking } from '../api/api'

export default function BookingPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [eventType, setEventType] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [etRes, avRes] = await Promise.all([
          getEventTypeBySlug(slug),
          getAvailability(),
        ])
        setEventType(etRes.data)
        setAvailability(avRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const availableDays = availability?.slots?.map((s) => s.dayOfWeek) || []

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
    const isUnavailable = !availableDays.includes(date.getDay())
    return isPast || isUnavailable
  }

  const handleDateChange = async (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlotsLoading(true)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await getAvailableSlots(eventType.id, dateStr)
      setSlots(res.data)
    } catch (e) { console.error(e) }
    finally { setSlotsLoading(false) }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    setError('')
    setBooking(true)
    try {
      const res = await createBooking({
        eventTypeId: eventType.id,
        bookerName: form.name,
        bookerEmail: form.email,
        startTime: selectedSlot.start,
      })
      navigate(`/book/${slug}/confirmation?bookingId=${res.data.id}`)
    } catch (err) {
      setError(err?.response?.data?.error || 'Booking failed. Please try again.')
    } finally { setBooking(false) }
  }

  if (loading) return <div className="booking-page"><div className="spinner">Loading...</div></div>
  if (!eventType) return <div className="booking-page"><div className="card">Event not found.</div></div>

  return (
    <div className="booking-page">
      <div className="booking-card">
        {/* LEFT SIDEBAR */}
        <div className="booking-sidebar">
          <p className="host-name">👤 {eventType.user?.name}</p>
          <h1>{eventType.title}</h1>
          {eventType.description && (
            <p style={{ fontSize: 13, color: 'var(--clr-muted)', marginBottom: 20 }}>{eventType.description}</p>
          )}
          <div className="booking-meta">
            <div className="booking-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {eventType.durationMinutes} minutes
            </div>
            <div className="booking-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {availability?.timezone || 'UTC'}
            </div>
            <div className="booking-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </div>
            {selectedSlot && (
              <div className="booking-meta-item" style={{ color: 'var(--clr-primary)', fontWeight: 600 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {format(new Date(selectedSlot.start), 'h:mm a')}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MAIN */}
        <div className="booking-main">
          {!selectedSlot ? (
            <>
              <h2>Select a Date & Time</h2>
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileDisabled={tileDisabled}
                minDate={new Date()}
              />
              {selectedDate && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                    Available times for {format(selectedDate, 'MMMM d')}
                  </h3>
                  {slotsLoading ? (
                    <div className="spinner">Loading slots...</div>
                  ) : slots.length === 0 ? (
                    <p style={{ color: 'var(--clr-muted)', fontSize: 14 }}>No available slots for this day.</p>
                  ) : (
                    <div className="time-slots">
                      {slots.map((slot) => (
                        <button
                          key={slot.start}
                          className="time-slot-btn"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {format(new Date(slot.start), 'h:mm a')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSlot(null)}>← Back</button>
                <h2 style={{ margin: 0 }}>Enter your details</h2>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label>Your Name *</label>
                  <input className="form-control" placeholder="Jane Doe" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input className="form-control" type="email" placeholder="jane@example.com" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={{ background: 'var(--clr-bg)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                  <strong>📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}</strong><br/>
                  <span style={{ color: 'var(--clr-muted)' }}>
                    {format(new Date(selectedSlot.start), 'h:mm a')} – {format(new Date(selectedSlot.end), 'h:mm a')} · {eventType.durationMinutes} min
                  </span>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={booking}>
                  {booking ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
