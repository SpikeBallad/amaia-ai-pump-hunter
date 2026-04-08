import { NextResponse } from 'next/server';

import { getOrCreateLead, logSalesEvent, saveLead } from '@/src/sales/services/crm-service';

export async function POST(request) {
  try {
    const { conversationId, source, provider, variant } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ message: 'conversationId is required.' }, { status: 400 });
    }

    const lead = await getOrCreateLead(conversationId, source);
    const ctaType = provider === 'paypal' ? 'paypal_early_access' : 'early_access';

    await saveLead({
      ...lead,
      stage: 'reserved_access',
      ctaHistory: [
        ...(lead.ctaHistory ?? []),
        {
          type: ctaType,
          label: 'Get Early Access',
          timestamp: new Date().toISOString(),
          provider,
          variant,
        },
      ],
    });

    await logSalesEvent({
      type: 'sales_access_claimed',
      leadId: lead.id,
      source,
      payload: { provider, variant },
    });

    return NextResponse.json({ ok: true, signedUp: true });
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'Access claim failed.' }, { status: 500 });
  }
}
