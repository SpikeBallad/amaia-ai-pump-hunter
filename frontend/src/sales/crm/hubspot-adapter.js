const HUBSPOT_TOKEN = process.env.AMAIA_SALES_HUBSPOT_ACCESS_TOKEN;

async function hubspotRequest(path, init = {}) {
  if (!HUBSPOT_TOKEN) throw new Error('HubSpot CRM adapter is not configured.');

  const response = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`HubSpot CRM request failed: ${await response.text()}`);
  return response.json();
}

function toHubspotProperties(lead) {
  return {
    email: lead.email ?? `${lead.conversationId}@amaia.local`,
    firstname: lead.name ?? 'AMAIA',
    amaia_lead_score: String(lead.leadScore ?? 0),
    amaia_segment: lead.segment ?? '',
    amaia_intent_level: lead.intentLevel ?? '',
    amaia_next_action: lead.recommendedNextAction ?? '',
    amaia_source: lead.source ?? '',
    amaia_stage: lead.stage ?? '',
    amaia_conversation_id: lead.conversationId,
    amaia_objections: JSON.stringify(lead.objections ?? []),
    amaia_profile: JSON.stringify(lead.profile ?? {}),
    amaia_last_conversation: JSON.stringify((lead.conversation ?? []).slice(-6)),
  };
}

export const hubspotAdapter = {
  name: 'hubspot',
  async listLeads() {
    const data = await hubspotRequest('/crm/v3/objects/contacts?limit=100&properties=email,firstname,amaia_lead_score,amaia_segment,amaia_intent_level,amaia_next_action,amaia_source,amaia_stage,amaia_conversation_id,amaia_objections,amaia_profile');
    return (data.results ?? []).map((item) => ({
      id: item.id,
      conversationId: item.properties?.amaia_conversation_id,
      name: item.properties?.firstname,
      email: item.properties?.email,
      source: item.properties?.amaia_source,
      stage: item.properties?.amaia_stage,
      segment: item.properties?.amaia_segment,
      leadScore: Number(item.properties?.amaia_lead_score || 0),
      intentLevel: item.properties?.amaia_intent_level,
      recommendedNextAction: item.properties?.amaia_next_action,
      objections: JSON.parse(item.properties?.amaia_objections || '[]'),
      profile: JSON.parse(item.properties?.amaia_profile || '{}'),
      ctaHistory: [],
      conversation: [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },
  async getLeadByConversation(conversationId) {
    const data = await hubspotRequest('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'amaia_conversation_id', operator: 'EQ', value: conversationId }] }],
        properties: [
          'email',
          'firstname',
          'amaia_lead_score',
          'amaia_segment',
          'amaia_intent_level',
          'amaia_next_action',
          'amaia_source',
          'amaia_stage',
          'amaia_conversation_id',
          'amaia_objections',
          'amaia_profile',
        ],
        limit: 1,
      }),
    });

    const item = data.results?.[0];
    if (!item) return null;

    return {
      id: item.id,
      conversationId: item.properties?.amaia_conversation_id,
      name: item.properties?.firstname,
      email: item.properties?.email,
      source: item.properties?.amaia_source,
      stage: item.properties?.amaia_stage,
      segment: item.properties?.amaia_segment,
      leadScore: Number(item.properties?.amaia_lead_score || 0),
      intentLevel: item.properties?.amaia_intent_level,
      recommendedNextAction: item.properties?.amaia_next_action,
      objections: JSON.parse(item.properties?.amaia_objections || '[]'),
      profile: JSON.parse(item.properties?.amaia_profile || '{}'),
      ctaHistory: [],
      conversation: [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  },
  async saveLead(lead) {
    const existing = await this.getLeadByConversation(lead.conversationId);

    if (existing?.id) {
      await hubspotRequest(`/crm/v3/objects/contacts/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: toHubspotProperties(lead) }),
      });
      return { ...existing, ...lead };
    }

    const data = await hubspotRequest('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify({ properties: toHubspotProperties(lead) }),
    });

    return { ...lead, id: data.id };
  },
  async logEvent(event) {
    return event;
  },
  async listEvents() {
    return [];
  },
};
