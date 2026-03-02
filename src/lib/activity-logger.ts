/**
 * Centralized Activity Logger — for use in API routes only.
 *
 * Captures IP, User-Agent, and login method automatically.
 * Non-blocking — never throws, never slows down the main request.
 *
 * Uses createServiceRoleClient (requires next/headers).
 * DO NOT import from client components!
 */

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface LogActivityOptions {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  userId?: string | null;
  userName?: string | null;
  workspaceId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  request: NextRequest | null,
  opts: LogActivityOptions
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    // Extract IP and User-Agent from request headers
    const ip = request
      ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      : 'system';
    const userAgent = request
      ? request.headers.get('user-agent') || 'unknown'
      : 'system';

    // Resolve user profile if userId provided
    let resolvedUserName = opts.userName || null;
    let resolvedWorkspaceId = opts.workspaceId || null;
    let loginMethod: string | null = null;

    if (opts.userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, email, workspace_ids')
        .eq('id', opts.userId)
        .single();

      if (profile) {
        resolvedUserName = resolvedUserName || profile.display_name || profile.email || 'משתמש';
        resolvedWorkspaceId = resolvedWorkspaceId || profile.workspace_ids?.[0] || null;
      }

      // Get login method from Supabase auth
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(opts.userId);
        if (authData?.user) {
          const identity = authData.user.identities?.[0];
          loginMethod = (authData.user.app_metadata?.provider as string) ||
            (identity ? String(identity.provider || 'email') : 'email');
        }
      } catch {
        // Auth lookup failed — not critical
      }
    }

    await supabase.from('activity_log').insert({
      workspace_id: resolvedWorkspaceId,
      user_id: opts.userId || null,
      user_name: resolvedUserName || 'מערכת',
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId || null,
      entity_name: opts.entityName || null,
      metadata: {
        ...opts.metadata,
        ip,
        user_agent: userAgent,
        login_method: loginMethod,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Never let logging break the main flow
    console.error('[ActivityLogger] Failed to log:', err);
  }
}
