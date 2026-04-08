import { sampleLeads } from '@/src/sales/crm/sample-data';

function getStore() {
  if (!globalThis.__amaiaSalesStore) {
    globalThis.__amaiaSalesStore = {
      leads: [...sampleLeads],
      events: [],
    };
  }

  return globalThis.__amaiaSalesStore;
}

function mergeLead(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    profile: {
      ...(existing?.profile ?? {}),
      ...(incoming?.profile ?? {}),
    },
    objections: [...new Set([...(existing?.objections ?? []), ...(incoming?.objections ?? [])])],
    ctaHistory: incoming?.ctaHistory ?? existing?.ctaHistory ?? [],
    conversation: incoming?.conversation ?? existing?.conversation ?? [],
  };
}

export const memoryAdapter = {
  name: 'memory',
  async listLeads() {
    return [...getStore().leads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },
  async getLeadByConversation(conversationId) {
    return getStore().leads.find((lead) => lead.conversationId === conversationId) ?? null;
  },
  async saveLead(lead) {
    const store = getStore();
    const index = store.leads.findIndex((item) => item.id === lead.id || item.conversationId === lead.conversationId);

    if (index >= 0) {
      store.leads[index] = mergeLead(store.leads[index], lead);
      return store.leads[index];
    }

    store.leads.unshift(lead);
    return lead;
  },
  async logEvent(event) {
    getStore().events.unshift(event);
    return event;
  },
  async listEvents() {
    return [...getStore().events];
  },
};
