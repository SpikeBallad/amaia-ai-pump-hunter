import { NextResponse } from 'next/server';

const DEFAULT_USERNAME = 'amaia-admin';
const DEFAULT_PASSWORD = 'AmaiaHunter2026!';
const SESSION_COOKIE = 'amaia-admin-session';

export async function POST(request) {
  const { username, password } = await request.json();

  const expectedUsername = process.env.AMAIA_ADMIN_USER ?? DEFAULT_USERNAME;
  const expectedPassword = process.env.AMAIA_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ ok: false, message: 'Credenciales invalidas.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: 'authenticated',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}
