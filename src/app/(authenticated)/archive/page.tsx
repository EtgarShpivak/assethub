'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Archive,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Newspaper,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FILE_TYPES } from '@/lib/platform-specs';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { Asset } from '@/lib/types';

function FileTypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5';
  switch (type) {
    case 'image': return <ImageIcon className={`${cls} text-ono-green`} />;
    case 'video': return <Film className={`${cls} text-platform-meta`} />;
    case 'pdf': return <FileText className={`${cls} text-platform-google`} />;
    case 'newsletter': return <Newspaper className={`${cls} text-ono-orange`} />;
    default: return <File className={`${cls} text-ono-gray`} />;
  }
}

export default function ArchivePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ action: 'restore' | 'delete'; ids: string[] } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/archive');
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const toggleAssetSelection = (id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAction = async (action: 'restore' | 'delete', ids: string[]) => {
    setProcessing(true);
    try {
      await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, asset_ids: ids }),
      });
      setSelectedAssets(new Set());
      setConfirmDialog(null);
      fetchArchived();
    } catch {
      // silent
    }
    setProcessing(false);
  };

  // Calculate days since archived (prefer archived_at, fall back to upload_date)
  const getDaysInArchive = (asset: Asset) => {
    const archiveDate = (asset as Asset & { archived_at?: string }).archived_at || asset.upload_date;
    const diff = Date.now() - new Date(archiveDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-ono-orange" />
          <h1 className="text-2xl font-bold text-ono-gray-dark">ארכיון</h1>
          <Badge variant="outline" className="text-xs">{total} חומרים</Badge>
          <InfoTooltip text="חומרים שהועברו לארכיון. ניתן לשחזר אותם או למחוק לצמיתות. חומרים בארכיון מעל 30 יום מסומנים למחיקה." size="md" />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedAssets.size > 0 && (
        <div className="bg-ono-orange-light border border-ono-orange/30 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-ono-gray-dark">{selectedAssets.size} חומרים נבחרו</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-ono-green text-ono-green hover:bg-ono-green-light"
              onClick={() => setConfirmDialog({ action: 'restore', ids: Array.from(selectedAssets) })}
            >
              <RotateCcw className="w-4 h-4 ml-1" />
              שחזר
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-50"
              onClick={() => setConfirmDialog({ action: 'delete', ids: Array.from(selectedAssets) })}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              מחק לצמיתות
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedAssets(new Set())}>בטל</Button>
          </div>
        </div>
      )}

      {/* Archive list */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען ארכיון...
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-ono-gray">
          <Archive className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>הארכיון ריק</p>
          <p className="text-sm mt-1">חומרים שתעבירו לארכיון יופיעו כאן</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ono-gray-light border-b border-[#E8E8E8]">
                <th className="p-3 text-right w-8">
                  <Checkbox
                    checked={selectedAssets.size === assets.length && assets.length > 0}
                    onCheckedChange={c => {
                      if (c) setSelectedAssets(new Set(assets.map(a => a.id)));
                      else setSelectedAssets(new Set());
                    }}
                  />
                </th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">שם קובץ</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">סוג</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">סלאג</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">גודל</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">תאריך העלאה</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">ימים בארכיון</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, i) => {
                const days = getDaysInArchive(asset);
                const expiring = days >= 25;
                return (
                  <tr key={asset.id} className={`border-b border-[#E8E8E8] hover:bg-ono-gray-light/50 ${i % 2 === 1 ? 'bg-ono-gray-light/30' : ''} ${expiring ? 'bg-red-50/50' : ''}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon type={asset.file_type} size="sm" />
                        <span className="text-ono-gray-dark truncate max-w-[250px]">{asset.stored_filename || asset.original_filename}</span>
                      </div>
                    </td>
                    <td className="p-3 text-ono-gray">{FILE_TYPES.find(f => f.value === asset.file_type)?.label || asset.file_type}</td>
                    <td className="p-3 text-ono-gray text-xs">{(asset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || '—'}</td>
                    <td className="p-3 text-ono-gray">{asset.file_size_label || '—'}</td>
                    <td className="p-3 text-ono-gray text-xs">{new Date(asset.upload_date).toLocaleDateString('he-IL')}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {expiring && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        <span className={`text-xs ${expiring ? 'text-red-500 font-bold' : 'text-ono-gray'}`}>
                          {days} ימים
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-ono-green hover:text-ono-green-dark"
                          onClick={() => setConfirmDialog({ action: 'restore', ids: [asset.id] })}
                          title="שחזר"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-500 hover:text-red-700"
                          onClick={() => setConfirmDialog({ action: 'delete', ids: [asset.id] })}
                          title="מחק לצמיתות"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog?.action === 'restore' ? (
                <><RotateCcw className="w-5 h-5 text-ono-green" /> שחזור חומרים</>
              ) : (
                <><Trash2 className="w-5 h-5 text-red-500" /> מחיקה לצמיתות</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {confirmDialog?.action === 'restore' ? (
              <p className="text-sm text-ono-gray">
                האם לשחזר {confirmDialog.ids.length} חומרים לספריית החומרים?
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">
                  פעולה זו אינה הפיכה!
                </p>
                <p className="text-sm text-ono-gray">
                  {confirmDialog?.ids.length} חומרים יימחקו לצמיתות מהמערכת ומהאחסון.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>ביטול</Button>
            <Button
              onClick={() => confirmDialog && handleAction(confirmDialog.action, confirmDialog.ids)}
              disabled={processing}
              className={confirmDialog?.action === 'restore'
                ? 'bg-ono-green hover:bg-ono-green-dark text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'}
            >
              {processing ? 'מעבד...' : confirmDialog?.action === 'restore' ? 'שחזר' : 'מחק לצמיתות'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
