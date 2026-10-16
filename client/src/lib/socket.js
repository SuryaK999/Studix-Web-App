import { io } from 'socket.io-client';
import { auth } from './firebase/config';
import { logger } from './logger';
import { getSocketUrl } from './utils';

const SOCKET_URL = getSocketUrl();

class SocketService {
  socket = null;
  connectionPromise = null;
  activeRooms = new Set();
  tokenRefreshTimer = null;

  /** Get a fresh Firebase ID token. Returns empty string if user is not signed in. */
  async getToken() {
    const user = auth.currentUser;
    if (!user) return '';
    try {
      return await user.getIdToken(/* forceRefresh */ false);
    } catch {
      return '';
    }
  }

  async connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      const token = await this.getToken();
      const user  = auth.currentUser;

      this.socket = io(SOCKET_URL, {
        auth: {
          token,
          // Pass uid + displayName as fallback for dev mode (no Firebase Admin)
          uid:         user?.uid ?? '',
          displayName: user?.displayName ?? 'Anonymous',
        },
        reconnection:             true,
        reconnectionDelay:        1000,
        reconnectionDelayMax:     5000,
        reconnectionAttempts:     10,
        timeout:                  10000,
        transports:               ['websocket', 'polling'],
      });

      return new Promise((resolve, reject) => {
        const s = this.socket;

        s.on('connect', () => {
          logger.info('🔌 Socket connected', 'SocketService');
          this.scheduleTokenRefresh();
          resolve(s);
        });

        s.on('connect_error', (err) => {
          logger.error(`Socket connection error: ${err.message}`, 'SocketService');
          if (!s.connected) {
            this.connectionPromise = null;
            reject(err);
          }
        });

        s.on('disconnect', (reason) => {
          logger.warn(`Socket disconnected: ${reason}`, 'SocketService');
          if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
          if (reason === 'io server disconnect') {
            // Server forced disconnect — reconnect with fresh token
            this.connectionPromise = null;
            s.connect();
          }
        });

        // Reconnect with a fresh token automatically
        s.io.on('reconnect_attempt', async () => {
          const freshToken = await this.getToken();
          if (s.auth && typeof s.auth === 'object') {
            (s.auth).token = freshToken;
          }
        });
      });
    })();

    return this.connectionPromise;
  }

  /** Refresh the token in the socket auth every 50 minutes (Firebase tokens last 60min) */
  scheduleTokenRefresh() {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    this.tokenRefreshTimer = setTimeout(async () => {
      const freshToken = await this.getToken();
      if (this.socket?.auth && typeof this.socket.auth === 'object') {
        (this.socket.auth).token = freshToken;
      }
      this.scheduleTokenRefresh(); // re-schedule
    }, 50 * 60 * 1000);
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
    this.activeRooms.clear();
  }

  trackRoomJoin(roomId)  { this.activeRooms.add(roomId); }
  trackRoomLeave(roomId) { this.activeRooms.delete(roomId); }
}

export const socketService = new SocketService();
