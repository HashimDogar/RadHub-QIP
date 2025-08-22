import React, { useEffect, useState } from 'react'
function getCookie(name) { const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : undefined }
export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const consent = getCookie('rhqip_cookie_consent'); if (!consent) setVisible(true) }, [])
  function accept() { const oneYear = 60*60*24*365; document.cookie = `rhqip_cookie_consent=1; Max-Age=${oneYear}; Path=/; SameSite=Lax`; setVisible(false) }
  if (!visible) return null
  return (<div className="cookie-banner"><div style={{ fontWeight:600, marginBottom:6 }}>Cookies required</div><div>This app uses essential cookies (sessions). It won’t work without them.</div><div className="cookie-banner__actions"><button className="primary" onClick={accept}>Accept all</button></div></div>)
}
