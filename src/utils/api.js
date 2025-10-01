const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/$/, '');

async function parseJsonSafe(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const snippet = text.slice(0, 200);
    const error = new Error(`Expected JSON, got: ${snippet}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  const defaultOpts = { credentials: 'include' };
  const opts = { ...defaultOpts, ...options };
  if (opts.body && !opts.headers?.['Content-Type']) {
    opts.headers = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
    if (typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
  }
  const res = await fetch(url, opts);
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) {
    const err = new Error(data?.message || `Request failed with ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
  base: API_BASE,
};


