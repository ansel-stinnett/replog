// Thin wrapper around fetch. Every call sends the session cookie and turns
// non-2xx responses into an ApiError carrying the server's message and
// per-field errors, so pages can show them next to the right input.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.fields = body?.fields || {};
  }
}

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  logout: () => request('POST', '/auth/logout'),
  updateProfile: (body) => request('PATCH', '/auth/me', body),

  listWorkouts: () => request('GET', '/workouts'),
  getWorkout: (id) => request('GET', `/workouts/${id}`),
  createWorkout: (body) => request('POST', '/workouts', body),
  updateWorkout: (id, body) => request('PUT', `/workouts/${id}`, body),
  deleteWorkout: (id) => request('DELETE', `/workouts/${id}`),

  listExercises: () => request('GET', '/exercises'),
  progress: (id) => request('GET', `/exercises/${id}/progress`),
};
