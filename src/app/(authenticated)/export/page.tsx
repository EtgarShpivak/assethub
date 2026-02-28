'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalToast } from '@/components/ui/global-toast';
import { logClientError } from '@/lib/error-logger';
import { PLATFORMS, PLATFORM_SPECS } from '@/lib/platform-specs';
import type { Asset, Slug, Initiative } from '@/lib/types';

interface ExportPreviewItem {
  asset_id: string;
  original_filename: string;
  export_filename: string;
  dimensions: string;
  file_type: string;
  status: 'match' | 'mismatch' | 'wrong_type';
  matching_format: string | null;
}

const statusIcons = {
  match: <CheckCircle2 className="w-4 h-4 text-ono-green" />,
  mismatch: <AlertTriangle className="w-4 h-4 text-ono-orange" />,
  wrong_type: <XCircle className="w-4 h-4 text-red-500" />,
};

const statusLabels = {
  match: 'תואם',
  mismatch: 'מידות לא תואמות',
  wrong_type: 'סוג קובץ שגוי',
};

export default function ExportPage() {
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');

  const [previewItems, setPreviewItems] = useState<ExportPreviewItem[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/workspaces').then((r) => r.json()),
      fetch('/api/slugs').then((r) => r.json()),
      fetch('/api/initiatives').then((r) => r.json()),
    ]).then(([ws, sl, ini]) => {
      setWorkspaces(ws);
      setSlugs(sl);
      setInitiatives(ini);
      if (ws.length > 0) setSelectedWorkspace(ws[0].id);
    });
  }, []);

  // If asset IDs were passed from the library, pre-load them
  useEffect(() => {
    const assetIds = searchParams.get('assets');
    if (assetIds) {
      const ids = assetIds.split(',');
      // We'll fetch these assets when the platform is selected
      setSelectedForExport(new Set(ids));
    }
  }, [searchParams]);

  // Fetch matching assets when filters change
  const fetchAssets = useCallback(async () => {
    if (!selectedPlatform || !selectedWorkspace) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('platform', selectedPlatform);
    if (selectedSlug) params.set('slug_id', selectedSlug);
    if (selectedInitiative) params.set('initiative_id', selectedInitiative);
    params.set('limit', '200');

    const res = await fetch(`/api/assets?${params}`);
    const data = await res.json();
    setAssets(data.assets || []);

    // Pre-select all assets, or keep pre-selected from URL
    const preselected = searchParams.get('assets');
    if (!preselected) {
      setSelectedForExport(new Set((data.assets || []).map((a: Asset) => a.id)));
    }

    setLoading(false);
  }, [selectedPlatform, selectedWorkspace, selectedSlug, selectedInitiative, searchParams]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Generate filename preview
  const generatePreview = useCallback(async () => {
    if (selectedForExport.size === 0 || !selectedPlatform || !selectedWorkspace) {
      setPreviewItems([]);
      return;
    }

    const res = await fetch('/api/export/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_ids: Array.from(selectedForExport),
        platform: selectedPlatform,
        workspace_id: selectedWorkspace,
      }),
    });

    const data = await res.json();
    setPreviewItems(data.preview || []);
  }, [selectedForExport, selectedPlatform, selectedWorkspace]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const { showError, showSuccess } = useGlobalToast();

  const handleExport = async () => {
    if (selectedForExport.size === 0 || !selectedPlatform || !selectedWorkspace) return;
    setExporting(true);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: Array.from(selectedForExport),
          platform: selectedPlatform,
          workspace_id: selectedWorkspace,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || 'שגיאה בייצוא';
        showError('שגיאה בייצוא', errMsg, 'נסה שוב עם פחות קבצים, או בדוק שכל הקבצים קיימים באחסון.');
        await logClientError('export', errMsg, `platform: ${selectedPlatform}`);
        setExporting(false);
        return;
      }

      // Download the ZIP
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${selectedPlatform}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('הייצוא הושלם', `${selectedForExport.size} קבצים יוצאו בהצלחה.`);
    } catch (err) {
      showError('שגיאה בייצוא', 'לא ניתן היה לייצא את החבילה.', 'בדוק את חיבור האינטרנט ונסה שוב.');
      await logClientError('export', err instanceof Error ? err.message : 'Unknown export error');
    }

    setExporting(false);
  };

  const filteredInitiatives = selectedSlug
    ? initiatives.filter((i) => i.slug_id === selectedSlug)
    : initiatives;

  const platformSpecs = selectedPlatform ? PLATFORM_SPECS[selectedPlatform] || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Download className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">ייצוא לפלטפורמות</h1>
      </div>

      {/* Configuration panel */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
        <h3 className="font-bold text-ono-gray-dark">הגדרות ייצוא</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workspaces.length > 1 && (
            <div>
              <Label className="text-xs">סביבת עבודה</Label>
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-xs">סלאג (אופציונלי)</Label>
            <select
              value={selectedSlug}
              onChange={(e) => { setSelectedSlug(e.target.value); setSelectedInitiative(''); }}
              className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1"
            >
              <option value="">הכל</option>
              {slugs.filter((s) => !s.is_archived).map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">מהלך (אופציונלי)</Label>
            <select
              value={selectedInitiative}
              onChange={(e) => setSelectedInitiative(e.target.value)}
              className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1"
            >
              <option value="">הכל</option>
              {filteredInitiatives.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.short_code})</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">פלטפורמה *</Label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1"
            >
              <option value="">בחר פלטפורמה...</option>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Platform format specs */}
        {platformSpecs.length > 0 && (
          <div>
            <Label className="text-xs mb-2 block">פורמטים נתמכים ב-{PLATFORMS.find(p => p.value === selectedPlatform)?.label}:</Label>
            <div className="flex flex-wrap gap-2">
              {platformSpecs.map((spec) => (
                <Badge
                  key={spec.name}
                  variant="outline"
                  className="text-xs"
                >
                  {spec.name} — {spec.dims} ({spec.types.join(', ')})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-ono-gray">טוען חומרים...</div>
      ) : selectedPlatform && previewItems.length > 0 ? (
        <>
          {/* Preview table */}
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
            <div className="p-4 border-b border-[#E8E8E8] flex items-center justify-between">
              <h3 className="font-bold text-ono-gray-dark">
                תצוגה מקדימה — {previewItems.length} קבצים
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-ono-green" />
                  {previewItems.filter(p => p.status === 'match').length} תואמים
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-ono-orange" />
                  {previewItems.filter(p => p.status === 'mismatch').length} מידות שונות
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  {previewItems.filter(p => p.status === 'wrong_type').length} סוג שגוי
                </span>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ono-gray-light border-b border-[#E8E8E8]">
                  <th className="p-3 text-right w-8">
                    <Checkbox
                      checked={selectedForExport.size === assets.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedForExport(new Set(assets.map(a => a.id)));
                        else setSelectedForExport(new Set());
                      }}
                    />
                  </th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סטטוס</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">קובץ מקורי</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">שם ייצוא</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">מידות</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">פורמט</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr key={item.asset_id} className="border-b border-[#E8E8E8] hover:bg-ono-gray-light/50">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedForExport.has(item.asset_id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedForExport);
                          if (checked) next.add(item.asset_id);
                          else next.delete(item.asset_id);
                          setSelectedForExport(next);
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcons[item.status]}
                        <span className="text-xs">{statusLabels[item.status]}</span>
                      </div>
                    </td>
                    <td className="p-3 text-ono-gray-dark text-xs truncate max-w-[200px]">
                      {item.original_filename}
                    </td>
                    <td className="p-3 font-mono text-xs text-ono-gray-dark" dir="ltr">
                      {item.export_filename}
                    </td>
                    <td className="p-3 font-mono text-xs text-ono-gray">
                      {item.dimensions}
                    </td>
                    <td className="p-3 text-xs text-ono-gray">
                      {item.matching_format || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              disabled={exporting || selectedForExport.size === 0}
              className="bg-ono-green hover:bg-ono-green-dark text-white px-8 py-3 text-base"
            >
              {exporting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  מייצא...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  הורד חבילה ({selectedForExport.size} קבצים)
                </span>
              )}
            </Button>
          </div>
        </>
      ) : selectedPlatform ? (
        <div className="text-center py-12 text-ono-gray">
          <Package className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>לא נמצאו חומרים מתאימים לפלטפורמה שנבחרה</p>
        </div>
      ) : (
        <div className="text-center py-12 text-ono-gray">
          <Download className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>בחרו פלטפורמה כדי להתחיל בתהליך הייצוא</p>
        </div>
      )}
    </div>
  );
}
