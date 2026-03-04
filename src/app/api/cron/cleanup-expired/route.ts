import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Find expired assets
  const { data: expired, error } = await supabase
    .from('assets')
    .select('id, stored_filename, drive_file_id, original_filename, workspace_id')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100); // Process in batches

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'No expired assets' });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const asset of expired) {
    try {
      // Delete from storage
      if (asset.drive_file_id) {
        await supabase.storage.from('assets').remove([asset.drive_file_id]);
      }

      // Delete from DB
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      if (deleteError) {
        errors.push(`${asset.original_filename}: ${deleteError.message}`);
      } else {
        deleted++;
      }
    } catch (err) {
      errors.push(`${asset.original_filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Log to activity_log
  await supabase.from('activity_log').insert({
    workspace_id: expired[0]?.workspace_id || null,
    user_id: null,
    user_name: 'מערכת (Cron)',
    action: 'auto_delete_expired',
    entity_type: 'system',
    entity_id: null,
    entity_name: 'cleanup-expired',
    metadata: {
      deleted,
      errors: errors.length,
      error_details: errors,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({ deleted, errors });
}
