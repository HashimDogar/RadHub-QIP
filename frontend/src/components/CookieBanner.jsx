
import React, { useEffect, useState } from 'react'

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : undefined
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getCookie('rhqip_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `rhqip_cookie_consent=1; Max-Age=${oneYear}; Path=/; SameSite=Lax`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position:'fixed', left:12, right:12, bottom:12, zIndex:1000,
      background:'#111827', color:'white', padding:'14px 16px',
      borderRadius:12, boxShadow:'0 6px 18px rgba(0,0,0,0.25)',
      display:'flex', gap:16, alignItems:'center', flexWrap:'wrap'
    }}>
      <div style={{ flex:1, minWidth: 240 }}>
        <strong>Cookies required.</strong> This app uses essential cookies (sessions). It won’t work without them.
      </div>
      <button onClick={accept} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #374151', background:'#2563eb', color:'white', cursor:'pointer' }}>
        Accept all
      </button>
    </div>
  )
}
