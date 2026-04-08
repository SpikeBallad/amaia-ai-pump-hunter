import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getAdminSummary } from '@/src/sales/services/crm-service';

export async function GET() {
  const sessionCookie = cookies().get('amaia-admin-session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const summary = await getAdminSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'Failed to load sales summary.' }, { status: 500 });
  }
}
