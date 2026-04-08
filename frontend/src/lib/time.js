export function getCountdownStorageKey(campaignId) {
  return `amaia-countdown-${campaignId}`;
}

export function getSignupStorageKey(campaignId) {
  return `amaia-early-access-${campaignId}`;
}

export function getVariantStorageKey(campaignId) {
  return `amaia-pricing-variant-${campaignId}`;
}

export function ensureCampaignEnd(campaignId, durationDays) {
  if (typeof window === 'undefined') return null;

  const key = getCountdownStorageKey(campaignId);
  const stored = window.localStorage.getItem(key);
  if (stored) return Number(stored);

  const endAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(key, String(endAt));
  return endAt;
}

export function readSignupState(campaignId) {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(getSignupStorageKey(campaignId)) === 'true';
}

export function writeSignupState(campaignId, value = true) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSignupStorageKey(campaignId), value ? 'true' : 'false');
}

export function readVariantState(campaignId) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(getVariantStorageKey(campaignId));
}

export function writeVariantState(campaignId, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getVariantStorageKey(campaignId), value);
}

export function getTimeRemaining(endAt) {
  const diff = Math.max(0, endAt - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    totalMs: diff,
    expired: diff <= 0,
    days,
    hours,
    minutes,
    seconds,
    under24h: diff > 0 && diff < 24 * 60 * 60 * 1000,
  };
}

export function padTime(value) {
  return String(value).padStart(2, '0');
}
