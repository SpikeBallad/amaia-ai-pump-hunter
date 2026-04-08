import { NextResponse } from 'next/server';

import { getOrCreateLead, logSalesEvent, saveLead } from '@/src/sales/services/crm-service';

function nextStageFromCta(ctaType) {
  if (ctaType === 'book_demo') return 'demo_requested';
  if (ctaType === 'start_trial') return 'trial_started';
  if (ctaType === 'talk_to_human') return 'escalated';
  return 'nurturing';
}

export async function POST(request) {
  try {
    const { conversationId, ctaType, label, source } = await request.json();
    if (!conversationId || !ctaType) {
      return NextResponse.json({ message: 'conversationId and ctaType are required.' }, { status: 400 });
    }

    const lead = await getOrCreateLead(conversationId, source);
    await saveLead({
      ...lead,
      stage: nextStageFromCta(ctaType),
      ctaHistory: [...(lead.ctaHistory ?? []), { type: ctaType, label, timestamp: new Date().toISOString() }],
    });

    await logSalesEvent({
      type: 'sales_cta_clicked',
      leadId: lead.id,
      source,
      payload: { ctaType, label },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'CTA logging failed.' }, { status: 500 });
  }
}
