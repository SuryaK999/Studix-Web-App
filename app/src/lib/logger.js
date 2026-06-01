/**
 * Structured dev-only logger.
 * All output is suppressed in production builds.
 */

const IS_DEV = import.meta.env.DEV;

// Active listener counter (dev only)
let _activeListeners = 0;

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
}

function formatCtx(context) {
  return context ? `[${context}]` : '';
}

export const logger = {
  info(message, context, data) {
    if (!IS_DEV) return;
    console.log(
      `%c${timestamp()} %cINFO %c${formatCtx(context)}%c ${message}`,
      'color:#888', 'color:#3b82f6;font-weight:bold', 'color:#8b5cf6', 'color:inherit',
      ...(data !== undefined ? [data] : [])
    );
  },

  warn(message, context, data) {
    if (!IS_DEV) return;
    console.warn(
      `${timestamp()} WARN ${formatCtx(context)} ${message}`,
      ...(data !== undefined ? [data] : [])
    );
  },

  error(message, context, data) {
    // Errors log in all environments
    console.error(
      `${timestamp()} ERROR ${formatCtx(context)} ${message}`,
      ...(data !== undefined ? [data] : [])
    );
  },

  /** Track a Firestore/RTDB listener. Returns a cleanup function. */
  trackListener(name) {
    if (!IS_DEV) return () => {};
    _activeListeners++;
    console.log(
      `%c${timestamp()} %cLISTENER+ %c${name} %c(active: ${_activeListeners})`,
      'color:#888', 'color:#10b981;font-weight:bold', 'color:#8b5cf6', 'color:#888'
    );
    return () => {
      _activeListeners--;
      console.log(
        `%c${timestamp()} %cLISTENER- %c${name} %c(active: ${_activeListeners})`,
        'color:#888', 'color:#ef4444;font-weight:bold', 'color:#8b5cf6', 'color:#888'
      );
    };
  },

  /** Get current active listener count (dev only) */
  getActiveListenerCount() {
    return _activeListeners;
  },
};
