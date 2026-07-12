import { Discussion, Comment, PaginatedResponse, CaptchaResponse } from './types';

const API_USERS = '/api/users';
const API_DISCUSSIONS = '/api/discussions';
const API_COMMENTS = '/api/comments';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_USERS}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data: AuthTokens = await res.json();
  localStorage.setItem('access_token', data.access);
  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
  return data.access;
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorData) || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function requestFormData<T>(url: string, formData: FormData): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(url, { method: 'POST', headers, body: formData });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { method: 'POST', headers, body: formData });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorData) || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register(data: { username: string; email: string; password: string; password2: string }) {
    return requestJson<AuthUser>(`${API_USERS}/register/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  login(data: { username: string; password: string }) {
    return requestJson<AuthTokens>(`${API_USERS}/token/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  me() {
    return requestJson<AuthUser>(`${API_USERS}/me/`);
  },

  // Discussions
  getDiscussions(params?: { sort?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return requestJson<PaginatedResponse<Discussion>>(
      `${API_DISCUSSIONS}/?${qs}`
    );
  },
  getDiscussion(id: number) {
    return requestJson<Discussion>(`${API_DISCUSSIONS}/${id}/`);
  },
  createDiscussion(data: { title: string; description?: string }) {
    return requestJson<Discussion>(`${API_DISCUSSIONS}/create/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Comments
  getComments(discussionId: number, page?: number) {
    const query = new URLSearchParams();
    query.set('discussion', String(discussionId));
    if (page) query.set('page', String(page));
    return requestJson<PaginatedResponse<Comment>>(
      `${API_COMMENTS}/?${query.toString()}`
    );
  },
  getComment(id: number) {
    return requestJson<Comment>(`${API_COMMENTS}/${id}/`);
  },
  getReplies(parentId: number) {
    return requestJson<Comment[]>(`${API_COMMENTS}/${parentId}/replies/`);
  },
  createComment(data: FormData) {
    return requestFormData<Comment>(`${API_COMMENTS}/`, data);
  },

  // CAPTCHA
  getCaptcha() {
    return requestJson<CaptchaResponse>(`${API_COMMENTS}/captcha/`);
  },
};