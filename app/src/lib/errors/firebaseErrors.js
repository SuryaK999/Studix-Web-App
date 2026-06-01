/**
 * Firebase Error Mapper
 * Maps Firebase error codes to user-friendly messages
 */

const FIREBASE_ERROR_MAP = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/requires-recent-login': 'Please sign in again to continue.',

  // Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This resource already exists.',
  'resource-exhausted': 'Quota exceeded. Please try again later.',
  'failed-precondition': 'Operation failed. The data might have changed.',
  'aborted': 'The operation was aborted. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again.',
  'unauthenticated': 'Please sign in to continue.',
  'deadline-exceeded': 'The operation timed out. Please try again.',
  'cancelled': 'The operation was cancelled.',

  // RTDB errors  
  'PERMISSION_DENIED': 'You don\'t have permission to access this data.',

  // Storage / quota errors
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/unauthorized': 'You don\'t have permission to upload files.',
};

/**
 * Extracts a user-friendly error message from a Firebase error.
 */
export function getFirebaseErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';

  // Firebase errors have a `code` property
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    const mapped = FIREBASE_ERROR_MAP[code];
    if (mapped) return mapped;
  }

  // Fall back to message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    // Strip Firebase prefix noise like "Firebase: " or "FirebaseError: "
    return message.replace(/^Firebase:\s*|^FirebaseError:\s*/i, '');
  }

  if (typeof error === 'string') return error;

  return 'Something went wrong. Please try again.';
}

/**
 * Check if the browser is currently offline
 */
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Returns a generic offline message if the browser is offline,
 * otherwise returns the Firebase error message.
 */
export function getErrorMessage(error) {
  if (isOffline()) {
    return 'You appear to be offline. Please check your internet connection.';
  }
  return getFirebaseErrorMessage(error);
}
