// Default to backend port 3001; override with VITE_API_URL if needed.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function getUser(gmc) {
  const r = await fetch(`${API_URL}/api/v1/user/${encodeURIComponent(gmc)}`, { credentials: 'include' })
  return r.json()
}
export async function updateUser(gmc, payload) {
  const r = await fetch(`${API_URL}/api/v1/user/${encodeURIComponent(gmc)}/update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload||{})
  })
  return r.json()
}
export async function gmcLookup(gmc){
  const r = await fetch(`${API_URL}/api/v1/gmc/lookup/${encodeURIComponent(gmc)}`, { credentials:'include' })
  return r.json()
}
export async function getRank(metric, params={}){
  const q=new URLSearchParams(params).toString()
  const r=await fetch(`${API_URL}/api/v1/rank/${metric}?${q}`,{credentials:'include'})
  return r.json()
}
export async function radUnlock(code){
  const r = await fetch(`${API_URL}/api/v1/rad/unlock`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ code }) })
  return r.json()
}
export async function radSession(){
  const r = await fetch(`${API_URL}/api/v1/rad/session`, { credentials:'include' })
  return r.json()
}
export async function vet(payload){
  const r = await fetch(`${API_URL}/api/v1/vet`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload||{}) })
  return r.json()
}
export async function downloadRawCsv(){
  return `${API_URL}/api/v1/audit/raw-csv`
}
