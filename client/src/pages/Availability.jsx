import { useEffect, useState } from 'react'
import { getAvailability, updateAvailability } from '../api/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney', 'Asia/Dubai', 'UTC',
]

export default function Availability() {
  const [availability, setAvailability] = useState(null)
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await getAvailability()
        setAvailability(res.data)
        setTimezone(res.data.timezone)
        const s = {}
        res.data.slots.forEach((sl) => {
          s[sl.dayOfWeek] = { enabled: true, startTime: sl.startTime, endTime: sl.endTime }
        })
        DAYS.forEach((_, i) => { if (!s[i]) s[i] = { enabled: false, startTime: '09:00', endTime: '17:00' } })
        setSlots(s)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const toggleDay = (day) => {
    setSlots((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  }

  const updateTime = (day, field, value) => {
    setSlots((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const handleSave = async () => {
    setSaving(true); setSuccess(false)
    const slotsArr = Object.entries(slots)
      .filter(([, s]) => s.enabled)
      .map(([day, s]) => ({ dayOfWeek: parseInt(day), startTime: s.startTime, endTime: s.endTime }))
    try {
      await updateAvailability({ timezone, slots: slotsArr })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="spinner">Loading...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Availability</h1>
          <p>Set the days and times you are available for meetings</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : success ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Timezone</label>
          <select className="form-control" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Weekly Hours</h2>
        <div className="day-toggles">
          {DAYS.map((day, i) => (
            <div key={i} className={`day-toggle${slots[i]?.enabled ? ' active' : ''}`}>
              <label>
                <input type="checkbox" checked={slots[i]?.enabled || false} onChange={() => toggleDay(i)} style={{ marginRight: 8 }} />
                {day}
              </label>
              {slots[i]?.enabled && (
                <div className="day-time-inputs">
                  <input
                    type="time"
                    value={slots[i].startTime}
                    onChange={(e) => updateTime(i, 'startTime', e.target.value)}
                  />
                  <span>–</span>
                  <input
                    type="time"
                    value={slots[i].endTime}
                    onChange={(e) => updateTime(i, 'endTime', e.target.value)}
                  />
                </div>
              )}
              {!slots[i]?.enabled && (
                <span style={{ fontSize: 13, color: 'var(--clr-muted)' }}>Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
