import { ProblemDetails } from '../types/api';

export class ApiError extends Error {
  public status: number;
  public title?: string;
  public detail?: string;
  public code?: string;
  public fieldErrors?: Array<{ field: string; message: string }>;
  public conflictDates?: string[];
  public raw: unknown;

  constructor(status: number, problem?: ProblemDetails) {
    const message = problem?.detail || problem?.title || `HTTP error ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.title = problem?.title;
    this.detail = problem?.detail;
    this.code = problem?.code;
    this.fieldErrors = problem?.fieldErrors;
    this.conflictDates = problem?.conflictDates;
    this.raw = problem;
  }
}

let inMemoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export const setOnUnauthorized = (callback: (() => void) | null) => {
  onUnauthorizedCallback = callback;
};

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { idempotencyKey, params, headers: customHeaders, ...fetchOptions } = options;

  let url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json, application/problem+json',
    ...(customHeaders as Record<string, string>),
  };

  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const requestToken = inMemoryToken;
  if (requestToken) {
    headers['Authorization'] = `Bearer ${requestToken}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && endpoint !== '/auth/login') {
    if (inMemoryToken === requestToken) {
      setAuthToken(null);
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    throw new ApiError(401, {
      title: 'Сессия истекла',
      detail: 'Пожалуйста, выполните вход повторно.',
      code: 'UNAUTHORIZED',
    });
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let problem: ProblemDetails | undefined;
    if (contentType.includes('application/problem+json') || contentType.includes('application/json')) {
      try {
        problem = await response.json();
      } catch {
        // Failed to parse JSON error
      }
    }
    throw new ApiError(response.status, problem);
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export async function downloadFile(endpoint: string, params?: Record<string, string>): Promise<Blob> {
  let url = `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val) searchParams.append(key, val);
    }
    const q = searchParams.toString();
    if (q) url += `?${q}`;
  }

  const headers: Record<string, string> = {};
  const requestToken = inMemoryToken;
  if (requestToken) {
    headers['Authorization'] = `Bearer ${requestToken}`;
  }

  const response = await fetch(url, { headers });
  if (response.status === 401) {
    if (inMemoryToken === requestToken) {
      setAuthToken(null);
      if (onUnauthorizedCallback) onUnauthorizedCallback();
    }
    throw new ApiError(401, { title: 'Сессия истекла' });
  }
  if (!response.ok) {
    throw new ApiError(response.status, { title: 'Ошибка загрузки файла' });
  }

  return await response.blob();
}

export const apiClient = {
  get: <T>(url: string, params?: Record<string, string | number | boolean | null | undefined>) =>
    request<T>(url, { method: 'GET', params }),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { method: 'DELETE', ...options }),
};
