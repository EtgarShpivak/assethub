'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FolderOpen,
  Grid3X3,
  List,
  Search,
  Download,
  Archive,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Check,
  Package,
  Bookmark,
  BookmarkPlus,
  X,
  ArrowUpDown,
  Tag,
  Share2,
  Newspaper,
  AlertTriangle,
  Link as LinkIcon,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DOMAIN_CONTEXTS, PLATFORMS, FILE_TYPES, ASPECT_RATIOS, ASSET_TYPES } from '@/lib/platform-specs';
import { createClient } from '@/lib/supabase/client';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { Asset, Slug, Initiative, SavedSearch } from '@/lib/types';

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
    <Badge
      style={{ backgroundColor: `${p.color}15`, color: p.color, borderColor: `${p.color}40` }}
      className="border text-[10px] px-1.5 py-0"
    >
      {p.label}
    </Badge>
  );
}

function MultiCheckboxFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs py-0.5">
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
              className="h-3.5 w-3.5"
            />
            <span className="text-ono-gray-dark">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-ono-green text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-ono-gray-dark text-white';

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-4`}>
      {type === 'success' && <CheckCircle className="w-4 h-4" />}
      {type === 'error' && <AlertTriangle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="mr-2 hover:opacity-70"><X className="w-3 h-3" /></button>
    </div>
  );
}

export default function AssetLibraryPage() {
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // Multi-select filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterSlugs, setFilterSlugs] = useState<string[]>([]);
  const [filterInitiatives, setFilterInitiatives] = useState<string[]>([]);
  const [filterFileTypes, setFilterFileTypes] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [filterAspectRatios, setFilterAspectRatios] = useState<string[]>([]);
  const [filterDomainContexts, setFilterDomainContexts] = useState<string[]>([]);
  const [filterAssetTypes, setFilterAssetTypes] = useState<string[]>([]);
  const [filterDimensions, setFilterDimensions] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTag, setFilterTag] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeDatePreset, setActiveDatePreset] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('upload_date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Share dialog
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareDays, setShareDays] = useState('7');
  const [shareLink, setShareLink] = useState('');
  const [shareCreating, setShareCreating] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState<{ count: number; action: () => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const initialLoad = useRef(true);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  }, []);

  // Get user ID from Supabase auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load saved searches
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/saved-searches?user_id=${userId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSavedSearches(data); })
      .catch(() => {});
  }, [userId]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterSlugs.length) params.set('slug_id', filterSlugs.join(','));
    if (filterInitiatives.length) params.set('initiative_id', filterInitiatives.join(','));
    if (filterFileTypes.length) params.set('file_type', filterFileTypes.join(','));
    if (filterPlatforms.length) params.set('platform', filterPlatforms.join(','));
    if (filterAspectRatios.length) params.set('aspect_ratio', filterAspectRatios.join(','));
    if (filterDomainContexts.length) params.set('domain_context', filterDomainContexts.join(','));
    if (filterAssetTypes.length) params.set('asset_type', filterAssetTypes.join(','));
    if (filterDimensions) params.set('dimensions', filterDimensions);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    if (filterTag) params.set('tag', filterTag);
    if (searchParams.get('unclassified')) params.set('unclassified', 'true');
    params.set('page', page.toString());
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);

    try {
      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch {
      showToast('שגיאה בטעינת חומרים', 'error');
    }
    setLoading(false);
  }, [searchQuery, filterSlugs, filterInitiatives, filterFileTypes, filterPlatforms,
      filterAspectRatios, filterDomainContexts, filterAssetTypes, filterDimensions,
      filterDateFrom, filterDateTo, filterTag, page, sortBy, sortDir, searchParams, showToast]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // Load slugs and initiatives once
  useEffect(() => {
    Promise.all([
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/initiatives').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]).then(([sl, ini, tags]) => {
      setSlugs(sl);
      setInitiatives(ini);
      setAvailableTags(tags || []);
      initialLoad.current = false;
    });
  }, []);

  // Debounced search
  useEffect(() => {
    if (initialLoad.current) return;
    const timer = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterTag]);

  const toggleAssetSelection = (id: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasActiveFilters = filterSlugs.length > 0 || filterInitiatives.length > 0 ||
    filterFileTypes.length > 0 || filterPlatforms.length > 0 || filterAspectRatios.length > 0 ||
    filterDomainContexts.length > 0 || filterAssetTypes.length > 0 ||
    filterDimensions || filterDateFrom || filterDateTo || filterTag || searchQuery;

  const clearFilters = () => {
    setSearchQuery(''); setFilterSlugs([]); setFilterInitiatives([]);
    setFilterFileTypes([]); setFilterPlatforms([]); setFilterAspectRatios([]);
    setFilterDomainContexts([]); setFilterAssetTypes([]);
    setFilterDimensions(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterTag(''); setActiveDatePreset(''); setPage(1);
  };

  const getCurrentFilters = () => ({
    search: searchQuery || undefined,
    slugs: filterSlugs.length ? filterSlugs : undefined,
    initiatives: filterInitiatives.length ? filterInitiatives : undefined,
    fileTypes: filterFileTypes.length ? filterFileTypes : undefined,
    platforms: filterPlatforms.length ? filterPlatforms : undefined,
    aspectRatios: filterAspectRatios.length ? filterAspectRatios : undefined,
    domainContexts: filterDomainContexts.length ? filterDomainContexts : undefined,
    assetTypes: filterAssetTypes.length ? filterAssetTypes : undefined,
    dimensions: filterDimensions || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    tag: filterTag || undefined,
  });

  const applySavedSearch = (search: SavedSearch) => {
    const f = search.filters as Record<string, string | string[]>;
    setSearchQuery((f.search as string) || '');
    setFilterSlugs(Array.isArray(f.slugs) ? f.slugs : []);
    setFilterInitiatives(Array.isArray(f.initiatives) ? f.initiatives : []);
    setFilterFileTypes(Array.isArray(f.fileTypes) ? f.fileTypes : []);
    setFilterPlatforms(Array.isArray(f.platforms) ? f.platforms : []);
    setFilterAspectRatios(Array.isArray(f.aspectRatios) ? f.aspectRatios : []);
    setFilterDomainContexts(Array.isArray(f.domainContexts) ? f.domainContexts : []);
    setFilterAssetTypes(Array.isArray(f.assetTypes) ? f.assetTypes : []);
    setFilterDimensions((f.dimensions as string) || '');
    setFilterDateFrom((f.dateFrom as string) || '');
    setFilterDateTo((f.dateTo as string) || '');
    setFilterTag((f.tag as string) || '');
    setActiveDatePreset('');
    setPage(1);
  };

  const handleSaveSearch = async () => {
    if (!newSearchName || !userId) return;
    const res = await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name: newSearchName, filters: getCurrentFilters() }),
    });
    if (res.ok) {
      const saved = await res.json();
      setSavedSearches(prev => [saved, ...prev]);
      setNewSearchName('');
      setShowSaveDialog(false);
      showToast('החיפוש נשמר בהצלחה', 'success');
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    await fetch(`/api/saved-searches?id=${id}`, { method: 'DELETE' });
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  };

  const handleDownloadSingle = async (asset: Asset) => {
    try {
      showToast('מוריד קובץ...', 'info');
      const res = await fetch(`/api/assets/${asset.id}/download`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'שגיאה בהורדת הקובץ', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('הקובץ הורד בהצלחה', 'success');
    } catch {
      showToast('שגיאה בהורדת הקובץ. נסה שוב.', 'error');
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedAssets.size === 0) return;
    const selectedArray = Array.from(selectedAssets);
    if (selectedArray.length === 1) {
      const asset = assets.find(a => a.id === selectedArray[0]);
      if (asset) { handleDownloadSingle(asset); return; }
    }
    setDownloading(true);
    showToast(`מכין ZIP עם ${selectedArray.length} קבצים...`, 'info');
    try {
      const res = await fetch('/api/assets/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: selectedArray }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'שגיאה בהורדה', 'error');
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `assethub_${selectedAssets.size}_files.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('ההורדה הושלמה בהצלחה', 'success');
    } catch { showToast('שגיאה בהורדה. נסה שוב.', 'error'); }
    setDownloading(false);
  };

  const handleDownloadAllFiltered = async () => {
    if (total === 0) return;
    // Confirm for >5 files
    if (total > 5) {
      setShowDownloadConfirm({
        count: total,
        action: () => { setShowDownloadConfirm(null); executeDownloadAll(); },
      });
      return;
    }
    executeDownloadAll();
  };

  const executeDownloadAll = async () => {
    setDownloading(true);
    showToast(`מכין הורדה של ${total} חומרים...`, 'info');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterSlugs.length) params.set('slug_id', filterSlugs.join(','));
      if (filterInitiatives.length) params.set('initiative_id', filterInitiatives.join(','));
      if (filterFileTypes.length) params.set('file_type', filterFileTypes.join(','));
      if (filterPlatforms.length) params.set('platform', filterPlatforms.join(','));
      if (filterAspectRatios.length) params.set('aspect_ratio', filterAspectRatios.join(','));
      if (filterDomainContexts.length) params.set('domain_context', filterDomainContexts.join(','));
      if (filterAssetTypes.length) params.set('asset_type', filterAssetTypes.join(','));
      if (filterDimensions) params.set('dimensions', filterDimensions);
      if (filterDateFrom) params.set('date_from', filterDateFrom);
      if (filterDateTo) params.set('date_to', filterDateTo);
      if (filterTag) params.set('tag', filterTag);
      params.set('page', '1'); params.set('limit', '500');

      const listRes = await fetch(`/api/assets?${params}`);
      const listData = await listRes.json();
      const allIds = (listData.assets || []).map((a: Asset) => a.id);
      if (allIds.length === 0) { setDownloading(false); return; }
      if (allIds.length === 1) {
        const asset = listData.assets[0];
        setDownloading(false);
        handleDownloadSingle(asset);
        return;
      }

      const res = await fetch('/api/assets/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: allIds }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'שגיאה בהורדה', 'error');
        setDownloading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `assethub_all_${allIds.length}_files.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('ההורדה הושלמה בהצלחה', 'success');
    } catch { showToast('שגיאה בהורדה. נסה שוב.', 'error'); }
    setDownloading(false);
  };

  // Share selected assets
  const handleCreateShareLink = async () => {
    if (selectedAssets.size === 0) return;
    setShareCreating(true);
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: Array.from(selectedAssets),
          expires_days: parseInt(shareDays),
          created_by: userId,
          filters: hasActiveFilters ? getCurrentFilters() : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShareLink(`${window.location.origin}/shared/${data.token}`);
        showToast('קישור שיתוף נוצר בהצלחה', 'success');
      } else {
        showToast('שגיאה ביצירת קישור שיתוף', 'error');
      }
    } catch {
      showToast('שגיאה ביצירת קישור שיתוף', 'error');
    }
    setShareCreating(false);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const slugOptions = slugs.filter(s => !s.is_archived).map(s => ({
    value: s.id, label: `${s.slug.includes('-') ? '  ' : ''}${s.display_name}`,
  }));
  const initiativeOptions = initiatives.map(i => ({
    value: i.id, label: `${i.name} (${i.short_code})`,
  }));

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 space-y-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-ono-green" />
            <h1 className="text-2xl font-bold text-ono-gray-dark">ספריית חומרים</h1>
            <Badge variant="outline" className="text-xs">{total} חומרים</Badge>
            <InfoTooltip text="כאן מוצגים כל החומרים השיווקיים. ניתן לסנן, לחפש, להוריד ולשתף. לחצו על חומר לפרטים מלאים." size="md" />
          </div>
          <div className="flex items-center gap-2">
            {selectedAssets.size > 0 && (
              <Button variant="outline" size="sm" onClick={() => { setShowShareDialog(true); setShareLink(''); }} title="שתף נבחרים">
                <Share2 className="w-4 h-4" />
                <span className="mr-1 text-xs">שתף ({selectedAssets.size})</span>
              </Button>
            )}
            {total > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadAllFiltered} disabled={downloading} title="הורד הכל כ-ZIP">
                {downloading ? <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" /> : <Package className="w-4 h-4" />}
                <span className="mr-1 text-xs">הורד הכל ({total})</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => toggleSort('upload_date')} className={sortBy === 'upload_date' ? 'border-ono-green text-ono-green' : ''}>
              <ArrowUpDown className="w-3 h-3" />
              <span className="mr-1 text-xs">תאריך {sortDir === 'desc' ? '↓' : '↑'}</span>
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}><Grid3X3 className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
            <Input className="pr-10" placeholder="חיפוש לפי שם קובץ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="relative w-48">
            <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray pointer-events-none z-10" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full border border-[#E8E8E8] rounded-md p-2 pr-10 text-sm h-10 appearance-none"
            >
              <option value="">כל התגיות</option>
              {availableTags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Saved searches */}
        {savedSearches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Bookmark className="w-4 h-4 text-ono-gray shrink-0" />
            {savedSearches.map(ss => (
              <div key={ss.id} className="flex items-center gap-0.5">
                <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => applySavedSearch(ss)}>{ss.name}</Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSavedSearch(ss.id)}><X className="w-3 h-3 text-ono-gray" /></Button>
              </div>
            ))}
          </div>
        )}

        {/* Bulk actions */}
        {selectedAssets.size > 0 && (
          <div className="bg-ono-green-light border border-ono-green/30 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ono-gray-dark">{selectedAssets.size} חומרים נבחרו</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowShareDialog(true); setShareLink(''); }}>
                <Share2 className="w-4 h-4 ml-1" />
                שתף
              </Button>
              <Button size="sm" className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={handleDownloadSelected} disabled={downloading}>
                {downloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" /> : <Download className="w-4 h-4 ml-1" />}
                {selectedAssets.size === 1 ? 'הורד קובץ' : `הורד ${selectedAssets.size} קבצים (ZIP)`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedAssets(new Set())}>בטל בחירה</Button>
            </div>
          </div>
        )}

        {/* Assets grid/list */}
        {loading ? (
          <div className="text-center py-12 text-ono-gray">
            <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            טוען חומרים...
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 text-ono-gray">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
            <p>לא נמצאו חומרים התואמים את החיפוש</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(asset => (
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
                  <div className="aspect-square bg-ono-gray-light flex items-center justify-center" onClick={() => setDetailAsset(asset)}>
                    {asset.drive_view_url && asset.file_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.drive_view_url} alt={asset.original_filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileTypeIcon type={asset.file_type} size="lg" />
                    )}
                  </div>
                </div>
                <div className="p-3" onClick={() => setDetailAsset(asset)}>
                  <p className="text-xs font-medium text-ono-gray-dark truncate mb-1">
                    {(asset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || asset.original_filename}
                    {asset.domain_context && ` · ${DOMAIN_CONTEXTS.find(d => d.value === asset.domain_context)?.label || ''}`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {asset.dimensions_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.dimensions_label}</Badge>}
                    {asset.file_size_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.file_size_label}</Badge>}
                    {asset.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
                  </div>
                  <p className="text-[10px] text-ono-gray mt-1">{new Date(asset.upload_date).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ono-gray-light border-b border-[#E8E8E8]">
                  <th className="p-3 text-right w-8"><Checkbox checked={selectedAssets.size === assets.length && assets.length > 0} onCheckedChange={c => { if (c) setSelectedAssets(new Set(assets.map(a => a.id))); else setSelectedAssets(new Set()); }} /></th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">שם קובץ</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סוג</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">מידות</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark cursor-pointer" onClick={() => toggleSort('aspect_ratio')}>יחס {sortBy === 'aspect_ratio' && (sortDir === 'desc' ? '↓' : '↑')}</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">גודל</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סוג חומר</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">פלטפורמות</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark cursor-pointer" onClick={() => toggleSort('upload_date')}>תאריך {sortBy === 'upload_date' && (sortDir === 'desc' ? '↓' : '↑')}</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סלאג</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => (
                  <tr key={asset.id} className={`border-b border-[#E8E8E8] hover:bg-ono-gray-light/50 cursor-pointer ${i % 2 === 1 ? 'bg-ono-gray-light/30' : ''}`} onClick={() => setDetailAsset(asset)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}><Checkbox checked={selectedAssets.has(asset.id)} onCheckedChange={() => toggleAssetSelection(asset.id)} /></td>
                    <td className="p-3"><div className="flex items-center gap-2"><FileTypeIcon type={asset.file_type} size="sm" /><span className="text-ono-gray-dark truncate max-w-[200px]">{asset.original_filename}</span></div></td>
                    <td className="p-3 text-ono-gray">{FILE_TYPES.find(f => f.value === asset.file_type)?.label}</td>
                    <td className="p-3 text-ono-gray font-mono text-xs">{asset.dimensions_label || '—'}</td>
                    <td className="p-3 text-ono-gray font-mono text-xs">{asset.aspect_ratio || '—'}</td>
                    <td className="p-3 text-ono-gray">{asset.file_size_label || '—'}</td>
                    <td className="p-3 text-ono-gray text-xs">{ASSET_TYPES.find(t => t.value === asset.asset_type)?.label || '—'}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{asset.platforms?.map(p => <PlatformBadge key={p} platform={p} />) || <span className="text-ono-gray text-xs">—</span>}</div></td>
                    <td className="p-3 text-ono-gray text-xs">{new Date(asset.upload_date).toLocaleDateString('he-IL')}</td>
                    <td className="p-3 text-ono-gray text-xs">{(asset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 48 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button>
            <span className="text-sm text-ono-gray">עמוד {page} מתוך {Math.ceil(total / 48)}</span>
            <Button variant="outline" size="sm" disabled={page * 48 >= total} onClick={() => setPage(page + 1)}>הבא</Button>
          </div>
        )}
      </div>

      {/* Filter sidebar */}
      <aside className="w-64 shrink-0 space-y-4">
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ono-gray-dark text-sm flex items-center gap-1">סינון <InfoTooltip text="סננו חומרים לפי קריטריונים שונים. ניתן לשלב מספר פילטרים ולשמור חיפושים נפוצים." /></h3>
            <div className="flex items-center gap-1">
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(true)} className="text-xs text-ono-green h-7 px-1.5" title="שמור חיפוש"><BookmarkPlus className="w-3.5 h-3.5" /></Button>}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-ono-gray h-7 px-1.5">נקה הכל</Button>
            </div>
          </div>

          {/* Date range picker - Facebook style */}
          <div>
            <Label className="text-xs flex items-center gap-1 mb-2">טווח תאריכים <InfoTooltip text="לחצו לפתיחת לוח שנה עם פריסטים מהירים. ניתן לבחור טווח תאריכים מותאם אישית." /></Label>
            <DateRangePicker
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateChange={(from, to) => {
                setFilterDateFrom(from);
                setFilterDateTo(to);
                setActiveDatePreset('');
                setPage(1);
              }}
            />
          </div>

          <MultiCheckboxFilter label="סלאג" options={slugOptions} selected={filterSlugs} onChange={v => { setFilterSlugs(v); setPage(1); }} />
          <MultiCheckboxFilter label="קמפיין" options={initiativeOptions} selected={filterInitiatives} onChange={v => { setFilterInitiatives(v); setPage(1); }} />
          <MultiCheckboxFilter label="סוג קובץ" options={FILE_TYPES} selected={filterFileTypes} onChange={v => { setFilterFileTypes(v); setPage(1); }} />
          <MultiCheckboxFilter label="סוג חומר" options={ASSET_TYPES} selected={filterAssetTypes} onChange={v => { setFilterAssetTypes(v); setPage(1); }} />
          <MultiCheckboxFilter label="פלטפורמה" options={[...PLATFORMS, { value: 'none', label: 'ללא שיוך', color: '#888' } as { value: string; label: string; color: string }]} selected={filterPlatforms} onChange={v => { setFilterPlatforms(v); setPage(1); }} />
          <MultiCheckboxFilter label="יחס מידות" options={[...ASPECT_RATIOS, { value: 'other', label: 'אחר' }]} selected={filterAspectRatios} onChange={v => { setFilterAspectRatios(v); setPage(1); }} />

          <div>
            <Label className="text-xs">מידות מדויקות</Label>
            <Input dir="ltr" className="text-left text-xs mt-1" placeholder="1080×1920" value={filterDimensions} onChange={e => { setFilterDimensions(e.target.value); setPage(1); }} />
          </div>

          <MultiCheckboxFilter label="סוג תוכן" options={DOMAIN_CONTEXTS} selected={filterDomainContexts} onChange={v => { setFilterDomainContexts(v); setPage(1); }} />
        </div>
      </aside>

      {/* Detail Modal */}
      <Dialog open={!!detailAsset} onOpenChange={() => setDetailAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" dir="rtl">
          {detailAsset && (
            <>
              <DialogHeader><DialogTitle className="text-lg">{detailAsset.original_filename}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="bg-ono-gray-light rounded-lg flex items-center justify-center p-4 min-h-[200px]">
                  {detailAsset.drive_view_url && detailAsset.file_type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detailAsset.drive_view_url} alt={detailAsset.original_filename} className="max-h-[400px] rounded" />
                  ) : <FileTypeIcon type={detailAsset.file_type} size="lg" />}
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailAsset.dimensions_label && <Badge className="bg-ono-green-light text-ono-green-dark border-ono-green/30">{detailAsset.dimensions_label}</Badge>}
                  {detailAsset.aspect_ratio && <Badge className="bg-ono-green-light text-ono-green-dark border-ono-green/30">{detailAsset.aspect_ratio}</Badge>}
                  {detailAsset.file_size_label && <Badge variant="outline">{detailAsset.file_size_label}</Badge>}
                  {detailAsset.asset_type && <Badge variant="outline">{ASSET_TYPES.find(t => t.value === detailAsset.asset_type)?.label}</Badge>}
                  {detailAsset.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-ono-gray">סלאג:</span><span className="mr-2 text-ono-gray-dark">{(detailAsset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || '—'}</span></div>
                  <div><span className="text-ono-gray">קמפיין:</span><span className="mr-2 text-ono-gray-dark">{(detailAsset as Asset & { initiatives?: { name: string } }).initiatives?.name || '—'}</span></div>
                  <div><span className="text-ono-gray">סוג קובץ:</span><span className="mr-2 text-ono-gray-dark">{FILE_TYPES.find(f => f.value === detailAsset.file_type)?.label}</span></div>
                  <div><span className="text-ono-gray">סוג תוכן:</span><span className="mr-2 text-ono-gray-dark">{DOMAIN_CONTEXTS.find(d => d.value === detailAsset.domain_context)?.label || '—'}</span></div>
                  <div><span className="text-ono-gray">תאריך:</span><span className="mr-2 text-ono-gray-dark">{new Date(detailAsset.upload_date).toLocaleDateString('he-IL')}</span></div>
                  <div><span className="text-ono-gray">תגיות:</span><span className="mr-2 text-ono-gray-dark">{detailAsset.tags?.join(', ') || '—'}</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={() => handleDownloadSingle(detailAsset)}><Download className="w-4 h-4 ml-2" />הורד</Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedAssets(new Set([detailAsset.id]));
                    setShowShareDialog(true);
                    setShareLink('');
                    setDetailAsset(null);
                  }}><Share2 className="w-4 h-4 ml-2" />שתף</Button>
                  <Button variant="outline" onClick={async () => { await fetch(`/api/assets/${detailAsset.id}`, { method: 'DELETE' }); setDetailAsset(null); fetchAssets(); showToast('החומר הועבר לארכיון', 'success'); }}><Archive className="w-4 h-4 ml-2" />העבר לארכיון</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>שמור חיפוש</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>שם החיפוש</Label>
            <Input className="mt-1" placeholder="למשל: באנרים לרשתות חברתיות" value={newSearchName} onChange={e => setNewSearchName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveSearch} disabled={!newSearchName} className="bg-ono-green hover:bg-ono-green-dark text-white">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 className="w-5 h-5 text-ono-green" /> שיתוף חומרים</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-ono-gray">
              {selectedAssets.size} חומרים ישותפו. מי שיקבל את הקישור יוכל להוריד את הקבצים ולסנן ביניהם.
            </p>
            <div>
              <Label>תוקף השיתוף (ימים)</Label>
              <select value={shareDays} onChange={e => setShareDays(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="1">יום אחד</option>
                <option value="3">3 ימים</option>
                <option value="7">שבוע</option>
                <option value="14">שבועיים</option>
                <option value="30">חודש</option>
                <option value="90">3 חודשים</option>
              </select>
            </div>
            {shareLink ? (
              <div className="bg-ono-green-light border border-ono-green/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-ono-green shrink-0" />
                  <span className="text-sm font-medium text-ono-green-dark">קישור שיתוף נוצר!</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input dir="ltr" readOnly value={shareLink} className="text-xs text-left bg-white" />
                  <Button size="sm" variant="outline" onClick={copyShareLink}>
                    {copiedShare ? <CheckCircle className="w-4 h-4 text-ono-green" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-ono-gray">תקף ל-{shareDays} ימים. מי שיקבל את הלינק יוכל לצפות ולהוריד.</p>
              </div>
            ) : (
              <Button onClick={handleCreateShareLink} disabled={shareCreating || selectedAssets.size === 0} className="w-full bg-ono-green hover:bg-ono-green-dark text-white">
                {shareCreating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" /> : <Share2 className="w-4 h-4 ml-2" />}
                צור קישור שיתוף
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Confirmation Dialog */}
      <Dialog open={!!showDownloadConfirm} onOpenChange={() => setShowDownloadConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>אישור הורדה</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-ono-gray">
              אתה עומד להוריד {showDownloadConfirm?.count} קבצים כקובץ ZIP. האם להמשיך?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadConfirm(null)}>ביטול</Button>
            <Button onClick={() => showDownloadConfirm?.action()} className="bg-ono-green hover:bg-ono-green-dark text-white">הורד</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
