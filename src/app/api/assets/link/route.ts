import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, getAuthUser } from '@/lib/supabase/server';
import { logServerError } from '@/lib/error-logger-server';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    workspace_id, slug_id, initiative_id,
    title, url, notes,
    domain_context, platforms, tags, asset_type, upload_date, expires_at,
  } = body as {
    workspace_id: string;
    slug_id: string;
    initiative_id?: string;
    title: string;
    url: string;
    notes?: string;
    domain_context?: string;
    platforms?: string[];
    tags?: string[];
    asset_type?: string;
    upload_date?: string;
    expires_at?: string;
  };

  if (!workspace_id || !slug_id || !title || !url) {
    return NextResponse.json(
      { error: 'שדות חובה חסרים: workspace_id, slug_id, title, url' },
      { status: 400 }
    );
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'כתובת URL לא תקינה' },
      { status: 400 }
    );
  }

  const uploadDateISO = upload_date ? new Date(upload_date).toISOString() : new Date().toISOString();

  try {
    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        workspace_id,
        slug_id,
        initiative_id: initiative_id || null,
        original_filename: title,
        stored_filename: null,
        file_type: 'link',
        mime_type: null,
        file_size_bytes: null,
        file_size_label: null,
        width_px: null,
        height_px: null,
        dimensions_label: null,
        aspect_ratio: null,
        domain_context: domain_context || null,
        asset_type: asset_type || 'production',
        platforms: platforms || null,
        drive_file_id: null,
        drive_view_url: url,
        external_url: url,
        upload_date: uploadDateISO,
        uploaded_by: user.id,
        tags: tags || null,
        notes: notes || null,
        expires_at: expires_at || null,
        version: 1,
      })
      .select()
      .single();

    if (dbError) {
      await logServerError({
        context: 'create-link-asset',
        errorMessage: `DB insert failed for link "${title}": ${dbError.message}`,
        userId: user.id,
        entityType: 'asset',
        entityName: title,
      });
      return NextResponse.json({ error: 'שגיאה בשמירת הקישור' }, { status: 500 });
    }

    await logActivity(request, {
      action: 'create_link',
      entityType: 'asset',
      entityId: asset.id,
      entityName: title,
      userId: user.id,
      workspaceId: workspace_id,
      metadata: {
        file_type: 'link',
        external_url: url,
        slug_id,
        initiative_id: initiative_id || null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logServerError({
      context: 'create-link-asset-general',
      errorMessage: `Create link failed for "${title}": ${errMsg}`,
      userId: user.id,
      entityType: 'asset',
      entityName: title,
    });
    return NextResponse.json({ error: 'שגיאה בלתי צפויה' }, { status: 500 });
  }
}
