const BASE_ID = process.env.AMAIA_SALES_AIRTABLE_BASE_ID;
const API_KEY = process.env.AMAIA_SALES_AIRTABLE_API_KEY;
const LEADS_TABLE = process.env.AMAIA_SALES_AIRTABLE_LEADS_TABLE ?? 'Leads';
const EVENTS_TABLE = process.env.AMAIA_SALES_AIRTABLE_EVENTS_TABLE ?? 'Events';

async function airtableRequest(table, init = {}, query = '') {
  if (!BASE_ID || !API_KEY) throw new Error('Airtable CRM adapter is not configured.');

  const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${query}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Airtable CRM request failed: ${await response.text()}`);
  return response.json();
}

function toRecord(lead) {
  return {
    fields: {
      leadId: lead.id,
      conversationId: lead.conversationId,
      name: lead.name ?? '',
      email: lead.email ?? '',
      source: lead.source ?? '',
      stage: lead.stage ?? '',
      segment: lead.segment ?? '',
      leadScore: lead.leadScore ?? 0,
      intentLevel: lead.intentLevel ?? '',
      recommendedNextAction: lead.recommendedNextAction ?? '',
      objections: JSON.stringify(lead.objections ?? []),
      profile: JSON.stringify(lead.profile ?? {}),
      ctaHistory: JSON.stringify(lead.ctaHistory ?? []),
      conversation: JSON.stringify(lead.conversation ?? []),
      escalation: JSON.stringify(lead.escalation ?? null),
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    },
  };
}

function fromRecord(record) {
  const fields = record.fields ?? {};
  return {
    id: fields.leadId,
    conversationId: fields.conversationId,
    name: fields.name,
    email: fields.email,
    source: fields.source,
    stage: fields.stage,
    segment: fields.segment,
    leadScore: fields.leadScore,
    intentLevel: fields.intentLevel,
    recommendedNextAction: fields.recommendedNextAction,
    objections: JSON.parse(fields.objections || '[]'),
    profile: JSON.parse(fields.profile || '{}'),
    ctaHistory: JSON.parse(fields.ctaHistory || '[]'),
    conversation: JSON.parse(fields.conversation || '[]'),
    escalation: JSON.parse(fields.escalation || 'null'),
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

export const airtableAdapter = {
  name: 'airtable',
  async listLeads() {
    const data = await airtableRequest(LEADS_TABLE);
    return (data.records ?? []).map(fromRecord);
  },
  async getLeadByConversation(conversationId) {
    const filter = `?filterByFormula=${encodeURIComponent(`{conversationId}='${conversationId}'`)}`;
    const data = await airtableRequest(LEADS_TABLE, {}, filter);
    return data.records?.[0] ? fromRecord(data.records[0]) : null;
  },
  async saveLead(lead) {
    await airtableRequest(LEADS_TABLE, {
      method: 'POST',
      body: JSON.stringify({ records: [toRecord(lead)] }),
    });
    return lead;
  },
  async logEvent(event) {
    await airtableRequest(EVENTS_TABLE, {
      method: 'POST',
      body: JSON.stringify({
        records: [
          {
            fields: {
              eventId: event.id,
              leadId: event.leadId ?? '',
              type: event.type,
              source: event.source ?? '',
              payload: JSON.stringify(event.payload ?? {}),
              timestamp: event.timestamp,
            },
          },
        ],
      }),
    });
    return event;
  },
  async listEvents() {
    const data = await airtableRequest(EVENTS_TABLE);
    return (data.records ?? []).map((record) => ({
      id: record.fields?.eventId,
      leadId: record.fields?.leadId,
      type: record.fields?.type,
      source: record.fields?.source,
      payload: JSON.parse(record.fields?.payload || '{}'),
      timestamp: record.fields?.timestamp,
    }));
  },
};
