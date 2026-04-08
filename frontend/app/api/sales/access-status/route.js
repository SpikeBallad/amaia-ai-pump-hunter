import { NextResponse } from 'next/server';

import { getLeadByConversation } from '@/src/sales/services/crm-service';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ message: 'conversationId is required.' }, { status: 400 });
    }

    const lead = await getLeadByConversation(conversationId);
    const signedUp = Boolean(
      lead &&
        ((lead.ctaHistory ?? []).some((item) => ['start_trial', 'early_access', 'paypal_early_access'].includes(item.type)) ||
          ['trial_started', 'reserved_access'].includes(lead.stage)),
    );

    return NextResponse.json({
      ok: true,
      signedUp,
      leadScore: lead?.leadScore ?? 0,
      stage: lead?.stage ?? 'new',
    });
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'Access status failed.' }, { status: 500 });
  }
}
