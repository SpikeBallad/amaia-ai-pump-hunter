'use client';

export function trackEvent(name, payload = {}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('amaia-analytics', {
          detail: {
            name,
            payload,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  } catch {
    // Analytics should never break the UI.
  }
}
