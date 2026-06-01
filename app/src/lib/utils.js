import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getNetworkUrl(envUrl) {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      try {
        const urlObj = new URL(envUrl);
        if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
          urlObj.hostname = hostname;
        }
        return urlObj.toString().replace(/\/$/, '');
      } catch (e) {
        return envUrl.replace(/\/$/, '');
      }
    }
  }
  return envUrl.replace(/\/$/, '');
}

export function getServerUrl() {
  return getNetworkUrl(import.meta.env.VITE_API_URL || 'http://localhost:4000');
}

export function getSocketUrl() {
  return getNetworkUrl(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
}
