// Infrastructure: the single HTTP gateway used by every Entity class.
// Adds the per-session CSRF token to non-GET requests and normalises errors.
let csrfToken = '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function setCsrfToken(token) { csrfToken = token || ''; }

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  let response;
  try {
    response = await fetch(path, {
      method, headers, credentials: 'same-origin',
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Run "python server.py" and open http://127.0.0.1:8000', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `Request failed (${response.status}).`, response.status);
  return data;
}

export const q = (value) => encodeURIComponent(value);
