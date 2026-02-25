import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateExportFilename } from '@/lib/export-naming';
import { PLATFORM_SPECS } from '@/lib/platform-specs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const body = await request.json();

  const { asset_ids, platform, workspace_id } = body;

  if (!asset_ids || !platform || !workspace_id) {
    return NextResponse.json({ error: 'שדות חובה חסרים' }, { status: 400 });
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug_prefix')
    .eq('id', workspace_id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: 'סביבת עבודה לא נמצאה' }, { status: 404 });
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('*, initiatives(short_code)')
    .in('id', asset_ids);

  if (!assets) {
    return NextResponse.json({ error: 'שגיאה בטעינת חומרים' }, { status: 500 });
  }

  const specs = PLATFORM_SPECS[platform] || [];
  const dimCounters: Record<string, number> = {};

  const preview = assets.map((asset) => {
    const dims = asset.dimensions_label || 'unknown';
    const key = `${asset.initiative_id || 'standalone'}_${platform}_${dims}`;
    dimCounters[key] = (dimCounters[key] || 0) + 1;

    const ext = asset.original_filename.split('.').pop() || 'bin';
    const initiativeCode = (asset.initiatives as { short_code: string } | null)?.short_code || null;

    const filename = generateExportFilename({
      workspaceSlug: workspace.slug_prefix,
      initiativeCode,
      platform,
      dimensions: dims,
      sequence: dimCounters[key],
      ext,
    });

    // Check dimension matching
    const fileType = asset.file_type as string;
    const matchingSpec = specs.find((s) => {
      const specDims = s.dims;
      return specDims === dims && s.types.includes(fileType as 'image' | 'video');
    });

    const wrongTypeSpec = specs.find((s) => {
      return s.dims === dims && !s.types.includes(fileType as 'image' | 'video');
    });

    let status: 'match' | 'mismatch' | 'wrong_type' = 'mismatch';
    if (matchingSpec) status = 'match';
    else if (wrongTypeSpec) status = 'wrong_type';

    return {
      asset_id: asset.id,
      original_filename: asset.original_filename,
      export_filename: filename,
      dimensions: dims,
      file_type: fileType,
      status,
      matching_format: matchingSpec?.name || wrongTypeSpec?.name || null,
    };
  });

  return NextResponse.json({ preview });
}
