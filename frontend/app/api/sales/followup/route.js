import { NextResponse } from 'next/server';

import { buildFollowupSequences } from '@/src/sales/services/followup-service';

export async function POST(request) {
  try {
    const lead = await request.json();
    return NextResponse.json({ ok: true, sequences: buildFollowupSequences(lead ?? {}) });
  } catch (error) {
    return NextResponse.json({ message: error.message ?? 'Follow-up generation failed.' }, { status: 500 });
  }
}
