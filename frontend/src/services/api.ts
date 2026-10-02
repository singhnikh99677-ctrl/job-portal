const host = window.location.hostname;
const localPort = /^517\d*$/.test(window.location.port);
const directGateway = host === 'localhost' || host === '127.0.0.1' || localPort;
const defaultApiUrl = directGateway
  ? `${window.location.protocol}//${host}:4000/api`
  : `${window.location.origin}/api`;
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message?: string }).message)
      : `Request failed: ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return (payload ?? (undefined as unknown as T)) as T;
}
