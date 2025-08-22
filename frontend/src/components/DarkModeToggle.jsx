import React, { useEffect, useState } from 'react'
export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('rhqip_theme')
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = saved ? saved === 'dark' : prefers
    setDark(useDark)
    document.body.classList.toggle('dark', useDark)
  }, [])
  function onToggle() {
    const next = !dark
    setDark(next)
    document.body.classList.toggle('dark', next)
    localStorage.setItem('rhqip_theme', next ? 'dark' : 'light')
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:12, color:'var(--muted)' }}>Light</span>
      <button onClick={onToggle} aria-label="Toggle dark mode"
        style={{ width:56, height:28, borderRadius:9999, border:'1px solid var(--border)', background: dark ? 'var(--primary)' : 'var(--card)', position:'relative', cursor:'pointer' }}>
        <span style={{ position:'absolute', top:2, left: dark ? 30 : 2, width:24, height:24, borderRadius:'9999px', background: dark ? '#0b1220' : '#e5e7eb' }} />
      </button>
      <span style={{ fontSize:12, color:'var(--muted)' }}>Dark</span>
    </div>
  )
}
