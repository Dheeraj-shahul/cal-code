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
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  const [timeFormat, setTimeFormat] = useState('12h');
  
  // Custom Time Formatter factoring in dynamic selectedTimezone and format (12h/24h)
  const formatTimeLocally = (dateStr) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: selectedTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h'
    }).format(new Date(dateStr));
  }

  useEffect(() => {
    async function load() {
      try {
        const [etRes, avRes] = await Promise.all([
          getEventTypeBySlug(slug),
          getAvailability(),
        ])
        setEventType(etRes.data)
        
        // Find default schedule, or fallback to first one
        const activeSched = Array.isArray(avRes.data)
           ? (avRes.data.find(a => a.isDefault) || avRes.data[0])
           : avRes.data;
           
        setAvailability(activeSched)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // Auto-select today's date on initial load
  useEffect(() => {
    if (eventType && availability && !selectedDate) {
      const today = new Date();
      setSelectedDate(today);
      setSelectedSlot(null);
      setSlotsLoading(true);
      const dateStr = format(today, 'yyyy-MM-dd');
      getAvailableSlots(eventType.id, dateStr)
        .then(res => {
          setSlots(res.data);
          setSlotsLoading(false);
        })
        .catch(e => {
          console.error(e);
          setSlotsLoading(false);
        });
    }
  }, [eventType, availability]);

  const availableDays = availability?.slots?.map((s) => s.dayOfWeek) || []

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
    const dateStr = format(date, 'yyyy-MM-dd')
    
    let isUnavailable = !availableDays.includes(date.getDay())
    
    // Check Date Overrides on public calendar!
    if (availability?.overrides?.length > 0) {
      const override = availability.overrides.find(o => o.date === dateStr)
      if (override) {
        if (!override.startTime || !override.endTime) isUnavailable = true;
        else isUnavailable = false; 
      }
    }

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
        {/* EVENT HEADER / SIDEBAR */}
        <div className="booking-sidebar">
          <div className="booking-sidebar-inner">
            <p className="host-name"><i className="fa-regular fa-user"></i> {eventType.user?.name}</p>
            <h1>{eventType.title}</h1>
            {eventType.description && (
              <p className="event-description">{eventType.description}</p>
            )}
            
            <div className="booking-meta">
              <div className="booking-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {eventType.durationMinutes} min
              </div>
              <div className="booking-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <select value={selectedTimezone} onChange={(e) => setSelectedTimezone(e.target.value)} className="timezone-select-minimal">
                  <option value="America/New_York">New York</option>
                  <option value="America/Los_Angeles">Los Angeles</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Kolkata">Kolkata</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
                <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, opacity: 0.7 }}></i>
              </div>
              
              {selectedDate && (
                 <div className="booking-meta-item" style={{ color: selectedSlot ? 'var(--clr-text)' : 'var(--clr-primary)', fontWeight: 600 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {format(selectedDate, 'MMM d, yyyy')}
                 </div>
              )}

              {selectedSlot && (
                <div className="booking-meta-item" style={{ color: 'var(--clr-primary)', fontWeight: 700 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {formatTimeLocally(selectedSlot.start)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN INTERACTION AREA */}
        <div className="booking-dynamic-container">
          
          {/* STEP 1: Date & Time Selection */}
          <div className={`booking-step ${selectedSlot ? 'hidden-left' : 'active'}`}>
            <div className="booking-main calendar-col" style={{ borderRight: selectedDate ? '1px solid var(--clr-border)' : 'none' }}>
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                tileDisabled={tileDisabled}
                minDate={new Date()}
              />
            </div>
            
            {selectedDate && (
              <div className="booking-time-col">
                <div className="time-col-header">
                  <span>{format(selectedDate, 'EEEE, MMM d')}</span>
                  <div className="time-format-toggle">
                    <button className={`time-format-btn ${timeFormat === '12h' ? 'active' : ''}`} onClick={() => setTimeFormat('12h')}>12h</button>
                    <button className={`time-format-btn ${timeFormat === '24h' ? 'active' : ''}`} onClick={() => setTimeFormat('24h')}>24h</button>
                  </div>
                </div>
                {slotsLoading ? (
                  <div className="spinner-inline">Loading slots...</div>
                ) : slots.length === 0 ? (
                  <p className="no-slots-msg">No slots available for this date.</p>
                ) : (
                  <div className="time-slots-vertical">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        className="time-slot-btn-cal"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <span className="dot"></span>
                        {formatTimeLocally(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Details Form */}
          <div className={`booking-step ${selectedSlot ? 'active' : 'hidden-right'}`}>
            <div className="form-col">
              <div className="form-header">
                <button className="back-btn-minimal" onClick={() => setSelectedSlot(null)}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2>Enter your details</h2>
              </div>
              
              {error && <div className="error-msg">{error}</div>}
              
              <form onSubmit={handleBook} className="booking-form-main">
                <div className="form-group">
                  <label>Your Name *</label>
                  <input className="form-control" placeholder="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input className="form-control" type="email" placeholder="example@gmail.com" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={{ marginTop: 32 }}>
                  <button type="submit" className="btn btn-primary btn-lg-wide" disabled={booking}>
                    {booking ? 'Confirming...' : 'Complete Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
