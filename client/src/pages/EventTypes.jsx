import { useEffect, useState } from 'react'
import { getEventTypes, createEventType, updateEventType, deleteEventType } from '../api/api'

const EMPTY_FORM = { title: '', description: '', durationMinutes: 30, slug: '', bufferMinutes: 0 }

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function EventTypes() {
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await getEventTypes()
      setEventTypes(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  const openEdit = (et) => { setEditing(et); setForm({ title: et.title, description: et.description || '', durationMinutes: et.durationMinutes, slug: et.slug, bufferMinutes: et.bufferMinutes || 0 }); setError(''); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setError('') }

  const handleTitleChange = (e) => {
    const title = e.target.value
    setForm((f) => ({ ...f, title, slug: editing ? f.slug : slugify(title) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      if (editing) await updateEventType(editing.id, form)
      else await createEventType(form)
      closeModal()
      load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event type? All its bookings will also be removed.')) return
    try { await deleteEventType(id); load() } catch (e) { console.error(e) }
  }

  const bookingUrl = (slug) => `${window.location.origin}/book/${slug}`

  const copyLink = (slug) => {
    navigator.clipboard.writeText(bookingUrl(slug))
    alert('Link copied!')
  }

  if (loading) return <div className="spinner">Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Event Types</h1>
          <p>Create and manage your booking event types</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <span>+</span> New Event Type
        </button>
      </div>

      {eventTypes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No event types yet</h3>
          <p>Create your first event type to get a booking link</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Create Event Type</button>
        </div>
      ) : (
        <div className="grid-list">
          {eventTypes.map((et) => (
            <div className="event-card" key={et.id}>
              <div className="event-card-left">
                <div className="event-dot">{et.durationMinutes}'</div>
                <div className="event-card-info">
                  <h3>{et.title}</h3>
                  <p>{et.description || 'No description'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className="link-copy">/book/{et.slug}</span>
                    <button className="btn btn-icon btn-sm" title="Copy link" onClick={() => copyLink(et.slug)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="event-card-actions">
                <span className="badge badge-purple">{et.durationMinutes} min</span>
                <button className="btn btn-icon btn-sm" title="Edit" onClick={() => openEdit(et)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn btn-icon btn-sm" title="Delete" style={{ color: 'var(--clr-danger)' }} onClick={() => handleDelete(et.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Event Type' : 'New Event Type'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input className="form-control" value={form.title} onChange={handleTitleChange} placeholder="e.g. 30 Minute Call" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="A short description for your bookers" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input className="form-control" type="number" min="5" max="480" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Buffer (minutes)</label>
                  <input className="form-control" type="number" min="0" max="60" value={form.bufferMinutes} onChange={(e) => setForm((f) => ({ ...f, bufferMinutes: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>URL Slug *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--clr-muted)', whiteSpace: 'nowrap' }}>/book/</span>
                  <input className="form-control" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} placeholder="e.g. 30min-call" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
