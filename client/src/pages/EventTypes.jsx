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
  const [activeDropdown, setActiveDropdown] = useState(null)

  const load = async () => {
    try {
      const res = await getEventTypes()
      setEventTypes(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    load() 
    const closeDropdown = () => setActiveDropdown(null)
    window.addEventListener('click', closeDropdown)
    return () => window.removeEventListener('click', closeDropdown)
  }, [])

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
        <div className="event-list-container">
          {eventTypes.map((et) => (
            <div className="event-list-item" key={et.id}>
              <div className="event-list-info">
                <div className="event-list-title">
                  <h3>{et.title}</h3>
                  <span>/book/{et.slug}</span>
                </div>
                <div className="event-list-badge">
                  <i className="fa-regular fa-clock"></i>
                  {et.durationMinutes}m
                </div>
              </div>
              <div className="event-list-actions">
                <div className="event-list-switch">
                  <span style={{ fontSize: 13, color: 'var(--clr-muted)' }}>Hidden</span>
                  <label className="switch" style={{ transform: 'scale(0.85)', margin: 0 }}>
                    <input type="checkbox" defaultChecked={false} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <button className="btn btn-icon btn-sm" title="Copy link" onClick={() => copyLink(et.slug)} style={{ padding: 6, width: 32, height: 32 }}>
                  <i className="fa-regular fa-copy" style={{ fontSize: 13 }}></i>
                </button>
                <button className="btn btn-icon btn-sm" title="View" onClick={() => window.open(bookingUrl(et.slug), '_blank')} style={{ padding: 6, width: 32, height: 32 }}>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 12 }}></i>
                </button>
                <div style={{ position: 'relative' }}>
                  <button 
                    className="btn btn-icon btn-sm" 
                    title="Menu" 
                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === et.id ? null : et.id); }} 
                    style={{ padding: 6, width: 32, height: 32 }}
                  >
                    <i className="fa-solid fa-ellipsis" style={{ fontSize: 14 }}></i>
                  </button>
                  {activeDropdown === et.id && (
                    <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => { setActiveDropdown(null); openEdit(et); }}><i className="fa-solid fa-pen"></i> Edit</button>
                       <button onClick={() => { setActiveDropdown(null); }}><i className="fa-regular fa-clone"></i> Duplicate</button>
                       <button onClick={() => { setActiveDropdown(null); }}><i className="fa-solid fa-code"></i> Embed</button>
                       <div className="dropdown-divider"></div>
                       <button style={{color: 'var(--clr-text)'}} /* Cal.com delete uses white text natively in this view */ onClick={() => { setActiveDropdown(null); handleDelete(et.id); }}>
                         <i className="fa-regular fa-trash-can"></i> Delete
                       </button>
                    </div>
                  )}
                </div>
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
