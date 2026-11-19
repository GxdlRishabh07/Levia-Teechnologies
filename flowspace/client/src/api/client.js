let realtimeSocketId = null;

export function setRealtimeSocketId(socketId) {
  realtimeSocketId = socketId || null;
}

export function getRealtimeSocketId() {
  return realtimeSocketId;
}

export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options;
  const upperMethod = method.toUpperCase();
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const finalHeaders = {
    ...headers,
  };

  if (!isFormData && body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (realtimeSocketId && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(upperMethod)) {
    finalHeaders['X-Socket-Id'] = realtimeSocketId;
  }

  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    method: upperMethod,
    credentials: 'include',
    headers: finalHeaders,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.code = payload?.error?.code || 'API_ERROR';
    error.status = response.status;
    error.details = payload?.error?.details || null;
    throw error;
  }

  return payload;
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
  upload: (path, formData) => apiFetch(path, { method: 'POST', body: formData }),
};
