import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAvailability, updateAvailability, createAvailability, deleteAvailability } from '../api/api'
import Calendar from 'react-calendar'
import { format, parseISO } from 'date-fns'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'Asia/Dubai', 'UTC',
]

const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const timeValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    const ampm = h >= 12 ? 'pm' : 'am'
    const dispH = h === 0 ? 12 : (h > 12 ? h - 12 : h)
    const dispM = m.toString().padStart(2, '0')
    const timeDisplay = `${dispH}:${dispM}${ampm}`
    TIME_OPTIONS.push({ value: timeValue, label: timeDisplay })
  }
}

export default function Availability() {
  const [schedules, setSchedules] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Edit Mode State
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [isDefault, setIsDefault] = useState(false)
  const [slots, setSlots] = useState({})
  const [overrides, setOverrides] = useState([])

  // Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showDefaultModal, setShowDefaultModal] = useState(false)
  const [oDate, setODate] = useState(new Date())
  const [oUnavail, setOUnavail] = useState(false)
  const [oStart, setOStart] = useState('09:00')
  const [oEnd, setOEnd] = useState('17:00')

  const location = useLocation()

  async function load() {
    setLoading(true)
    try {
      const res = await getAvailability()
      setSchedules(res.data)
      if (selectedId) { // reload current selection if it existed
        const updated = res.data.find(s => s.id === selectedId)
        if (updated) handleSelect(updated)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Listen for clicks on the sidebar link (which change location.key but don't remount)
  useEffect(() => {
    setSelectedId(null)
    // We already load via the other useEffect on mount, but safe to do here if needed
  }, [location.key])

  const handleSelect = (s) => {
    setSelectedId(s.id)
    setName(s.name)
    setTimezone(s.timezone)
    setIsDefault(s.isDefault)
    setOverrides(s.overrides || [])
    
    const s_slots = {}
    s.slots.forEach(sl => { s_slots[sl.dayOfWeek] = { enabled: true, startTime: sl.startTime, endTime: sl.endTime } })
    DAYS.forEach((_, i) => { if (!s_slots[i]) s_slots[i] = { enabled: false, startTime: '09:00', endTime: '17:00' } })
    setSlots(s_slots)
  }

  const createNewSchedule = async () => {
    let newName = prompt('Enter a name for the new schedule:')
    if (!newName) return
    setLoading(true)
    try {
      const res = await createAvailability({ name: newName })
      await load()
      handleSelect(res.data)
    } catch (e) { console.error(e); setLoading(false); }
  }

  const handleDeleteSchedule = async () => {
    if (schedules.length === 1) return alert('You must have at least one availability schedule.')
    if (!confirm('Are you sure you want to delete this schedule?')) return
    setSaving(true)
    try {
      await deleteAvailability(selectedId)
      setSelectedId(null)
      await load()
    } catch (e) { console.error(e); }
    finally { setSaving(false) }
  }

  const updateTime = (day, field, value) => {
    setSlots((prev) => {
      const newSlots = { ...prev }
      const slot = { ...newSlots[day] }
      if (field === 'startTime') {
        const [oldSH, oldSM] = slot.startTime.split(':').map(Number)
        const [oldEH, oldEM] = slot.endTime.split(':').map(Number)
        const durationMins = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM)
        slot.startTime = value
        if (durationMins > 0) {
          const [newSH, newSM] = value.split(':').map(Number)
          let newEndMins = (newSH * 60 + newSM) + durationMins
          if (newEndMins >= 24 * 60) newEndMins = 23 * 60 + 45
          const newEH = Math.floor(newEndMins / 60)
          const newEM = newEndMins % 60
          slot.endTime = `${newEH.toString().padStart(2, '0')}:${newEM.toString().padStart(2, '0')}`
        }
      } else { slot[field] = value }
      newSlots[day] = slot
      return newSlots
    })
  }

  const toggleDay = (day) => { setSlots((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } })) }

  const handleSave = async (overrideIsDefault) => {
    const finalIsDefault = typeof overrideIsDefault === 'boolean' ? overrideIsDefault : isDefault;
    setSaving(true); setSuccess(false)
    const slotsArr = Object.entries(slots)
      .filter(([, s]) => s.enabled)
      .map(([day, s]) => ({ dayOfWeek: parseInt(day), startTime: s.startTime, endTime: s.endTime }))
    try {
      await updateAvailability(selectedId, { name, timezone, isDefault: finalIsDefault, slots: slotsArr, overrides })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      load() // resync
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleCreateOverride = () => {
    const oStr = format(oDate, 'yyyy-MM-dd')
    const newO = oUnavail ? { date: oStr, startTime: null, endTime: null } : { date: oStr, startTime: oStart, endTime: oEnd }
    // Overwrite existing override on same date if exists, otherwise push
    const filtered = overrides.filter(ov => ov.date !== oStr)
    setOverrides([...filtered, newO])
    setShowOverrideModal(false)
  }

  const deleteOverride = (dateStr) => {
    setOverrides(overrides.filter(ov => ov.date !== dateStr))
  }

  if (loading && schedules.length === 0) return <div className="spinner">Loading...</div>

  // LIST MODE
  if (!selectedId) {
    return (
      <div className="availability-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{fontSize: 20, fontWeight: 700}}>Availability</h1>
            <p style={{fontSize: 14, color: 'var(--clr-muted)'}}>Configure times when you are available for bookings.</p>
          </div>
          <button className="btn btn-secondary" onClick={createNewSchedule} style={{alignSelf: 'flex-start'}}>
            <i className="fa-solid fa-plus" style={{marginRight: 6}}></i> New
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {schedules.map(s => (
            <div key={s.id} className="card schedule-list-card" onClick={() => handleSelect(s)} style={{ cursor: 'pointer', padding: 24, transition: '0.2s ease'}}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{s.name}</h3>
                   {s.isDefault && <span style={{ background: '#3f3f46', fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>Default</span>}
                 </div>
                 <div style={{color: 'var(--clr-muted)'}}><i className="fa-solid fa-chevron-right"></i></div>
               </div>
               <p style={{ marginTop: 12, fontSize: 14, color: 'var(--clr-muted)'}}>
                  <i className="fa-solid fa-earth-americas" style={{marginRight: 6}}></i> {s.timezone}
               </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // EDIT MODE
  return (
    <div className="availability-page-container">
      {/* Top Header layout */}
      <div className="availability-header">
        <div className="header-left">
          <div className="back-arrow" style={{cursor: 'pointer'}} onClick={() => setSelectedId(null)}>
             <i className="fa-solid fa-arrow-left"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <input 
                 value={name} 
                 onChange={(e) => setName(e.target.value)} 
                 style={{ background: 'transparent', border: 'none', color: 'var(--clr-text)', fontSize: 20, fontWeight: 700, outline: 'none', padding: 0 }} 
               />
               <i className="fa-solid fa-pen" style={{fontSize: 14, color: 'var(--clr-muted)'}}></i>
            </div>
            <p style={{ fontSize: 14, color: 'var(--clr-muted)', marginTop: 4 }}>
              Setup your weekly schedule
            </p>
          </div>
        </div>
        <div className="header-right">
          <div className="toggle-container">
            <span style={{fontSize: 14, fontWeight: 500}}>Set as default</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isDefault} 
                onChange={(e) => {
                  if (e.target.checked) setShowDefaultModal(true);
                  else setIsDefault(false);
                }} 
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="divider"></div>
          <button className="icon-btn-danger" onClick={handleDeleteSchedule} disabled={schedules.length === 1} title={schedules.length === 1 ? "Cannot delete the only schedule" : "Delete Schedule"}>
             <i className="fa-regular fa-trash-can"></i>
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px' }}>
            {saving ? 'Saving...' : success ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="availability-layout">
        <div className="availability-main">
          {/* Schedule Card */}
          <div className="card schedule-card">
            {DAYS.map((day, i) => (
              <div key={i} className="schedule-row" style={{ borderBottom: i < 6 ? '1px solid var(--clr-border)' : 'none' }}>
                <div className="schedule-day">
                  <label className="switch">
                    <input type="checkbox" checked={slots[i]?.enabled || false} onChange={() => toggleDay(i)} />
                    <span className="slider round"></span>
                  </label>
                  <span className="day-name">{day}</span>
                </div>
                
                <div className="schedule-times">
                  {slots[i]?.enabled ? (
                    <div className="time-inputs-wrapper">
                      <div className="time-input">
                        <select value={slots[i].startTime} onChange={(e) => updateTime(i, 'startTime', e.target.value)}>
                          {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <span style={{ color: 'var(--clr-muted)' }}>-</span>
                      <div className="time-input">
                        <select value={slots[i].endTime} onChange={(e) => updateTime(i, 'endTime', e.target.value)}>
                          {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <button className="icon-btn"><i className="fa-solid fa-plus"></i></button>
                    </div>
                  ) : (
                    <span className="unavailable-text">Unavailable</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Date Overrides Card */}
          <div className="card overrides-card" style={{marginTop: 24}}>
            <h3>Date overrides <i className="fa-solid fa-circle-info" style={{color: 'var(--clr-muted)', fontSize: 13, marginLeft: 4}}></i></h3>
            <p style={{marginBottom: 16}}>Add dates when your availability changes from your daily hours.</p>
            
            {overrides.length > 0 && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {overrides.map(o => (
                  <div key={o.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--clr-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--clr-border)' }}>
                     <div style={{ fontWeight: 500, fontSize: 14 }}>{format(parseISO(o.date), 'MMMM d, yyyy')}</div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 14, color: 'var(--clr-muted)' }}>
                           {!o.startTime ? 'Unavailable' : `${TIME_OPTIONS.find(t=>t.value===o.startTime)?.label} - ${TIME_OPTIONS.find(t=>t.value===o.endTime)?.label}`}
                        </span>
                        <button className="icon-btn" onClick={() => deleteOverride(o.date)} style={{ color: 'var(--clr-danger)' }}><i className="fa-regular fa-trash-can"></i></button>
                     </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-secondary btn-sm" onClick={() => setShowOverrideModal(true)}>
              <i className="fa-solid fa-plus" style={{marginRight: 6}}></i> Add an override
            </button>
          </div>
        </div>

        <div className="availability-sidebar">
          {/* Timezone section */}
          <div className="timezone-section">
            <label>Timezone</label>
            <select className="form-control" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {/* Troubleshooter Card */}
          <div className="troubleshoot-card">
            <h4>Something doesn't look right?</h4>
            <button className="btn btn-secondary btn-sm">Launch troubleshooter</button>
          </div>
        </div>
      </div>

      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700, display: 'flex', padding: 0 }}>
             <div style={{ flex: 1, padding: 24, borderRight: '1px solid var(--clr-border)' }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Select the dates to override</h3>
                <div className="booking-main calendar-col" style={{ border: 'none', background: 'transparent' }}>
                   <Calendar onChange={setODate} value={oDate} minDate={new Date()} />
                </div>
             </div>
             <div style={{ width: 300, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                   <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 500 }}>Which hours are you free?</label>
                   {!oUnavail ? (
                     <div className="time-inputs-wrapper" style={{ marginBottom: 16 }}>
                       <div className="time-input">
                         <select value={oStart} onChange={(e)=>setOStart(e.target.value)}>
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                       </div>
                       <span style={{ color: 'var(--clr-muted)' }}>-</span>
                       <div className="time-input">
                         <select value={oEnd} onChange={(e)=>setOEnd(e.target.value)}>
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                         </select>
                       </div>
                     </div>
                   ) : (
                     <div style={{ padding: '8px 0', color: 'var(--clr-muted)', fontSize: 14, fontStyle: 'italic', marginBottom: 16 }}>
                        Unavailable completely
                     </div>
                   )}
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <label className="switch">
                        <input type="checkbox" checked={oUnavail} onChange={(e)=>setOUnavail(e.target.checked)} />
                        <span className="slider round"></span>
                     </label>
                     <span style={{ fontSize: 14 }}>Mark unavailable (All day)</span>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'auto' }}>
                   <button className="btn btn-secondary btn-sm" style={{ border: 'none' }} onClick={() => setShowOverrideModal(false)}>Close</button>
                   <button className="btn btn-primary btn-sm" onClick={handleCreateOverride}>Save override</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showDefaultModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, padding: 24 }}>
             <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Set as default</h3>
             <p style={{ color: 'var(--clr-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
               Are you sure you want to set this as your default schedule? This will replace your current default schedule and apply to any associated event types automatically.
             </p>
             <div style={{ display: 'flex', gap: 12, justifyItems: 'flex-end', marginLeft: 'auto', width: 'fit-content' }}>
                <button className="btn btn-secondary" onClick={() => setShowDefaultModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                   setIsDefault(true)
                   setShowDefaultModal(false)
                   setTimeout(() => handleSave(true), 0)
                }}>Confirm reset</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
