const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function getScanTypes() {
  const r = await fetch(`${API_URL}/api/v1/scan-types`, { credentials: 'include' });
  return r.json();
}

export async function getUser(gmc) {
  const r = await fetch(`${API_URL}/api/v1/user/${encodeURIComponent(gmc)}`, { credentials: 'include' });
  return r.json();
}

export async function radUnlock(code) {
  const r = await fetch(`${API_URL}/api/v1/rad/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code })
  });
  return r.json();
}

export async function radSession() {
  const r = await fetch(`${API_URL}/api/v1/rad/session`, { credentials: 'include' });
  return r.json();
}

export async function vet(payload) {
  const r = await fetch(`${API_URL}/api/v1/vet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return r.json();
}

export async function updateUser(gmc, payload) {
  const r = await fetch(`${API_URL}/api/v1/user/${encodeURIComponent(gmc)}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  return r.json();
}

// eLearning APIs
export async function getModules() {
  const r = await fetch(`${API_URL}/api/v1/elearn/modules`, { credentials: 'include' });
  return r.json();
}
export async function getModule(id) {
  const r = await fetch(`${API_URL}/api/v1/elearn/module/${encodeURIComponent(id)}`, { credentials: 'include' });
  return r.json();
}
export async function submitModule(gmc, module_id, answers) {
  const r = await fetch(`${API_URL}/api/v1/elearn/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ gmc, module_id, answers })
  });
  return r.json();
}

// New endpoints
export async function gmcLookup(gmc){
  const r = await fetch(`${API_URL}/api/v1/gmc/lookup/${encodeURIComponent(gmc)}`, { credentials:'include' });
  return r.json();
}
export async function getRank(metric, params={}){
  const q=new URLSearchParams(params).toString();
  const r=await fetch(`${API_URL}/api/v1/rank/${metric}?${q}`,{credentials:'include'});
  return r.json();
}
