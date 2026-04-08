import crypto from 'node:crypto';

import { getCrmAdapter } from '@/src/sales/crm';
import { buildFollowupSequences } from '@/src/sales/services/followup-service';

function nowIso() {
  return new Date().toISOString();
}

export async function getOrCreateLead(conversationId, source = 'website_chat') {
  const adapter = getCrmAdapter();
  const existing = await adapter.getLeadByConversation(conversationId);

  if (existing) return existing;

  const lead = {
    id: `lead_${crypto.randomUUID()}`,
    conversationId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source,
    stage: 'new',
    segment: 'retail',
    leadScore: 0,
    intentLevel: 'cold',
    recommendedNextAction: 'join_waitlist',
    profile: {
      marketPreference: '',
      assets: [],
      tradingFrequency: '',
      currentTools: [],
      struggles: [],
      desiredOutcome: [],
    },
    objections: [],
    ctaHistory: [],
    conversation: [],
    escalation: null,
  };

  await adapter.saveLead(lead);
  return lead;
}

export async function getLeadByConversation(conversationId) {
  return getCrmAdapter().getLeadByConversation(conversationId);
}

export async function saveLead(lead) {
  const adapter = getCrmAdapter();
  const enrichedLead = { ...lead, updatedAt: nowIso() };
  await adapter.saveLead(enrichedLead);
  return enrichedLead;
}

export async function appendConversation(lead, entry) {
  return saveLead({
    ...lead,
    conversation: [...(lead.conversation ?? []), entry],
  });
}

export async function logSalesEvent(event) {
  return getCrmAdapter().logEvent({
    id: `evt_${crypto.randomUUID()}`,
    timestamp: nowIso(),
    ...event,
  });
}

export async function listLeads() {
  return getCrmAdapter().listLeads();
}

export async function listEvents() {
  return getCrmAdapter().listEvents();
}

export async function getAdminSummary() {
  const leads = await listLeads();
  const events = await listEvents();

  const stageCounts = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] ?? 0) + 1;
    return acc;
  }, {});

  const objectionCounts = leads.flatMap((lead) => lead.objections ?? []).reduce((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});

  const ctaCounts = leads.flatMap((lead) => lead.ctaHistory ?? []).reduce((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  const qualified = leads.filter((lead) => lead.leadScore >= 45).length;
  const converted = leads.filter((lead) =>
    (lead.ctaHistory ?? []).some((item) => ['start_trial', 'book_demo'].includes(item.type)),
  ).length;

  return {
    leads,
    events,
    metrics: {
      totalLeads: leads.length,
      qualified,
      hot: leads.filter((lead) => lead.intentLevel === 'hot').length,
      conversionRate: qualified ? Math.round((converted / qualified) * 100) : 0,
      topObjections: Object.entries(objectionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count })),
      ctaPerformance: Object.entries(ctaCounts).map(([label, count]) => ({ label, count })),
      stageCounts,
    },
    followups: buildFollowupSequences(leads[0] ?? { recommendedNextAction: 'join_waitlist' }),
  };
}
