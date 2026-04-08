const TABLE_NAME = process.env.AMAIA_SALES_SUPABASE_TABLE ?? 'amaia_sales_leads';
const EVENTS_TABLE_NAME = process.env.AMAIA_SALES_SUPABASE_EVENTS_TABLE ?? 'amaia_sales_events';

async function request(path, init = {}) {
  const baseUrl = process.env.AMAIA_SALES_SUPABASE_URL;
  const apiKey = process.env.AMAIA_SALES_SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !apiKey) throw new Error('Supabase CRM adapter is not configured.');

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Supabase CRM request failed: ${await response.text()}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
}

export const supabaseAdapter = {
  name: 'supabase',
  async listLeads() {
    return (await request(`${TABLE_NAME}?select=*&order=updatedAt.desc`)) ?? [];
  },
  async getLeadByConversation(conversationId) {
    const rows =
      (await request(`${TABLE_NAME}?select=*&conversationId=eq.${encodeURIComponent(conversationId)}&limit=1`)) ?? [];
    return rows[0] ?? null;
  },
  async saveLead(lead) {
    const rows =
      (await request(TABLE_NAME, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(lead),
      })) ?? [];
    return rows[0] ?? lead;
  },
  async logEvent(event) {
    await request(EVENTS_TABLE_NAME, { method: 'POST', body: JSON.stringify(event) });
    return event;
  },
  async listEvents() {
    return (await request(`${EVENTS_TABLE_NAME}?select=*&order=timestamp.desc`)) ?? [];
  },
};
