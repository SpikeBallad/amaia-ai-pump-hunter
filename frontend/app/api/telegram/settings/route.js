import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  decryptTelegramSettings,
  encryptTelegramSettings,
  getTelegramCookieName,
  sanitizeTelegramSettings,
} from '@/src/lib/server/telegram';

export async function GET() {
  const cookieStore = cookies();
  const settingsCookie = cookieStore.get(getTelegramCookieName())?.value;
  const settings = decryptTelegramSettings(settingsCookie);
  return NextResponse.json({ ok: true, settings: sanitizeTelegramSettings(settings) });
}

export async function POST(request) {
  const payload = await request.json();
  const settings = {
    enabled: Boolean(payload.enabled),
    botToken: payload.botToken ?? '',
    chatId: payload.chatId ?? '',
  };

  const response = NextResponse.json({ ok: true, settings: sanitizeTelegramSettings(settings) });
  response.cookies.set({
    name: getTelegramCookieName(),
    value: encryptTelegramSettings(settings),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getTelegramCookieName(),
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
