
import { auth } from '@/lib/firebase/config';
import { getServerUrl } from '@/lib/utils';

const API_URL = getServerUrl();

async function get(path) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function post(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function put(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

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
