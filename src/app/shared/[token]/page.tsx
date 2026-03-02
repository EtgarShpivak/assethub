'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FolderOpen,
  Grid3X3,
  List,
  Search,
  Download,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Check,
  Package,
  Clock,
  AlertTriangle,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORMS, FILE_TYPES } from '@/lib/platform-specs';
import { DOMAIN_CONTEXTS } from '@/lib/platform-specs';
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

function PlatformBadge({ platform }: { platform: string }) {
  const p = PLATFORMS.find((pl) => pl.value === platform);
  if (!p) return null;
  return (
    <Badge style={{ backgroundColor: `${p.color}15`, color: p.color, borderColor: `${p.color}40` }} className="border text-[10px] px-1.5 py-0">
      {p.label}
    </Badge>
  );
}

export default function SharedPage() {
  const params = useParams();
  const token = params.token as string;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [filterFileType, setFilterFileType] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/shares?token=${token}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || 'שגיאה');
          if (data.expired) setExpired(true);
          setLoading(false);
          return;
        }
        setAssets(data.assets || []);
        setFilteredAssets(data.assets || []);
        setExpiresAt(data.expires_at);
        setLoading(false);
      })
      .catch(() => { setError('שגיאה בטעינת הקישור'); setLoading(false); });
  }, [token]);

  // Apply local filters
  useEffect(() => {
    let result = [...assets];
    if (searchQuery) {
      result = result.filter(a =>
        (a.stored_filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterFileType) {
      result = result.filter(a => a.file_type === filterFileType);
    }
    setFilteredAssets(result);
  }, [assets, searchQuery, filterFileType]);

  const toggleAssetSelection = (id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDownloadSingle = useCallback(async (asset: Asset) => {
    try {
      const res = await fetch(`/api/assets/${asset.id}/download`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = asset.original_filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }, []);

  const handleDownloadSelected = async () => {
    const ids = Array.from(selectedAssets);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      const asset = assets.find(a => a.id === ids[0]);
      if (asset) { handleDownloadSingle(asset); return; }
    }
    setDownloading(true);
    try {
      const res = await fetch('/api/assets/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: ids }),
      });
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `shared_${ids.length}_files.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { /* silent */ }
    setDownloading(false);
  };

  const handleDownloadAll = async () => {
    const ids = filteredAssets.map(a => a.id);
    if (ids.length === 0) return;
    if (ids.length === 1) { handleDownloadSingle(filteredAssets[0]); return; }
    setDownloading(true);
    try {
      const res = await fetch('/api/assets/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: ids }),
      });
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `shared_all_${ids.length}_files.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { /* silent */ }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ono-gray">טוען חומרים משותפים...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 max-w-md text-center">
          <Clock className="w-12 h-12 text-ono-orange mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ono-gray-dark mb-2">פג תוקף הקישור</h1>
          <p className="text-ono-gray">קישור השיתוף אינו תקף יותר. בקש קישור חדש מהשולח.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ono-gray-dark mb-2">שגיאה</h1>
          <p className="text-ono-gray">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ono-gray-light" dir="rtl">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ono-green rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">ONO</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-ono-gray-dark">חומרים משותפים</h1>
                <p className="text-xs text-ono-gray">
                  {assets.length} חומרים · תקף עד {new Date(expiresAt).toLocaleDateString('he-IL')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={downloading}>
                {downloading ? <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" /> : <Package className="w-4 h-4" />}
                <span className="mr-1 text-xs">הורד הכל ({filteredAssets.length})</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
            <Input className="pr-10 bg-white" placeholder="חיפוש לפי שם קובץ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select value={filterFileType} onChange={e => setFilterFileType(e.target.value)} className="border border-[#E8E8E8] rounded-md p-2 text-sm bg-white">
            <option value="">כל סוגי הקבצים</option>
            {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex items-center gap-1 mr-auto">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-ono-green text-white' : ''}><Grid3X3 className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-ono-green text-white' : ''}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedAssets.size > 0 && (
          <div className="bg-ono-green-light border border-ono-green/30 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ono-gray-dark">{selectedAssets.size} חומרים נבחרו</span>
            <div className="flex gap-2">
              <Button size="sm" className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={handleDownloadSelected} disabled={downloading}>
                <Download className="w-4 h-4 ml-1" />
                {selectedAssets.size === 1 ? 'הורד' : `הורד ${selectedAssets.size} קבצים`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedAssets(new Set())}>בטל</Button>
            </div>
          </div>
        )}

        {/* Assets */}
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-ono-gray">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
            <p>לא נמצאו חומרים</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map(asset => (
              <div key={asset.id} className={`bg-white border rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden cursor-pointer transition-all hover:border-ono-green ${selectedAssets.has(asset.id) ? 'border-ono-green ring-2 ring-ono-green/20' : 'border-[#E8E8E8]'}`}>
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => { e.stopPropagation(); toggleAssetSelection(asset.id); }}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedAssets.has(asset.id) ? 'bg-ono-green border-ono-green' : 'bg-white/80 border-ono-gray/40'}`}>
                      {selectedAssets.has(asset.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  {asset.aspect_ratio && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-black/60 text-white text-[9px] px-1 py-0 border-0">{asset.aspect_ratio}</Badge>
                    </div>
                  )}
                  <div className="aspect-square bg-ono-gray-light flex items-center justify-center" onClick={() => handleDownloadSingle(asset)}>
                    {asset.drive_view_url && asset.file_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.drive_view_url} alt={asset.original_filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileTypeIcon type={asset.file_type} size="lg" />
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-ono-gray-dark truncate mb-1">
                    {(asset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || asset.original_filename}
                    {asset.domain_context && ` · ${DOMAIN_CONTEXTS.find(d => d.value === asset.domain_context)?.label || ''}`}
                  </p>
                  <p className="text-[10px] text-ono-gray truncate">{asset.stored_filename || asset.original_filename}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.dimensions_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.dimensions_label}</Badge>}
                    {asset.file_size_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.file_size_label}</Badge>}
                    {asset.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ono-gray-light border-b border-[#E8E8E8]">
                  <th className="p-3 text-right w-8"><Checkbox checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0} onCheckedChange={c => { if (c) setSelectedAssets(new Set(filteredAssets.map(a => a.id))); else setSelectedAssets(new Set()); }} /></th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">שם קובץ</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סוג</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">מידות</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">גודל</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">הורדה</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, i) => (
                  <tr key={asset.id} className={`border-b border-[#E8E8E8] hover:bg-ono-gray-light/50 ${i % 2 === 1 ? 'bg-ono-gray-light/30' : ''}`}>
                    <td className="p-3"><Checkbox checked={selectedAssets.has(asset.id)} onCheckedChange={() => toggleAssetSelection(asset.id)} /></td>
                    <td className="p-3"><div className="flex items-center gap-2"><FileTypeIcon type={asset.file_type} size="sm" /><span className="text-ono-gray-dark truncate max-w-[250px]">{asset.stored_filename || asset.original_filename}</span></div></td>
                    <td className="p-3 text-ono-gray">{FILE_TYPES.find(f => f.value === asset.file_type)?.label || asset.file_type}</td>
                    <td className="p-3 text-ono-gray font-mono text-xs">{asset.dimensions_label || '—'}</td>
                    <td className="p-3 text-ono-gray">{asset.file_size_label || '—'}</td>
                    <td className="p-3"><Button size="sm" variant="outline" onClick={() => handleDownloadSingle(asset)}><Download className="w-3 h-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-ono-gray py-4">
          <p>ניהול מדיה · הקריה האקדמית אונו</p>
        </div>
      </div>
    </div>
  );
}
