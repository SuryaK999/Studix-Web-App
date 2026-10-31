import { auth } from '@/lib/firebase/config';
import { getServerUrl } from '@/lib/utils';

const API_URL = getServerUrl();
const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const { method = 'GET', body, timeout = DEFAULT_TIMEOUT_MS, headers = {}, signal } = options;

  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
    } catch {
      // Proceed without token if refresh fails
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = text;
      }
      throw new ApiError(errorData?.error ?? `API error ${res.status}: ${res.statusText}`, res.status, errorData);
    }

    if (res.status === 204) {
      return null;
    }

    const text = await res.text();
    if (!text || text.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export const get = (path, options) => request(path, { method: 'GET', ...options });
export const post = (path, body, options) => request(path, { method: 'POST', body, ...options });
export const put = (path, body, options) => request(path, { method: 'PUT', body, ...options });
export const del = (path, options) => request(path, { method: 'DELETE', ...options });

export async function fetchUserProfile() {
  return get('/api/users/profile');
}

export async function updateUserProfile(data) {
  return put('/api/users/profile', data);
}

export async function checkUsernameAvailability(username) {
  return get(`/api/users/username-check/${encodeURIComponent(username)}`);
}

export async function fetchMessages(roomId, before) {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return get(`/api/messages/${encodeURIComponent(roomId)}${query}`);
}

export async function fetchNote(roomId) {
  return get(`/api/notes/${encodeURIComponent(roomId)}`);
}

export async function fetchUserRooms() {
  return get('/api/rooms');
}

export async function fetchExploreRooms() {
  return get('/api/rooms/explore');
}

export async function fetchRoomData(roomId) {
  return get(`/api/rooms/${encodeURIComponent(roomId)}`);
}

export async function createRoom(data) {
  return post('/api/rooms', data);
}

export async function joinRoom(roomId) {
  return post(`/api/rooms/${encodeURIComponent(roomId)}/join`, {});
}

export async function fetchRoomPresence(roomId) {
  return get(`/api/rooms/${encodeURIComponent(roomId)}/presence`);
}

export async function leaveRoom(roomId) {
  return post(`/api/rooms/${encodeURIComponent(roomId)}/leave`, {});
}

export async function deleteMessageApi(roomId, messageId) {
  return del(`/api/messages/${encodeURIComponent(roomId)}/${encodeURIComponent(messageId)}`);
}
