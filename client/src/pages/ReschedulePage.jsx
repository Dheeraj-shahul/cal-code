import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { getBookingById, getAvailability, getAvailableSlots, rescheduleBooking } from '../api/api'

export default function ReschedulePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [bookingRef, setBookingRef] = useState(null)
  const [eventType, setEventType] = useState(null)
  const [availability, setAvailability] = useState(null)
  
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [rescheduling, setRescheduling] = useState(false)
  const [error, setError] = useState('')
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');

  const formatTimeLocally = (dateStr) => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: selectedTimezone,
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  }

  const formatDateTimeLocally = (dateStr) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: selectedTimezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(dateStr));
  }

  useEffect(() => {
    async function load() {
      try {
        const [bkRes, avRes] = await Promise.all([
          getBookingById(id),
          getAvailability(),
        ])
        
        const b = bkRes.data
        setBookingRef(b)
        setEventType(b.eventType) // Contains title, slug, durationMinutes injected via the backend DTO
        
        // Match base availability constraints
        const activeSched = Array.isArray(avRes.data)
           ? (avRes.data.find(a => a.isDefault) || avRes.data[0])
           : avRes.data
           
        setAvailability(activeSched)
      } catch (e) {
        console.error(e)
        setError('Booking not found or unavailable.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Select today natively
  useEffect(() => {
    if (eventType && availability && !selectedDate) {
      const today = new Date();
      setSelectedDate(today);
      setSelectedSlot(null);
      setSlotsLoading(true);
      const dateStr = format(today, 'yyyy-MM-dd');
      // Pass the booking id inside the slot fetch logic natively if needed, but our slot checker gets all slots.
      // Conflicts logic already excludes the same booking logic inside the backend reschedule mutation!
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

  const handleReschedule = async (e) => {
    e.preventDefault()
    setError('')
    setRescheduling(true)
    try {
      await rescheduleBooking(bookingRef.id, { startTime: selectedSlot.start })
      navigate('/bookings')
    } catch (err) {
      setError(err?.response?.data?.error || 'Reschedule failed. Please pick a different slot.')
    } finally { setRescheduling(false) }
  }

  if (loading) return <div className="booking-page"><div className="spinner">Loading...</div></div>
  if (!eventType) return <div className="booking-page"><div className="card">{error || 'Event not found.'}</div></div>

  return (
    <div className="booking-page">
      <div className="booking-card">
        {/* LEFT SIDEBAR */}
        <div className="booking-sidebar">
          <p className="host-name"><i className="fa-regular fa-user"></i> {bookingRef.bookerName} (Rescheduling)</p>
          <h1>{eventType.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--clr-muted)', marginBottom: 20 }}>
            Original time: {format(new Date(bookingRef.startTime), 'MMM d, h:mm a')}
          </p>
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
              <select value={selectedTimezone} onChange={(e) => setSelectedTimezone(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', padding: 0, outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                <option value="America/New_York">America/New York</option>
                <option value="America/Los_Angeles">America/Los Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
              </select>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}></i>
            </div>
            <div className="booking-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </div>
            {selectedSlot && (
              <div className="booking-meta-item" style={{ color: 'var(--clr-warning)', fontWeight: 600 }}>
                <i className="fa-regular fa-clock" style={{ marginRight: 8 }}></i>
                {formatTimeLocally(selectedSlot.start)}
              </div>
            )}
          </div>
        </div>

        {/* DYNAMIC RIGHT CONTAINER */}
        <div className="booking-dynamic-container" style={{ position: 'relative', overflow: 'hidden' }}>
          
          {/* Calendar View */}
          <div className="booking-main calendar-col" style={{
            transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
            transform: selectedSlot ? 'translateX(-100%)' : 'translateX(0)',
            opacity: selectedSlot ? 0 : 1,
            pointerEvents: selectedSlot ? 'none' : 'auto',
          }}>
            <h2>Select a new Date & Time</h2>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ flex: 1 }}>
                <Calendar 
                  onChange={handleDateChange} 
                  value={selectedDate} 
                  tileDisabled={tileDisabled}
                  minDate={new Date()}
                />
              </div>
              
              {selectedDate && (
                <div className="booking-time-col">
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                  {slotsLoading ? (
                    <div className="spinner">Loading slots...</div>
                  ) : slots.length === 0 ? (
                    <p style={{ color: 'var(--clr-muted)', fontSize: 13 }}>No times available.</p>
                  ) : (
                    <div className="time-slots-vertical">
                      {slots.map((s, i) => (
                        <button key={i} className="time-slot-btn-cal" onClick={() => setSelectedSlot(s)}>
                          <span className="dot"></span>
                          {formatTimeLocally(s.start)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form View (Stripped for simple Reschedule) */}
          <div className="booking-main form-col" style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out',
            transform: selectedSlot ? 'translateX(0)' : 'translateX(100%)',
            opacity: selectedSlot ? 1 : 0,
            pointerEvents: selectedSlot ? 'auto' : 'none',
          }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSlot(null)} style={{ marginBottom: 20 }}>
              <i className="fa-solid fa-arrow-left"></i> Back
            </button>
            <h2>Confirm Reschedule</h2>
            {error && <div className="alert alert-danger" style={{ marginBottom: 16, color: 'var(--clr-danger)' }}>{error}</div>}
            
            <form onSubmit={handleReschedule} style={{ marginTop: 24 }}>
              <div style={{ background: 'var(--clr-surface)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--clr-border)', marginBottom: 24 }}>
                 <p style={{ fontSize: 14, color: 'var(--clr-muted)', marginBottom: 8 }}>Rescheduling for</p>
                 <h4 style={{ margin: 0, fontSize: 16 }}>{bookingRef?.bookerName}</h4>
                 <p style={{ margin: 0, fontSize: 13, color: 'var(--clr-muted)' }}>{bookingRef?.bookerEmail}</p>
                 
                 <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--clr-border)' }}>
                   <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                     New Time: {selectedSlot && formatDateTimeLocally(selectedSlot.start)}
                   </p>
                 </div>
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={rescheduling}>
                {rescheduling ? 'Moving...' : 'Confirm Reschedule'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
