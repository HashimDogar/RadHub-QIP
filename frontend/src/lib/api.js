// API calls go through Vite proxy, so we use relative URLs
// This way everything stays on http://localhost:5173 and cookies are same-origin

export async function vet(payload) {
  const r = await fetch(`/api/v1/vet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  return r.json();
}

export async function getUser(gmc) {
  const r = await fetch(`/api/v1/user/${encodeURIComponent(gmc)}`, { credentials: 'include' });
  return r.json();
}

export async function updateUser(gmc, payload) {
  const r = await fetch(`/api/v1/user/${encodeURIComponent(gmc)}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  return r.json();
}

export async function deleteUser(gmc) {
  const r = await fetch(`/api/v1/user/${encodeURIComponent(gmc)}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  return r.json();
}

export async function getUsers() {
  const r = await fetch(`/api/v1/users`, { credentials: 'include' });
  return r.json();
}

export async function getRadiologists() {
  const r = await fetch(`/api/v1/radiologists`, { credentials: 'include' });
  return r.json();
}

export async function gmcLookup(gmc) {
  const r = await fetch(`/api/v1/gmc/lookup/${encodeURIComponent(gmc)}`, { credentials: 'include' });
  return r.json();
}

export async function getRank(metric, params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/v1/rank/${metric}?${q}`, { credentials: 'include' });
  return r.json();
}

export async function radUnlock(code, gmc) {
  const r = await fetch(`/api/v1/rad/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code, gmc })
  });
  return r.json();
}

export async function radSession() {
  const r = await fetch(`/api/v1/rad/session`, { credentials: 'include' });
  return r.json();
}

export async function radLogout() {
  const r = await fetch(`/api/v1/rad/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return r.json();
}

export async function getRadHistory(limit = 15) {
  const r = await fetch(`/api/v1/rad/history?limit=${encodeURIComponent(limit)}`, { credentials: 'include' });
  return r.json();
}

export function downloadRawCsv() {
  return `/api/v1/audit/raw-csv`;
}
