import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBookings, cancelBooking, getEventTypes } from '../api/api'
import { format } from 'date-fns'

export default function Bookings() {
  const [tab, setTab] = useState('UPCOMING')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const navigate = useNavigate()

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null })
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  const load = async (status) => {
    setLoading(true)
    try {
      const bkRes = await getBookings(status)
      setBookings(bkRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(tab) }, [tab])

  useEffect(() => {
    const close = () => {
      setActiveDropdown(null)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const openCancelModal = (id) => {
    setCancelModal({ open: true, bookingId: id })
    setCancelReason('')
    setActiveDropdown(null)
  }

  const closeCancelModal = () => {
    setCancelModal({ open: false, bookingId: null })
    setCancelReason('')
  }

  const handleConfirmCancel = async () => {
    setCancelling(true)
    try {
      await cancelBooking(cancelModal.bookingId, cancelReason)
      closeCancelModal()
      load(tab)
    } catch (e) { console.error(e) }
    finally { setCancelling(false) }
  }

  // Client-side filtering (Search only)
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true;

    const dateStr = format(new Date(b.startTime), 'MMM d yyyy').toLowerCase()

    return (
      b.bookerName.toLowerCase().includes(q) ||
      b.bookerEmail.toLowerCase().includes(q) ||
      b.eventType.title.toLowerCase().includes(q) ||
      dateStr.includes(q)
    )
  })

  const hasActiveFilters = searchQuery
  const totalCount = filteredBookings.length

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Top Tabs Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--clr-border)', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4, flex: 1 }} className="hide-scrollbar">
          {['UPCOMING', 'PAST', 'CANCELLED'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearchQuery(''); }}
              style={{
                background: 'transparent', border: 'none',
                color: tab === t ? 'var(--clr-text)' : 'var(--clr-muted)',
                fontWeight: tab === t ? 600 : 500,
                fontSize: 13, cursor: 'pointer', paddingBottom: 12,
                position: 'relative', whiteSpace: 'nowrap'
              }}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
              {tab === t && <div style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 2, background: 'var(--clr-text)', borderRadius: '2px 2px 0 0' }}></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-muted)', fontSize: 13 }}></i>
        <input
          type="text"
          placeholder="Search by name, email, event type, or date (e.g. Apr 16)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 36px', boxSizing: 'border-box',
            background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
            borderRadius: 8, color: 'var(--clr-text)', fontSize: 13, outline: 'none'
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--clr-muted)', cursor: 'pointer', fontSize: 14 }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {/* Active Filter Pills (Search only) */}
      {searchQuery && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 10 }}></i> "{searchQuery}"
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--clr-muted)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <i className="fa-solid fa-xmark" style={{ fontSize: 10 }}></i>
              </button>
            </span>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-muted)', letterSpacing: 0.5, marginBottom: 16 }}>
        {tab === 'PAST' ? 'PAST' : 'NEXT'}
        {hasActiveFilters && <span style={{ fontWeight: 400, marginLeft: 8 }}>— {totalCount} result{totalCount !== 1 ? 's' : ''}</span>}
      </div>

      {loading ? (
        <div className="spinner">Loading...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="event-list-container" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: 'var(--clr-muted)' }}>
            {hasActiveFilters ? <i className="fa-solid fa-magnifying-glass"></i> : <i className="fa-regular fa-calendar-xmark"></i>}
          </div>
          <h3 style={{ margin: '0 0 8px' }}>
            {hasActiveFilters ? 'No results found' : `No ${tab.toLowerCase()} bookings`}
          </h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="event-list-container">
          {filteredBookings.map((b) => (
            <div className="event-list-item" key={b.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 20px' }}>

              {/* Left Column */}
              <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--clr-text)' }}>
                  {format(new Date(b.startTime), 'eee, d MMM')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--clr-muted)' }}>
                  {format(new Date(b.startTime), 'h:mma')} - {format(new Date(b.endTime), 'h:mma')}
                </div>
                {b.isRescheduled && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ background: '#7c2d12', color: '#ffedd5', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Rescheduled</span>
                  </div>
                )}
              </div>

              {/* Middle Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--clr-text)' }}>
                  {b.eventType.durationMinutes} min meeting between You and {b.bookerName}
                </div>
                <div style={{ fontSize: 13, color: 'var(--clr-muted)' }}>
                  <i className="fa-solid fa-users" style={{ marginRight: 6 }}></i>You and {b.bookerName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--clr-muted)', marginTop: 2 }}>
                  <i className="fa-regular fa-envelope" style={{ marginRight: 5 }}></i>{b.bookerEmail}
                </div>
              </div>

              {/* Right Column */}
              <div className="booking-item-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {tab === 'UPCOMING' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn btn-icon btn-sm"
                      title="Menu"
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === b.id ? null : b.id) }}
                      style={{ padding: 6, width: 32, height: 32 }}
                    >
                      <i className="fa-solid fa-ellipsis" style={{ fontSize: 14 }}></i>
                    </button>
                    {activeDropdown === b.id && (
                      <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setActiveDropdown(null); navigate(`/reschedule/${b.id}`) }}>
                          <i className="fa-regular fa-clock"></i> Reschedule booking
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="danger" onClick={() => openCancelModal(b.id)}>
                          <i className="fa-regular fa-circle-xmark"></i> Cancel event
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--clr-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select style={{ background: 'transparent', border: '1px solid var(--clr-border)', color: 'var(--clr-text)', padding: '4px 8px', borderRadius: 6, outline: 'none' }}>
                <option>10</option><option>20</option><option>50</option>
              </select>
              rows per page
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              1-{totalCount} of {totalCount}
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-icon btn-sm" disabled><i className="fa-solid fa-arrow-left"></i></button>
                <button className="btn btn-icon btn-sm" disabled><i className="fa-solid fa-arrow-right"></i></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation Reason Modal ── */}
      {cancelModal.open && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-regular fa-circle-xmark" style={{ color: 'var(--clr-danger)', fontSize: 20 }}></i>
                Cancel Event
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={closeCancelModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            

            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text)', display: 'block', marginBottom: 8 }}>
                Reason for cancellation
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="e.g. Schedule conflict, need to reschedule..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ resize: 'vertical', minHeight: 100 }}
              />
              {/* <p style={{ fontSize: 12, color: 'var(--clr-muted)', marginTop: 6 }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }}></i>
                This field is optional but appreciated.
              </p> */}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeCancelModal} disabled={cancelling}>
                Keep Booking
              </button>
              <button
                className="btn"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim()}
                style={{ 
                  background: 'var(--clr-primary)', 
                  color: '#1a1a1a',
                  opacity: (cancelling || !cancelReason.trim()) ? 0.5 : 1,
                  cursor: (cancelling || !cancelReason.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {cancelling
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Cancelling...</>
                  : <><i className="fa-regular fa-circle-xmark"></i> Yes, Cancel Event</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
