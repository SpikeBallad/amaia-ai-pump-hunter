import { NextResponse } from 'next/server';

import { runSalesConversation, SALES_INITIAL_MESSAGE } from '@/src/sales/agents/conversation-engine';
import { appendConversation, getOrCreateLead, logSalesEvent } from '@/src/sales/services/crm-service';

export async function POST(request) {
  try {
    const { conversationId, source, message } = await request.json();
    if (!conversationId || !message) {
      return NextResponse.json({ message: 'conversationId and message are required.' }, { status: 400 });
    }

    let lead = await getOrCreateLead(conversationId, source);

    if ((lead.conversation ?? []).length === 0) {
      lead = await appendConversation(lead, {
        role: 'assistant',
        content: SALES_INITIAL_MESSAGE,
        timestamp: new Date().toISOString(),
      });
    }

    lead = await appendConversation(lead, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    const result = runSalesConversation(lead, message);
    await appendConversation(result.lead, result.reply);

    await logSalesEvent({
      type: 'sales_chat_message',
      leadId: result.lead.id,
      source,
      payload: {
        leadScore: result.meta.leadScore,
        intentLevel: result.meta.intentLevel,
        recommendedNextAction: result.meta.recommendedNextAction,
      },
    });

    return NextResponse.json({ ok: true, reply: result.reply, meta: result.meta });
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'Sales chat failed.' }, { status: 500 });
  }
}
