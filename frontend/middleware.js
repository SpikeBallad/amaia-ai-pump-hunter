import { NextResponse } from 'next/server';

export function middleware(request) {
  const host = request.headers.get('host') ?? '';
  const url = request.nextUrl.clone();

  if (host.startsWith('amaia.') && url.pathname === '/') {
    url.pathname = '/amaia';
    return NextResponse.rewrite(url);
  }

  if ((host === 'balladtrades.com' || host === 'www.balladtrades.com') && url.pathname === '/company') {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/company'],
};
