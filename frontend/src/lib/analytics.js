'use client';

import { track } from '@vercel/analytics';

export function trackEvent(name, payload = {}) {
  try {
    track(name, payload);
  } catch {
    // Analytics should never break the UI.
  }
}
