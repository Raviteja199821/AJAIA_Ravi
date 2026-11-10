const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const SESSION_KEY = "session";

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode, blocked): session lives only in memory */
  }
}

function errorDetail(data, status) {
  const detail = data && data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return `Request failed (${status})`;
}

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error("Can't reach the server. It may be waking up — try again in a few seconds.");
  }

  if (res.status === 401 && path !== "/auth/login") {
    setSession(null);
    window.location.hash = "#/login";
  }
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(errorDetail(data, res.status));
  return data; // 200 and 201 (e.g. re-share vs new share) are both success
}

const json = (method, body) => ({ method, body });

export const api = {
  health: () => request("/health"),
  login: (username, password) => request("/auth/login", json("POST", { username, password })),
  users: () => request("/users"),
  listDocs: () => request("/documents"),
  createDoc: (title) => request("/documents", json("POST", { title })),
  getDoc: (id) => request(`/documents/${id}`),
  updateDoc: (id, changes) => request(`/documents/${id}`, json("PATCH", changes)),
  deleteDoc: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  importDoc: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/documents/import", { method: "POST", form });
  },
  listShares: (id) => request(`/documents/${id}/shares`),
  share: (id, username, role) =>
    request(`/documents/${id}/shares`, json("POST", { username, role })),
  unshare: (id, username) =>
    request(`/documents/${id}/shares/${encodeURIComponent(username)}`, { method: "DELETE" }),
};
