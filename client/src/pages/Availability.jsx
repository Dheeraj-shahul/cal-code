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
    // Initialize all days as empty arrays
    DAYS.forEach((_, i) => s_slots[i] = [])
    
    // Fill from database slots
    s.slots.forEach(sl => { 
      s_slots[sl.dayOfWeek].push({ startTime: sl.startTime, endTime: sl.endTime })
    })
    
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

  const updateTime = (day, slotIdx, field, value) => {
    setSlots((prev) => {
      const daySlots = [...prev[day]]
      const slot = { ...daySlots[slotIdx] }
      
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
      } else { 
        slot[field] = value 
      }
      
      daySlots[slotIdx] = slot
      return { ...prev, [day]: daySlots }
    })
  }

  const toggleDay = (day) => {
    setSlots((prev) => {
      const isCurrentlyEnabled = prev[day].length > 0
      return {
        ...prev,
        [day]: isCurrentlyEnabled ? [] : [{ startTime: '09:00', endTime: '17:00' }]
      }
    })
  }

  const addExtraSlot = (day) => {
    setSlots((prev) => {
      const daySlots = [...prev[day]]
      const lastSlot = daySlots[daySlots.length - 1]
      
      let newStart = '09:00'
      let newEnd = '17:00'
      
      if (lastSlot) {
        const [h, m] = lastSlot.endTime.split(':').map(Number)
        let totalMins = h * 60 + m + 15 // Start 15 mins after last end
        if (totalMins >= 23 * 60 + 45) totalMins = 0 // Wrap around safety
        
        const newH = Math.floor(totalMins / 60)
        const newM = totalMins % 60
        newStart = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
        
        let endMins = totalMins + 60 // Default 1 hour
        if (endMins >= 24 * 60) endMins = 23 * 60 + 45
        const newEH = Math.floor(endMins / 60)
        const newEM = endMins % 60
        newEnd = `${newEH.toString().padStart(2, '0')}:${newEM.toString().padStart(2, '0')}`
      }
      
      daySlots.push({ startTime: newStart, endTime: newEnd })
      return { ...prev, [day]: daySlots }
    })
  }

  const removeExtraSlot = (day, slotIdx) => {
    setSlots((prev) => {
      const daySlots = prev[day].filter((_, idx) => idx !== slotIdx)
      return { ...prev, [day]: daySlots }
    })
  }

  const copyToAll = (sourceDay) => {
    if (!confirm('Copy this day\'s schedule to all other active days?')) return
    setSlots((prev) => {
      const sourceSchedule = prev[sourceDay]
      const newSlots = { ...prev }
      DAYS.forEach((_, i) => {
        // Copy to all days, effectively setting the weekly template to match this day
        newSlots[i] = JSON.parse(JSON.stringify(sourceSchedule))
      })
      return newSlots
    })
  }

  const handleSave = async (overrideIsDefault) => {
    const finalIsDefault = typeof overrideIsDefault === 'boolean' ? overrideIsDefault : isDefault;
    setSaving(true); setSuccess(false)
    
    const slotsArr = Object.entries(slots)
      .flatMap(([day, daySlots]) => {
         return daySlots.map(s => ({ 
            dayOfWeek: parseInt(day), 
            startTime: s.startTime, 
            endTime: s.endTime 
         }))
      })

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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{fontSize: 20, fontWeight: 700}}>Availability</h1>
            <p style={{fontSize: 14, color: 'var(--clr-muted)'}}>Configure times when you are available for bookings.</p>
          </div>
          <button className="btn btn-secondary" onClick={createNewSchedule} style={{alignSelf: 'flex-start'}}>
            <i className="fa-solid fa-plus" style={{marginRight: 6}}></i> New
          </button>
        </div>
        <div className="event-list-container">
             {schedules.map(s => {
              // Group slots by day for summary
              const slotsByDay = {};
              (s.slots || []).forEach(sl => {
                if (!slotsByDay[sl.dayOfWeek]) slotsByDay[sl.dayOfWeek] = [];
                slotsByDay[sl.dayOfWeek].push(`${sl.startTime} - ${sl.endTime}`);
              });

              let summaryLines = [];
              const activeDays = Object.keys(slotsByDay).map(Number).sort();
              
              if (activeDays.length === 0) {
                summaryLines.push("Unavailable completely");
              } else {
                // Simplified display: Show first day's ranges or Mon-Fri if applicable
                const dayString = activeDays.length === 5 && activeDays[0] === 1 && activeDays[4] === 5 ? "Mon - Fri" : 
                                 activeDays.map(i => DAYS[i].substring(0,3)).join(', ');
                
                const firstDaySlots = slotsByDay[activeDays[0]];
                summaryLines.push(`${dayString}, ${firstDaySlots[0]}${firstDaySlots.length > 1 ? ` (+${firstDaySlots.length - 1} more)` : ''}`);
              }

              return (
               <div key={s.id} className="event-list-item" style={{alignItems: 'center', padding: '16px 20px', cursor: 'pointer', position: 'relative'}} onClick={() => handleSelect(s)}>
                  <div className="event-list-info" style={{ flex: 1 }}>
                     <div className="event-list-title" style={{ gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.name}</h3>
                        {s.isDefault && <span style={{ background: '#3f3f46', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 500, color: '#ededed' }}>Default</span>}
                     </div>
                     
                     <div style={{ fontSize: 13, color: 'var(--clr-muted)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {summaryLines.map((l, i) => <div key={i}>{l}</div>)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <i className="fa-solid fa-earth-americas" style={{ fontSize: 12 }}></i> {s.timezone}
                        </div>
                     </div>
                  </div>

                  <div className="event-list-actions" style={{ marginLeft: 16 }}>
                     <div style={{ position: 'relative' }}>
                        <button className="btn btn-icon btn-sm" title="Options" onClick={(e) => { e.stopPropagation(); }} style={{ padding: 6, width: 32, height: 32 }}>
                           <i className="fa-solid fa-ellipsis" style={{ fontSize: 14 }}></i>
                        </button>
                     </div>
                  </div>
               </div>
              );
           })}
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
           <div className="back-arrow" onClick={() => setSelectedId(null)}>
              <i className="fa-solid fa-arrow-left"></i>
           </div>
           <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  className="header-title-input"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--clr-text)', fontSize: 20, fontWeight: 700, outline: 'none', padding: 0 }} 
                />
                <i className="fa-solid fa-pen" style={{fontSize: 14, color: 'var(--clr-muted)', cursor: 'pointer'}} onClick={() => {
                   const newName = window.prompt("Enter new schedule name:", name);
                   if(newName && newName.trim() !== '') {
                      setName(newName.trim());
                   }
                }}></i>
             </div>
             <p style={{ fontSize: 13, color: 'var(--clr-muted)', marginTop: 4 }}>
               Setup your weekly schedule
             </p>
           </div>
         </div>
         <div className="header-right">
           <div className="toggle-container" style={{ gap: 8 }}>
             <span style={{fontSize: 13, fontWeight: 500}}>Default</span>
             <label className="switch" style={{ transform: 'scale(0.85)' }}>
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
           <div style={{ display: 'flex', gap: 8 }}>
             <button className="icon-btn-danger" onClick={handleDeleteSchedule} disabled={schedules.length === 1} title={schedules.length === 1 ? "Cannot delete the only schedule" : "Delete Schedule"}>
                <i className="fa-regular fa-trash-can"></i>
             </button>
             <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving} style={{ padding: '8px 16px' }}>
               {saving ? 'Saving...' : success ? <><i className="fa-solid fa-check"></i> Saved</> : 'Save'}
             </button>
           </div>
         </div>
       </div>
 
       {/* Two Column Layout */}
       <div className="availability-layout">
         <div className="availability-main">
           {/* Schedule Card */}
           <div className="card schedule-card">
             {DAYS.map((day, i) => (
               <div key={i} className="schedule-row" style={{ borderBottom: i < 6 ? '1px solid var(--clr-border)' : 'none', alignItems: 'flex-start' }}>
                 <div className="schedule-day" style={{ marginTop: 12 }}>
                   <label className="switch">
                     <input type="checkbox" checked={slots[i]?.length > 0} onChange={() => toggleDay(i)} />
                     <span className="slider round"></span>
                   </label>
                   <span className="day-name">{day}</span>
                 </div>
                 
                 <div className="schedule-times" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                   {slots[i]?.length > 0 ? (
                     slots[i].map((slot, sIdx) => (
                       <div key={sIdx} className="time-inputs-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div className="time-input">
                           <select value={slot.startTime} onChange={(e) => updateTime(i, sIdx, 'startTime', e.target.value)}>
                             {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                           </select>
                         </div>
                         <span style={{ color: 'var(--clr-muted)' }}>-</span>
                         <div className="time-input">
                           <select value={slot.endTime} onChange={(e) => updateTime(i, sIdx, 'endTime', e.target.value)}>
                             {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                           </select>
                         </div>
                         
                         <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                            {sIdx === 0 && (
                               <>
                                 <button className="icon-btn" onClick={() => addExtraSlot(i)} title="Add slot">
                                    <i className="fa-solid fa-plus"></i>
                                 </button>
                                 <button className="icon-btn" onClick={() => copyToAll(i)} title="Copy to all days">
                                    <i className="fa-regular fa-copy"></i>
                                 </button>
                               </>
                            )}
                            {slots[i].length > 1 && (
                               <button className="icon-btn" onClick={() => removeExtraSlot(i, sIdx)} title="Remove slot">
                                  <i className="fa-regular fa-trash-can"></i>
                               </button>
                            )}
                         </div>
                       </div>
                     ))
                   ) : (
                     <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
                        <span className="unavailable-text">Unavailable</span>
                     </div>
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
                  <div key={o.date} className="override-item">
                     <div className="override-date">{format(parseISO(o.date), 'MMMM d, yyyy')}</div>
                     <div className="override-actions">
                        <span className="override-time">
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


        </div>
      </div>

      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="override-modal-content">
             <div className="override-calendar-col">
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Select the dates to override</h3>
                <div className="booking-main calendar-col" style={{ border: 'none', background: 'transparent' }}>
                   <Calendar onChange={setODate} value={oDate} minDate={new Date()} />
                </div>
             </div>
             <div className="override-form-col">
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

                <div className="override-modal-footer">
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
