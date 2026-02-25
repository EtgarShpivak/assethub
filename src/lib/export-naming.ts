export function generateExportFilename(params: {
  workspaceSlug: string;
  initiativeCode: string | null;
  platform: string;
  dimensions: string;
  sequence: number;
  ext: string;
}): string {
  const { workspaceSlug, initiativeCode, platform, dimensions, sequence, ext } = params;
  const initiative = initiativeCode ?? 'standalone';
  const dims = dimensions.replace('×', 'x');
  const seq = String(sequence).padStart(2, '0');
  return `${workspaceSlug}_${initiative}_${platform}_${dims}_${seq}.${ext}`.toLowerCase();
}
