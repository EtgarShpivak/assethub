import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10000);

  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59.999Z');

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // CSV header
  const headers = ['Date', 'Time', 'User', 'Action', 'Entity Type', 'Entity Name'];
  const rows = (data || []).map(entry => {
    const date = new Date(entry.created_at);
    return [
      date.toISOString().split('T')[0],
      date.toTimeString().split(' ')[0],
      // Sanitize CSV fields to prevent formula injection
      sanitizeCsvField(entry.user_name || ''),
      sanitizeCsvField(entry.action || ''),
      sanitizeCsvField(entry.entity_type || ''),
      sanitizeCsvField(entry.entity_name || ''),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  // BOM for Hebrew support in Excel
  const bom = '\uFEFF';

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function sanitizeCsvField(value: string): string {
  // Trim first, then prevent CSV formula injection
  const trimmed = value.trim();
  const escaped = trimmed.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"'${escaped}"`;
  }
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }
  return escaped;
}
