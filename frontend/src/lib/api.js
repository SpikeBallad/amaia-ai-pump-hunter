import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:8001';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

function resolveWebSocketUrl(apiUrl) {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function resolveConfiguredWebSocketUrl() {
  const configuredValue = process.env.NEXT_PUBLIC_WS_URL;

  if (configuredValue === undefined) {
    return resolveWebSocketUrl(API_URL);
  }

  if (!configuredValue || configuredValue.toLowerCase() === 'disabled') {
    return null;
  }

  return configuredValue;
}

export const WS_URL = resolveConfiguredWebSocketUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export async function fetchHealth() {
  const { data } = await api.get('/api/health');
  return data;
}

export async function fetchOverview({ exchange = 'auto', marketType = 'spot', limit = 10, timeframe = '4H' } = {}) {
  const { data } = await api.get('/overview', {
    params: { exchange, market_type: marketType, limit, timeframe },
  });
  return data;
}

export async function fetchCacheStats() {
  const { data } = await api.get('/cache/stats');
  return data;
}

export async function invalidateCache() {
  const { data } = await api.post('/cache/invalidate');
  return data;
}
