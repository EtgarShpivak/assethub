/**
 * Server-side Error Logger — for use in API routes only
 *
 * Uses createServiceRoleClient (which requires next/headers)
 * DO NOT import this file from client components!
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

interface ServerErrorOptions {
  context: string;          // Where the error happened (e.g., 'upload', 'archive', 'export')
  errorMessage: string;     // The error message
  userId?: string | null;
  userName?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  entityType?: string;      // e.g., 'asset', 'collection', 'system'
  extra?: Record<string, unknown>; // Any extra metadata
}

export async function logServerError(opts: ServerErrorOptions): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Get workspace from user profile if we have a userId
    let workspaceId: string | null = null;
    let userName = opts.userName || 'מערכת';

    if (opts.userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, email, workspace_ids')
        .eq('id', opts.userId)
        .single();

      if (profile) {
        workspaceId = profile.workspace_ids?.[0] || null;
        userName = profile.display_name || profile.email || 'מערכת';
      }
    }

    await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: opts.userId || null,
      user_name: userName,
      action: 'error',
      entity_type: opts.entityType || 'system',
      entity_id: opts.entityId || null,
      entity_name: opts.entityName || opts.context,
      metadata: {
        level: 'error',
        error_message: opts.errorMessage,
        context: opts.context,
        timestamp: new Date().toISOString(),
        ...(opts.extra || {}),
      },
    });
  } catch {
    // Never let error logging break the main flow
    console.error('[ErrorLogger] Failed to log error:', opts.errorMessage);
  }
}
