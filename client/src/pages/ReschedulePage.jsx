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
        {/* EVENT HEADER / SIDEBAR */}
        <div className="booking-sidebar">
          <div className="booking-sidebar-inner">
            <p className="host-name"><i className="fa-regular fa-user"></i> {bookingRef?.bookerName} (Rescheduling)</p>
            <h1>{eventType.title}</h1>
            <p className="reschedule-source">
               Original: {format(new Date(bookingRef.startTime), 'MMM d, h:mm a')}
            </p>
            
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
                <div className="booking-meta-item" style={{ color: 'var(--clr-warning)', fontWeight: 700 }}>
                  <i className="fa-regular fa-clock" style={{ fontSize: 13 }}></i>
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
              <h2>Select a new date & time</h2>
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
                </div>
                {slotsLoading ? (
                  <div className="spinner-inline">Loading slots...</div>
                ) : slots.length === 0 ? (
                  <p className="no-slots-msg">No slots available.</p>
                ) : (
                  <div className="time-slots-vertical">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
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

          {/* STEP 2: Confirm Reschedule */}
          <div className={`booking-step ${selectedSlot ? 'active' : 'hidden-right'}`}>
            <div className="form-col">
              <div className="form-header">
                <button className="back-btn-minimal" onClick={() => setSelectedSlot(null)}>
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h2>Confirm Reschedule</h2>
              </div>
              
              {error && <div className="error-msg">{error}</div>}
              
              <div className="reschedule-summary-card">
                 <p className="summary-label">Rescheduling for</p>
                 <h4 className="summary-name">{bookingRef?.bookerName}</h4>
                 <p className="summary-email">{bookingRef?.bookerEmail}</p>
                 
                 <div className="summary-divider"></div>
                 
                 <div className="summary-time-box">
                    <p className="new-time-label">New Proposed Time</p>
                    <p className="new-time-value">
                      {selectedSlot && formatDateTimeLocally(selectedSlot.start)}
                    </p>
                 </div>
              </div>

              <form onSubmit={handleReschedule} style={{ marginTop: 32 }}>
                <button type="submit" className="btn btn-primary btn-lg-wide" disabled={rescheduling}>
                  {rescheduling ? 'Moving...' : 'Confirm Reschedule'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
