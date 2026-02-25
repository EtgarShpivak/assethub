import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Google Drive integration is disabled — using Supabase Storage instead
export async function POST() {
  return NextResponse.json(
    { error: 'ייבוא מ-Google Drive אינו זמין כרגע. השתמשו בהעלאה ידנית.' },
    { status: 501 }
  );
}
