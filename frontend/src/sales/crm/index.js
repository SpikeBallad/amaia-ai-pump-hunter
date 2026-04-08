import { airtableAdapter } from '@/src/sales/crm/airtable-adapter';
import { hubspotAdapter } from '@/src/sales/crm/hubspot-adapter';
import { memoryAdapter } from '@/src/sales/crm/memory-adapter';
import { supabaseAdapter } from '@/src/sales/crm/supabase-adapter';

const adapters = {
  memory: memoryAdapter,
  supabase: supabaseAdapter,
  airtable: airtableAdapter,
  hubspot: hubspotAdapter,
};

export function getCrmAdapter() {
  const provider = process.env.AMAIA_SALES_CRM_PROVIDER ?? 'memory';
  return adapters[provider] ?? memoryAdapter;
}
