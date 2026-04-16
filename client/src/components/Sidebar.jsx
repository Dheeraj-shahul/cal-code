import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const links = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/event-types',
    label: 'Event Types',
    icon: (
     <i class="fa-solid fa-link"></i>
    ),
  },
  {
    to: '/availability',
    label: 'Availability',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    to: '/bookings',
    label: 'Bookings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const link = `${window.location.origin}/dheeraj-shahaul-syed`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 24px'}}>
        <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-avatar" style={{width: 24, height: 24, borderRadius: '50%', background: '#22c55e', color: '#111', fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>DS</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--clr-text)' }}>Dheeraj Shahaul Syed</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', paddingBottom: 16 }}>
        <a href="/dheeraj-shahaul-syed" className="sidebar-link" style={{margin: '0 8px 4px', whiteSpace: 'nowrap'}} target="_blank" rel="noopener noreferrer">
           <i className="fa-solid fa-arrow-up-right-from-square" style={{fontSize: 13}}></i> View public page
        </a>
        <button className="sidebar-link" onClick={handleCopyLink} style={{width: 'calc(100% - 16px)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap'}}>
           {copied ? <i className="fa-solid fa-check" style={{fontSize: 13, color: 'var(--clr-success)'}}></i> : <i className="fa-regular fa-copy" style={{fontSize: 13}}></i>} 
           {copied ? <span style={{color: 'var(--clr-success)'}}>Copied!</span> : 'Copy public page link'}
        </button>
        <div style={{padding: '16px 20px 0', fontSize: 10, color: '#52525b', alignSelf: 'flex-start'}}>
           © 2026 CalClone, Inc. v.4.4.0
        </div>
      </div>
    </aside>
  )
}
