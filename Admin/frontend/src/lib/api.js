const BASE = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:8000";

function getHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet(path, token, params) {
  const url = new URL(`${BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: getHeaders(token) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export async function apiPatch(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
