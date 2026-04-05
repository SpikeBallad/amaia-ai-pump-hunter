import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { decryptTelegramSettings, getTelegramCookieName } from '@/src/lib/server/telegram';

function line(label, value) {
  return `${label}: ${value ?? '--'}`;
}

export async function POST(request) {
  const cookieStore = cookies();
  const settingsCookie = cookieStore.get(getTelegramCookieName())?.value;
  const settings = decryptTelegramSettings(settingsCookie);

  if (!settings.enabled || !settings.botToken || !settings.chatId) {
    return NextResponse.json({ ok: false, message: 'Telegram no configurado.' }, { status: 400 });
  }

  const payload = await request.json();
  const message = [
    payload.title ?? 'AMAIA AI PUMP HUNTER PRO',
    line('Market', payload.market),
    line('Exchange', payload.exchange),
    line('Score', payload.score),
    line('Narrative', payload.narrative),
    line('Decision', payload.decision),
    line('Avg Entry', payload.avgEntry),
    line('Stop Loss', payload.stopLoss),
    line('TP1', payload.tp1),
    line('TP2', payload.tp2),
    line('TP3', payload.tp3),
    line('Risk %', payload.riskPct),
    line('Position Size USD', payload.positionSizeUsd),
    line('Quantity', payload.quantity),
  ].join('\n');

  const telegramResponse = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: settings.chatId,
      text: message,
    }),
  });

  const responsePayload = await telegramResponse.json().catch(() => null);

  if (!telegramResponse.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: responsePayload?.description ?? 'Telegram delivery failed.',
        details: responsePayload,
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, result: responsePayload });
}
