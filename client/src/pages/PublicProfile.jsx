import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEventTypes } from '../api/api'

export default function PublicProfile() {
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getEventTypes()
        setEventTypes(res.data.filter(et => !et.isHidden))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="public-profile-page">
        <div className="spinner">Loading...</div>
      </div>
    )
  }

  return (
    <div className="public-profile-page">
      <div className="public-profile-card">
        {/* Avatar + Name */}
        <div className="public-profile-header">
          <div className="public-avatar">DS</div>
          <h1 className="public-name">Dheeraj Shahaul Syed</h1>
          <p className="public-bio">
            Welcome to my scheduling page. Pick an event type below to book a time with me.
          </p>
        </div>

        {/* Event Type List */}
        <div className="public-event-list">
          {eventTypes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>
              No event types available right now.
            </p>
          ) : (
            eventTypes.map((et) => (
              <Link to={`/book/${et.slug}`} key={et.id} className="public-event-item">
                <div className="public-event-color-bar" />
                <div className="public-event-info">
                  <h3>{et.title}</h3>
                  <p>{et.description || 'No description'}</p>
                </div>
                <div className="public-event-meta">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {et.durationMinutes} min
                </div>
                <div className="public-event-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="public-footer">
          <p>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14l2 2 4-4"/>
            </svg>
            Powered by <strong>CalClone</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
