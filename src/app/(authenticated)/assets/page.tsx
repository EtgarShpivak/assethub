'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Pencil,
  Clock,
  Layers,
  Users,
  Star,
  Upload as UploadIcon,
  ScrollText,
  ExternalLink,
  Plus,
  SlidersHorizontal,
  Trash2,
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
import { useGlobalToast } from '@/components/ui/global-toast';
import { logClientError } from '@/lib/error-logger';
import type { Asset, Slug, Initiative, SavedSearch } from '@/lib/types';
import { VersionChain } from '@/components/assets/version-chain';
import { PlatformSuggestion } from '@/components/assets/platform-suggestion';
import { SimilarAssets } from '@/components/assets/similar-assets';
import { FolderBrowser } from '@/components/assets/folder-browser';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CommentThread } from '@/components/assets/comment-thread';
import { useComments } from '@/lib/hooks/use-comments';
import { FolderTree } from 'lucide-react';

function FileTypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5';
  switch (type) {
    case 'image': return <ImageIcon className={`${cls} text-ono-green`} />;
    case 'video': return <Film className={`${cls} text-platform-meta`} />;
    case 'pdf': return <FileText className={`${cls} text-platform-google`} />;
    case 'newsletter': return <Newspaper className={`${cls} text-ono-orange`} />;
    case 'brief': return <ScrollText className={`${cls} text-sky-600`} />;
    case 'link': return <ExternalLink className={`${cls} text-purple-600`} />;
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
  counts,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  counts?: Record<string, number>;
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
            {counts && counts[opt.value] !== undefined && (
              <span className="text-[10px] text-ono-gray mr-auto">({counts[opt.value]})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// Toast is now provided globally via ToastProvider in app-layout

// Comment thread wrapper that uses the useComments hook
function CommentThreadSection({ assetId, userId }: { assetId: string; userId: string | null }) {
  const { comments, addComment, deleteComment, isLoading } = useComments(assetId);
  if (isLoading) return <p className="text-xs text-ono-gray">טוען הערות...</p>;
  return (
    <CommentThread
      comments={comments}
      currentUserId={userId}
      onAddComment={addComment}
      onDeleteComment={deleteComment}
    />
  );
}

export default function AssetLibraryPage() {
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [filterCounts, setFilterCounts] = useState<Record<string, Record<string, number>>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // Multi-select filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterSlugs, setFilterSlugs] = useState<string[]>(searchParams.get('slug_id') ? searchParams.get('slug_id')!.split(',') : []);
  const [filterInitiatives, setFilterInitiatives] = useState<string[]>(searchParams.get('initiative_id') ? searchParams.get('initiative_id')!.split(',') : []);
  const [filterFileTypes, setFilterFileTypes] = useState<string[]>(searchParams.get('file_type') ? searchParams.get('file_type')!.split(',') : []);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [filterAspectRatios, setFilterAspectRatios] = useState<string[]>([]);
  const [filterDomainContexts, setFilterDomainContexts] = useState<string[]>([]);
  const [filterAssetTypes, setFilterAssetTypes] = useState<string[]>([]);
  const [filterDimensions, setFilterDimensions] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('date_from') || '');
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('date_to') || '');
  const [filterTag, setFilterTag] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [filterExpiry, setFilterExpiry] = useState(searchParams.get('expiry') || '');
  const [filterUploadedBy, setFilterUploadedBy] = useState(searchParams.get('uploaded_by') || '');
  const [uploaders, setUploaders] = useState<{ id: string; name: string }[]>([]);
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

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
  // "My assets" mode
  const showMyAssets = searchParams.get('my') === 'true';

  // Share dialog
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareDays, setShareDays] = useState('7');
  const [shareLink, setShareLink] = useState('');
  const [shareCreating, setShareCreating] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState<{ count: number; action: () => void } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<Asset | null>(null);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const initialLoad = useRef(true);

  // Edit mode for detail modal
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Asset>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Quick-create in edit mode
  const [userCanManage, setUserCanManage] = useState(false);
  const [showQuickSlug, setShowQuickSlug] = useState(false);
  const [quickSlugName, setQuickSlugName] = useState('');
  const [quickSlugCode, setQuickSlugCode] = useState('');
  const [quickSlugParent, setQuickSlugParent] = useState('');
  const [quickSlugSaving, setQuickSlugSaving] = useState(false);
  const [quickSlugError, setQuickSlugError] = useState('');
  const [showQuickInit, setShowQuickInit] = useState(false);
  const [quickInitName, setQuickInitName] = useState('');
  const [quickInitCode, setQuickInitCode] = useState('');
  const [quickInitSaving, setQuickInitSaving] = useState(false);
  const [quickInitError, setQuickInitError] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [showEditTagSuggestions, setShowEditTagSuggestions] = useState(false);

  // Advanced search
  type AdvancedCondition = {
    id: string;
    field: 'search' | 'slug' | 'campaign' | 'tag' | 'file_type' | 'platform' | 'domain_context' | 'asset_type';
    value: string;
    operator: 'AND' | 'OR';
  };
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([
    { id: '1', field: 'search', value: '', operator: 'AND' },
  ]);

  // Bulk edit
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    tags_action?: 'add' | 'set';
    tags?: string;
    platforms?: string[];
    domain_context?: string;
    initiative_id?: string;
    asset_type?: string;
  }>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Comments — now handled by CommentThread component via useComments hook

  const { showError: _showError, showSuccess: _showSuccess, showInfo: _showInfo } = useGlobalToast();

  // Bridge: map old showToast(msg, type) API to global toast
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (type === 'error') _showError(message);
    else if (type === 'success') _showSuccess(message);
    else _showInfo(message);
  }, [_showError, _showSuccess, _showInfo]);

  // Get user ID from Supabase auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Check permissions for quick-create actions
  useEffect(() => {
    fetch('/api/users/me').then(r => r.ok ? r.json() : null).then(profile => {
      if (profile?.permissions?.can_manage_campaigns) setUserCanManage(true);
    }).catch(() => {});
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
    if (filterExpiry) params.set('expiry', filterExpiry);
    if (filterUploadedBy) params.set('uploaded_by', filterUploadedBy);
    if (searchParams.get('unclassified')) params.set('unclassified', 'true');
    if (showFavoritesOnly) params.set('favorites_only', 'true');
    if (showMyAssets && userId) params.set('uploaded_by', userId);
    // Advanced search conditions
    const activeAdvanced = advancedConditions.filter(c => c.value.trim());
    if (showAdvancedSearch && activeAdvanced.length > 0) {
      params.set('advanced', JSON.stringify(activeAdvanced.map(c => ({ field: c.field, value: c.value, operator: c.operator }))));
    }
    params.set('page', page.toString());
    params.set('sort_by', sortBy);
    params.set('sort_dir', sortDir);

    try {
      // Fetch assets and filtered counts in parallel
      const countsParams = new URLSearchParams(params);
      countsParams.delete('page'); countsParams.delete('sort_by'); countsParams.delete('sort_dir'); countsParams.delete('limit');
      const [res, countsRes] = await Promise.all([
        fetch(`/api/assets?${params}`),
        fetch(`/api/assets/counts?${countsParams}`),
      ]);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
      if (data.uploaders) setUploaders(data.uploaders);
      const counts = await countsRes.json().catch(() => null);
      if (counts && !counts.error) {
        setFilterCounts({
          file_types: counts.file_types || {},
          platforms: counts.platforms || {},
          aspect_ratios: counts.aspect_ratios || {},
          domain_contexts: counts.domain_contexts || {},
          asset_types: counts.asset_types || {},
          slugs: counts.slugs || {},
          initiatives: counts.initiatives || {},
        });
      }
    } catch {
      _showError('שגיאה בטעינת חומרים', 'לא ניתן היה לטעון את הנתונים מהשרת.', 'רענן את הדף ונסה שוב. אם הבעיה נמשכת, פנה למנהל המערכת.');
      logClientError('assets-fetch', 'Failed to fetch assets');
    }
    setLoading(false);
  }, [searchQuery, filterSlugs, filterInitiatives, filterFileTypes, filterPlatforms,
      filterAspectRatios, filterDomainContexts, filterAssetTypes, filterDimensions,
      filterDateFrom, filterDateTo, filterTag, filterExpiry, filterUploadedBy, page, sortBy, sortDir, searchParams, _showError, showFavoritesOnly, showMyAssets, userId, showAdvancedSearch, advancedConditions]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // Load slugs, initiatives, tags, and global total once
  useEffect(() => {
    Promise.all([
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/initiatives').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
      fetch('/api/assets/counts').then(r => r.json()).catch(() => ({})),
    ]).then(([sl, ini, tags, counts]) => {
      setSlugs(sl);
      setInitiatives(ini);
      setAvailableTags(tags || []);
      if (counts && counts.total) setGlobalTotal(counts.total);
      initialLoad.current = false;
    });
  }, []);

  // Debounced search
  useEffect(() => {
    if (initialLoad.current) return;
    const timer = setTimeout(() => { setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterTag]);

  // Reset edit mode when detail modal opens
  useEffect(() => {
    if (detailAsset) {
      setEditMode(false);
    }
  }, [detailAsset]);

  // Handle direct asset link (?id=ASSET_ID) — open detail modal
  const directIdFetched = useRef<string | null>(null);
  useEffect(() => {
    const directId = searchParams.get('id');
    if (!directId || detailAsset?.id === directId) return;
    if (directIdFetched.current === directId) return; // already attempted
    // Check if already loaded
    const found = assets.find(a => a.id === directId);
    if (found) { setDetailAsset(found); directIdFetched.current = directId; return; }
    // Fetch directly if not in current page
    if (!loading) {
      directIdFetched.current = directId;
      fetch(`/api/assets/${directId}`).then(r => r.ok ? r.json() : null).then(data => {
        if (data) setDetailAsset(data);
        else showToast('החומר המבוקש לא נמצא', 'error');
      }).catch(() => { showToast('שגיאה בטעינת החומר', 'error'); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, assets, loading]);

  useEffect(() => {
    fetch('/api/favorites').then(r => r.ok ? r.json() : []).then(ids => {
      if (Array.isArray(ids)) setFavorites(new Set(ids));
    }).catch(() => {});
  }, []);

  const toggleFavorite = async (assetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const wasFav = favorites.has(assetId);
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (wasFav) next.delete(assetId); else next.add(assetId);
      return next;
    });
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(assetId); else next.delete(assetId);
        return next;
      });
    }
  };

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
    filterDimensions || filterDateFrom || filterDateTo || filterTag || filterExpiry || filterUploadedBy || searchQuery ||
    (showAdvancedSearch && advancedConditions.some(c => c.value.trim()));

  const clearFilters = () => {
    setSearchQuery(''); setFilterSlugs([]); setFilterInitiatives([]);
    setFilterFileTypes([]); setFilterPlatforms([]); setFilterAspectRatios([]);
    setFilterDomainContexts([]); setFilterAssetTypes([]);
    setFilterDimensions(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterTag(''); setFilterExpiry(''); setFilterUploadedBy(''); setActiveDatePreset(''); setPage(1);
    setShowAdvancedSearch(false);
    setAdvancedConditions([{ id: '1', field: 'search', value: '', operator: 'AND' }]);
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
    expiry: filterExpiry || undefined,
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
    setFilterExpiry((f.expiry as string) || '');
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
      _showError('שגיאה בהורדת הקובץ', 'לא ניתן היה להוריד את הקובץ מהאחסון.', 'נסה שוב. אם הבעיה נמשכת, ייתכן שהקובץ נמחק מהאחסון.');
      logClientError('download-single', `Failed to download: ${asset.original_filename}`, asset.original_filename);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedAssets.size === 0) return;
    const selectedArray = Array.from(selectedAssets);
    if (selectedArray.length === 1) {
      const asset = assets.find(a => a.id === selectedArray[0]);
      if (asset) {
        // Link assets open in new tab instead of downloading
        if (asset.file_type === 'link' && asset.external_url) {
          window.open(asset.external_url, '_blank');
          return;
        }
        handleDownloadSingle(asset);
        return;
      }
    }
    // Filter out link assets from bulk download
    const downloadableIds = selectedArray.filter(id => {
      const a = assets.find(x => x.id === id);
      return a && a.file_type !== 'link';
    });
    if (downloadableIds.length === 0) {
      showToast('קישורים לא ניתנים להורדה כקבצים', 'info');
      return;
    }
    const skippedLinks = selectedArray.length - downloadableIds.length;
    setDownloading(true);
    showToast(`מכין ZIP עם ${downloadableIds.length} קבצים...${skippedLinks > 0 ? ` (${skippedLinks} קישורים לא כלולים)` : ''}`, 'info');
    try {
      const res = await fetch('/api/assets/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_ids: downloadableIds }),
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
      // Filter out link assets — they have no files to download
      const downloadableAssets = (listData.assets || []).filter((a: Asset) => a.file_type !== 'link');
      const linkCount = (listData.assets || []).length - downloadableAssets.length;
      const allIds = downloadableAssets.map((a: Asset) => a.id);
      if (allIds.length === 0) {
        setDownloading(false);
        if (linkCount > 0) showToast(`${linkCount} קישורים לא ניתנים להורדה — פתח אותם ישירות`, 'info');
        return;
      }
      if (linkCount > 0) showToast(`${linkCount} קישורים דולגו — רק קבצים נכללים בהורדה`, 'info');
      if (allIds.length === 1) {
        const asset = downloadableAssets[0];
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

  // ===== Inline Edit =====
  const startEdit = (asset: Asset) => {
    setEditMode(true);
    setEditData({
      tags: asset.tags || [],
      platforms: asset.platforms || [],
      domain_context: asset.domain_context || undefined,
      initiative_id: asset.initiative_id || undefined,
      asset_type: asset.asset_type,
      notes: asset.notes || '',
      slug_id: asset.slug_id,
      expires_at: asset.expires_at || undefined,
      license_notes: asset.license_notes || '',
    });
  };

  const saveEdit = async () => {
    if (!detailAsset) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/assets/${detailAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetailAsset({ ...detailAsset, ...updated });
        setEditMode(false);
        fetchAssets();
        showToast('החומר עודכן בהצלחה', 'success');
        // Log activity
        fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', entity_type: 'asset', entity_id: detailAsset.id, entity_name: detailAsset.original_filename })
        }).catch(() => {});
      } else {
        showToast('שגיאה בעדכון', 'error');
      }
    } catch { showToast('שגיאה בעדכון', 'error'); }
    setEditSaving(false);
  };

  // ===== Bulk Edit =====
  const handleBulkEdit = async () => {
    if (selectedAssets.size === 0) return;
    setBulkSaving(true);
    const ids = Array.from(selectedAssets);
    let successCount = 0;
    for (const id of ids) {
      const patchData: Record<string, unknown> = {};
      if (bulkEditData.domain_context) patchData.domain_context = bulkEditData.domain_context;
      if (bulkEditData.initiative_id) patchData.initiative_id = bulkEditData.initiative_id;
      if (bulkEditData.asset_type) patchData.asset_type = bulkEditData.asset_type;
      if (bulkEditData.platforms && bulkEditData.platforms.length > 0) patchData.platforms = bulkEditData.platforms;
      if (bulkEditData.tags) {
        const newTags = bulkEditData.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (bulkEditData.tags_action === 'add') {
          const asset = assets.find(a => a.id === id);
          const existing = asset?.tags || [];
          patchData.tags = Array.from(new Set([...existing, ...newTags]));
        } else {
          patchData.tags = newTags;
        }
      }
      if (Object.keys(patchData).length > 0) {
        const res = await fetch(`/api/assets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchData),
        });
        if (res.ok) successCount++;
      }
    }
    setBulkSaving(false);
    setShowBulkEdit(false);
    setBulkEditData({});
    setSelectedAssets(new Set());
    fetchAssets();
    showToast(`${successCount} חומרים עודכנו בהצלחה`, 'success');
  };

  // ===== Version Upload =====
  const [versionUploading, setVersionUploading] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const handleVersionUpload = async (file: File) => {
    if (!detailAsset) return;
    setVersionUploading(true);
    try {
      // Get current asset's max version
      const currentVersion = detailAsset.version || 1;
      const parentId = detailAsset.parent_asset_id || detailAsset.id;

      // Use prepare → upload → complete flow
      const prepareRes = await fetch('/api/upload/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ name: file.name, size: file.size, type: file.type }],
          slug_id: detailAsset.slug_id,
          workspace_id: detailAsset.workspace_id,
          initiative_id: detailAsset.initiative_id || undefined,
          upload_date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!prepareRes.ok) { showToast('שגיאה בהכנת ההעלאה', 'error'); setVersionUploading(false); return; }
      const prepareData = await prepareRes.json();
      const prepared = prepareData.files?.[0];
      if (!prepared) { showToast('שגיאה בהכנת ההעלאה', 'error'); setVersionUploading(false); return; }

      // Upload via XHR
      const uploadOk = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', prepared.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
        xhr.onerror = () => resolve(false);
        xhr.send(file);
      });

      if (!uploadOk) { showToast('שגיאה בהעלאת הקובץ', 'error'); setVersionUploading(false); return; }

      // Complete — create DB record
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{
            originalName: file.name,
            storagePath: prepared.storagePath,
            size: file.size,
            type: file.type,
            fileType: prepared.fileType,
          }],
          slug_id: detailAsset.slug_id,
          workspace_id: detailAsset.workspace_id,
          initiative_id: detailAsset.initiative_id || undefined,
          domain_context: detailAsset.domain_context || undefined,
          platforms: detailAsset.platforms || undefined,
          tags: detailAsset.tags || undefined,
          upload_date: new Date().toISOString().split('T')[0],
          asset_type: detailAsset.asset_type,
          parent_asset_id: parentId,
          version: currentVersion + 1,
        }),
      });

      if (completeRes.ok) {
        const completeData = await completeRes.json();
        showToast(`גרסה ${currentVersion + 1} הועלתה בהצלחה`, 'success');
        fetchAssets();
        // Show the new version in the detail modal instead of closing
        if (completeData.uploaded?.[0]) {
          setDetailAsset(completeData.uploaded[0]);
        }
      } else {
        showToast('שגיאה ביצירת הרשומה', 'error');
      }
    } catch {
      showToast('שגיאה בהעלאת גרסה חדשה', 'error');
    }
    setVersionUploading(false);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  // Quick slug creation from edit mode
  const handleQuickCreateSlug = async () => {
    if (!quickSlugName || !quickSlugCode) return;
    setQuickSlugSaving(true);
    setQuickSlugError('');
    const finalSlug = quickSlugParent ? `${quickSlugParent}-${quickSlugCode}` : quickSlugCode;
    try {
      const wsRes = await fetch('/api/workspaces');
      if (!wsRes.ok) { setQuickSlugError('שגיאה בטעינת סביבת עבודה'); setQuickSlugSaving(false); return; }
      const ws = await wsRes.json();
      if (!ws[0]?.id) { setQuickSlugError('לא נמצאה סביבת עבודה'); setQuickSlugSaving(false); return; }
      const res = await fetch('/api/slugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: finalSlug, display_name: quickSlugName, workspace_id: ws[0].id }),
      });
      if (!res.ok) { const d = await res.json(); setQuickSlugError(d.error || 'שגיאה'); setQuickSlugSaving(false); return; }
      const created = await res.json();
      const allSl = await fetch('/api/slugs').then(r => r.json());
      setSlugs(allSl);
      setEditData(prev => ({ ...prev, slug_id: created.id }));
      setShowQuickSlug(false);
      setQuickSlugName(''); setQuickSlugCode(''); setQuickSlugParent('');
      _showSuccess('הסלאג נוצר בהצלחה');
    } catch { setQuickSlugError('שגיאה ביצירת סלאג'); }
    setQuickSlugSaving(false);
  };

  // Quick initiative creation from edit mode
  const handleQuickCreateInit = async () => {
    if (!quickInitName || !quickInitCode) return;
    setQuickInitSaving(true);
    setQuickInitError('');
    try {
      const wsRes = await fetch('/api/workspaces');
      if (!wsRes.ok) { setQuickInitError('שגיאה בטעינת סביבת עבודה'); setQuickInitSaving(false); return; }
      const ws = await wsRes.json();
      if (!ws[0]?.id) { setQuickInitError('לא נמצאה סביבת עבודה'); setQuickInitSaving(false); return; }
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: quickInitName, short_code: quickInitCode, slug_id: editData.slug_id || null, workspace_id: ws[0].id }),
      });
      if (!res.ok) { const d = await res.json(); setQuickInitError(d.error || 'שגיאה'); setQuickInitSaving(false); return; }
      const created = await res.json();
      const allIni = await fetch('/api/initiatives').then(r => r.json());
      setInitiatives(allIni);
      setEditData(prev => ({ ...prev, initiative_id: created.id }));
      setShowQuickInit(false);
      setQuickInitName(''); setQuickInitCode('');
      _showSuccess('הקמפיין נוצר בהצלחה');
    } catch { setQuickInitError('שגיאה ביצירת קמפיין'); }
    setQuickInitSaving(false);
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
            <h1 className="text-2xl font-bold text-ono-gray-dark">
              {showMyAssets ? 'הנכסים שלי' : showFavoritesOnly ? 'מועדפים' : 'ספריית חומרים'}
            </h1>
            <Badge variant="outline" className="text-xs">
              {hasActiveFilters && globalTotal > 0 ? `${total} מתוך ${globalTotal} חומרים` : `${total} חומרים`}
            </Badge>
            <InfoTooltip text="כאן מוצגים כל החומרים השיווקיים. ניתן לסנן, לחפש, להוריד ולשתף. לחצו על חומר לפרטים מלאים." size="md" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/upload">
              <Button size="sm" className="bg-ono-green hover:bg-ono-green-dark text-white">
                <UploadIcon className="w-4 h-4" />
                <span className="mr-1 text-xs">העלאת חומרים</span>
              </Button>
            </Link>
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
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setShowFavoritesOnly(prev => !prev); setPage(1); }}
              className={showFavoritesOnly ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
              title="הצג מועדפים בלבד"
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              {favorites.size > 0 && <span className="mr-1 text-xs">{favorites.size}</span>}
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''} title="תצוגת רשת"><Grid3X3 className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''} title="תצוגת רשימה"><List className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'tree' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('tree')} className={viewMode === 'tree' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''} title="תצוגת תיקיות"><FolderTree className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Search bar + quick filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
            <Input className="pr-10" placeholder="חיפוש לפי שם קובץ, סלאג, קמפיין, תגיות או הערות..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {/* Slug quick filter — searchable */}
          <SearchableSelect
            className="min-w-[160px]"
            options={slugs.filter(s => !s.is_archived).map(s => ({
              value: s.id,
              label: s.display_name,
              sublabel: s.slug,
              indent: s.slug.includes('-'),
            }))}
            value={filterSlugs.length === 1 ? filterSlugs[0] : ''}
            onChange={(v) => { setFilterSlugs(v ? [v] : []); setPage(1); }}
            placeholder="חיפוש סלאג..."
            emptyOptionLabel="כל הסלאגים"
            emptyLabel="לא נמצאו סלאגים"
            allowEmpty
          />
          {/* Campaign quick filter — searchable */}
          <SearchableSelect
            className="min-w-[160px]"
            options={[
              { value: '__no_initiative__', label: 'ללא קמפיין' },
              ...initiatives.map(i => ({
                value: i.id,
                label: i.name,
                sublabel: i.short_code,
              })),
            ]}
            value={filterInitiatives.length === 1 ? filterInitiatives[0] : ''}
            onChange={(v) => { setFilterInitiatives(v ? [v] : []); setPage(1); }}
            placeholder="חיפוש קמפיין..."
            emptyOptionLabel="כל הקמפיינים"
            emptyLabel="לא נמצאו קמפיינים"
            allowEmpty
          />
          {/* Tag quick filter — searchable */}
          <div className="relative min-w-[160px]">
            <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray pointer-events-none z-10" />
            {filterTag ? (
              <div className="flex items-center border border-ono-green/50 bg-ono-green-light/30 rounded-md h-10 px-2 pr-10 text-sm gap-1">
                <span className="truncate text-ono-gray-dark">{filterTag === '__no_tags__' ? 'ללא תגיות' : filterTag}</span>
                <button className="shrink-0 mr-auto hover:text-red-500 transition-colors" onClick={() => { setFilterTag(''); setTagSearchQuery(''); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Input
                className="pr-10 h-10"
                placeholder="חיפוש תגית..."
                value={tagSearchQuery}
                onChange={e => { setTagSearchQuery(e.target.value); setShowTagDropdown(true); }}
                onFocus={() => setShowTagDropdown(true)}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
              />
            )}
            {showTagDropdown && !filterTag && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-[#E8E8E8] rounded-md shadow-lg max-h-48 overflow-auto">
                <button type="button" className="w-full text-right px-3 py-1.5 text-sm hover:bg-ono-gray-light transition-colors text-ono-gray" onMouseDown={e => { e.preventDefault(); setFilterTag('__no_tags__'); setTagSearchQuery(''); setShowTagDropdown(false); setPage(1); }}>
                  ללא תגיות
                </button>
                {availableTags
                  .filter(t => !tagSearchQuery || t.name.includes(tagSearchQuery))
                  .map(t => (
                    <button key={t.name} type="button" className="w-full text-right px-3 py-1.5 text-sm hover:bg-ono-green-light/50 transition-colors flex items-center justify-between" onMouseDown={e => { e.preventDefault(); setFilterTag(t.name); setTagSearchQuery(''); setShowTagDropdown(false); setPage(1); }}>
                      <span>{t.name}</span>
                      <span className="text-[10px] text-ono-gray">({t.count})</span>
                    </button>
                  ))}
                {tagSearchQuery && !availableTags.some(t => t.name.includes(tagSearchQuery)) && (
                  <p className="px-3 py-2 text-xs text-ono-gray">לא נמצאו תגיות</p>
                )}
              </div>
            )}
          </div>
          {/* Advanced search toggle */}
          <Button
            variant={showAdvancedSearch ? 'default' : 'outline'}
            size="sm"
            className={`h-10 px-3 shrink-0 ${showAdvancedSearch ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}`}
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            title="חיפוש מתקדם"
          >
            <SlidersHorizontal className="w-4 h-4 ml-1" />
            מתקדם
          </Button>
        </div>

        {/* Advanced search panel */}
        {showAdvancedSearch && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 shadow-[0_1px_4px_rgba(0,0,0,0.07)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-ono-green" />
                חיפוש מתקדם
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-ono-gray" onClick={() => {
                  setAdvancedConditions([{ id: '1', field: 'search', value: '', operator: 'AND' }]);
                }}>
                  נקה תנאים
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setShowAdvancedSearch(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-ono-gray">הגדירו תנאי חיפוש מרובים עם אופרטורים AND (וגם) / OR (או) ביניהם.</p>

            <div className="space-y-2">
              {advancedConditions.map((condition, idx) => (
                <div key={condition.id} className="flex items-center gap-2 flex-wrap">
                  {/* Operator (shown for 2nd row onward) */}
                  {idx > 0 && (
                    <select
                      value={condition.operator}
                      onChange={(e) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, operator: e.target.value as 'AND' | 'OR' } : c
                        ));
                      }}
                      className="border border-[#E8E8E8] rounded-md px-2 py-1.5 text-xs font-bold bg-ono-gray-light w-[70px] text-center"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  {idx === 0 && <div className="w-[70px] shrink-0" />}

                  {/* Field selector */}
                  <select
                    value={condition.field}
                    onChange={(e) => {
                      setAdvancedConditions(prev => prev.map(c =>
                        c.id === condition.id ? { ...c, field: e.target.value as AdvancedCondition['field'], value: '' } : c
                      ));
                    }}
                    className="border border-[#E8E8E8] rounded-md px-2 py-1.5 text-sm min-w-[130px]"
                  >
                    <option value="search">טקסט חופשי</option>
                    <option value="tag">תגית</option>
                    <option value="slug">סלאג</option>
                    <option value="campaign">קמפיין</option>
                    <option value="file_type">סוג קובץ</option>
                    <option value="platform">פלטפורמה</option>
                    <option value="domain_context">סוג תוכן</option>
                    <option value="asset_type">סוג חומר</option>
                  </select>

                  {/* Value input — varies by field type */}
                  {condition.field === 'search' && (
                    <Input
                      className="flex-1 min-w-[200px] h-[34px] text-sm"
                      placeholder="הקלד טקסט לחיפוש..."
                      value={condition.value}
                      onChange={(e) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: e.target.value } : c
                        ));
                      }}
                    />
                  )}
                  {condition.field === 'tag' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={availableTags.map(t => ({ value: t.name, label: t.name, sublabel: `(${t.count})` }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר תגית..."
                      emptyLabel="לא נמצאו תגיות"
                    />
                  )}
                  {condition.field === 'slug' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={slugs.filter(s => !s.is_archived).map(s => ({ value: s.id, label: s.display_name, sublabel: s.slug, indent: s.slug.includes('-') }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר סלאג..."
                      emptyLabel="לא נמצאו סלאגים"
                    />
                  )}
                  {condition.field === 'campaign' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={initiatives.map(i => ({ value: i.id, label: i.name, sublabel: i.short_code }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר קמפיין..."
                      emptyLabel="לא נמצאו קמפיינים"
                    />
                  )}
                  {condition.field === 'file_type' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={FILE_TYPES.map(ft => ({ value: ft.value, label: ft.label }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר סוג קובץ..."
                      emptyLabel="לא נמצאו סוגי קבצים"
                    />
                  )}
                  {condition.field === 'platform' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={PLATFORMS.map(p => ({ value: p.value, label: p.label }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר פלטפורמה..."
                      emptyLabel="לא נמצאו פלטפורמות"
                    />
                  )}
                  {condition.field === 'domain_context' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={DOMAIN_CONTEXTS.map(dc => ({ value: dc.value, label: dc.label }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר סוג תוכן..."
                      emptyLabel="לא נמצאו סוגי תוכן"
                    />
                  )}
                  {condition.field === 'asset_type' && (
                    <SearchableSelect
                      className="flex-1 min-w-[200px]"
                      options={ASSET_TYPES.map(at => ({ value: at.value, label: at.label }))}
                      value={condition.value}
                      onChange={(v) => {
                        setAdvancedConditions(prev => prev.map(c =>
                          c.id === condition.id ? { ...c, value: v } : c
                        ));
                      }}
                      placeholder="בחר סוג חומר..."
                      emptyLabel="לא נמצאו סוגי חומרים"
                    />
                  )}

                  {/* Delete condition */}
                  {advancedConditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-ono-gray hover:text-red-500 shrink-0"
                      onClick={() => setAdvancedConditions(prev => prev.filter(c => c.id !== condition.id))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add condition button */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const newId = Date.now().toString();
                setAdvancedConditions(prev => [...prev, { id: newId, field: 'search', value: '', operator: 'AND' }]);
              }}
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              הוסף תנאי
            </Button>
          </div>
        )}

        {/* Saved searches + save button */}
        <div className="flex items-center gap-2 flex-wrap">
          {savedSearches.length > 0 && (
            <>
              <Bookmark className="w-4 h-4 text-ono-gray shrink-0" />
              {savedSearches.map(ss => (
                <div key={ss.id} className="flex items-center gap-0.5">
                  <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => applySavedSearch(ss)}>{ss.name}</Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSavedSearch(ss.id)}><X className="w-3 h-3 text-ono-gray" /></Button>
                </div>
              ))}
            </>
          )}
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-ono-green text-ono-green hover:bg-ono-green-light" onClick={() => setShowSaveDialog(true)}>
              <BookmarkPlus className="w-3.5 h-3.5 ml-1" />
              שמור חיפוש
            </Button>
          )}
        </div>

        {/* Bulk actions */}
        {selectedAssets.size > 0 && (
          <div className="bg-ono-green-light border border-ono-green/30 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ono-gray-dark">{selectedAssets.size} חומרים נבחרו</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setShowShareDialog(true); setShareLink(''); }}>
                <Share2 className="w-4 h-4 ml-1" />
                שתף
              </Button>
              <Button size="sm" variant="outline" onClick={async () => {
                const ids = Array.from(selectedAssets);
                for (const id of ids) {
                  if (!favorites.has(id)) {
                    await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: id }) });
                  }
                }
                setFavorites(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
                showToast(`${ids.length} חומרים נוספו למועדפים`, 'success');
              }}>
                <Star className="w-4 h-4 ml-1" />
                הוסף למועדפים
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowBulkEdit(true)}>
                <Pencil className="w-4 h-4 ml-1" />
                ערוך נבחרים
              </Button>
              <Button size="sm" className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={handleDownloadSelected} disabled={downloading}>
                {downloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" /> : <Download className="w-4 h-4 ml-1" />}
                {selectedAssets.size === 1 ? 'הורד קובץ' : `הורד ${selectedAssets.size} קבצים (ZIP)`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedAssets(new Set())}>בטל בחירה</Button>
            </div>
          </div>
        )}

        {/* Folder browser (Drive-like navigation) — shown above assets in tree mode */}
        {viewMode === 'tree' && (
          <FolderBrowser
            slugs={slugs}
            initiatives={initiatives}
            filterCounts={filterCounts.slugs}
            initiativeCounts={filterCounts.initiatives}
            currentSlugId={filterSlugs.length === 1 ? filterSlugs[0] : null}
            onNavigate={(slugId) => {
              if (slugId) { setFilterSlugs([slugId]); } else { setFilterSlugs([]); }
              setPage(1);
            }}
            onFilterByInitiative={(id) => { setFilterInitiatives([id]); setPage(1); }}
          />
        )}

        {/* Assets grid/list */}
        {loading ? (
          <div className="text-center py-12 text-ono-gray">
            <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            טוען חומרים...
          </div>
        ) : assets.length === 0 && viewMode !== 'tree' ? (
          <div className="text-center py-12 text-ono-gray">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
            <p>לא נמצאו חומרים התואמים את החיפוש</p>
          </div>
        ) : viewMode === 'grid' || (viewMode === 'tree' && assets.length > 0) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className={`group bg-white border rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden cursor-pointer transition-all hover:border-ono-green ${selectedAssets.has(asset.id) ? 'border-ono-green ring-2 ring-ono-green/20' : 'border-[#E8E8E8]'}`}>
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
                  {/* Favorite button */}
                  <button
                    className={`absolute bottom-2 right-2 z-10 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${favorites.has(asset.id) ? 'bg-yellow-400 border-yellow-500 text-white opacity-100' : 'bg-white/90 border-[#E8E8E8] opacity-0 group-hover:opacity-100 hover:bg-yellow-400 hover:text-white hover:border-yellow-500'}`}
                    onClick={(e) => toggleFavorite(asset.id, e)}
                    title={favorites.has(asset.id) ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                  >
                    <Star className={`w-3.5 h-3.5 ${favorites.has(asset.id) ? 'fill-current' : ''}`} />
                  </button>
                  {/* Quick download / open link button */}
                  {asset.file_type === 'link' && asset.external_url ? (
                    <button
                      className="absolute bottom-2 left-2 z-10 w-7 h-7 rounded-full bg-white/90 border border-[#E8E8E8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-600 hover:text-white hover:border-purple-600"
                      onClick={(e) => { e.stopPropagation(); window.open(asset.external_url!, '_blank'); }}
                      title="פתח קישור"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      className="absolute bottom-2 left-2 z-10 w-7 h-7 rounded-full bg-white/90 border border-[#E8E8E8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ono-green hover:text-white hover:border-ono-green"
                      onClick={(e) => { e.stopPropagation(); handleDownloadSingle(asset); }}
                      title="הורד קובץ"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="aspect-square bg-ono-gray-light flex items-center justify-center relative" onClick={() => setDetailAsset(asset)}>
                    {asset.file_type === 'link' ? (
                      <div className="flex flex-col items-center gap-2">
                        <ExternalLink className="w-12 h-12 text-purple-500" />
                        {asset.external_url && (
                          <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full max-w-[90%] truncate">
                            {(() => { try { return new URL(asset.external_url).hostname; } catch { return 'קישור'; } })()}
                          </span>
                        )}
                      </div>
                    ) : asset.drive_view_url && asset.file_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.drive_view_url} alt={asset.original_filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : asset.drive_view_url && asset.file_type === 'video' ? (
                      <>
                        <video src={asset.drive_view_url} className="w-full h-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Film className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <FileTypeIcon type={asset.file_type} size="lg" />
                    )}
                  </div>
                </div>
                <div className="p-3" onClick={() => setDetailAsset(asset)}>
                  <p className="text-xs font-medium text-ono-gray-dark truncate mb-0.5">
                    {asset.stored_filename || asset.original_filename}
                  </p>
                  <p className="text-[10px] text-ono-gray truncate mb-1">
                    {asset.stored_filename && asset.original_filename !== asset.stored_filename ? asset.original_filename : ''}
                    {asset.domain_context ? `${asset.stored_filename && asset.original_filename !== asset.stored_filename ? ' · ' : ''}${DOMAIN_CONTEXTS.find(d => d.value === asset.domain_context)?.label || ''}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {asset.dimensions_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.dimensions_label}</Badge>}
                    {asset.file_size_label && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.file_size_label}</Badge>}
                    {asset.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
                    {asset.expires_at && (
                      <Badge variant="outline" className={`text-[10px] ${new Date(asset.expires_at) < new Date() ? 'border-red-300 text-red-600' : 'border-orange-300 text-orange-600'}`}>
                        <Clock className="w-3 h-3 ml-0.5" />
                        {new Date(asset.expires_at) < new Date() ? 'פג תוקף' : `עד ${new Date(asset.expires_at).toLocaleDateString('he-IL')}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-ono-gray mt-1">
                    {new Date(asset.upload_date).toLocaleDateString('he-IL')}
                    {asset.uploaded_by_name && <span className="text-ono-gray/70"> · {asset.uploaded_by_name}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' && assets.length > 0 ? (
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
                  <th className="p-3 text-right font-bold text-ono-gray-dark">הועלה ע&quot;י</th>
                  <th className="p-3 text-right font-bold text-ono-gray-dark">סלאג</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => (
                  <tr key={asset.id} className={`border-b border-[#E8E8E8] hover:bg-ono-gray-light/50 cursor-pointer ${i % 2 === 1 ? 'bg-ono-gray-light/30' : ''}`} onClick={() => setDetailAsset(asset)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}><Checkbox checked={selectedAssets.has(asset.id)} onCheckedChange={() => toggleAssetSelection(asset.id)} /></td>
                    <td className="p-3"><div className="flex items-center gap-2"><FileTypeIcon type={asset.file_type} size="sm" /><span className="text-ono-gray-dark truncate max-w-[200px]">{asset.stored_filename || asset.original_filename}</span></div></td>
                    <td className="p-3 text-ono-gray">{FILE_TYPES.find(f => f.value === asset.file_type)?.label}</td>
                    <td className="p-3 text-ono-gray font-mono text-xs">{asset.dimensions_label || '—'}</td>
                    <td className="p-3 text-ono-gray font-mono text-xs">{asset.aspect_ratio || '—'}</td>
                    <td className="p-3 text-ono-gray">{asset.file_size_label || '—'}</td>
                    <td className="p-3 text-ono-gray text-xs">{ASSET_TYPES.find(t => t.value === asset.asset_type)?.label || '—'}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{asset.platforms?.map(p => <PlatformBadge key={p} platform={p} />) || <span className="text-ono-gray text-xs">—</span>}{asset.expires_at && (
                      <Badge variant="outline" className={`text-[10px] ${new Date(asset.expires_at) < new Date() ? 'border-red-300 text-red-600' : 'border-orange-300 text-orange-600'}`}>
                        <Clock className="w-3 h-3 ml-0.5" />
                        {new Date(asset.expires_at) < new Date() ? 'פג תוקף' : `עד ${new Date(asset.expires_at).toLocaleDateString('he-IL')}`}
                      </Badge>
                    )}</div></td>
                    <td className="p-3 text-ono-gray text-xs">{new Date(asset.upload_date).toLocaleDateString('he-IL')}</td>
                    <td className="p-3 text-ono-gray text-xs">{asset.uploaded_by_name || '—'}</td>
                    <td className="p-3 text-ono-gray text-xs">{(asset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Pagination */}
        {total > 48 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>הקודם</Button>
            <span className="text-sm text-ono-gray">עמוד {page} מתוך {Math.ceil(total / 48)}</span>
            <Button variant="outline" size="sm" disabled={page * 48 >= total} onClick={() => setPage(page + 1)}>הבא</Button>
          </div>
        )}
      </div>

      {/* Mobile filter toggle */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-ono-green text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-ono-green-dark transition-colors"
        onClick={() => setShowFilterSidebar(!showFilterSidebar)}
        title="סינון"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Filter sidebar */}
      {showFilterSidebar && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowFilterSidebar(false)} />
      )}
      <aside className={`w-64 shrink-0 space-y-4 transition-transform duration-200
        fixed top-0 right-0 h-full z-50 bg-[#FAFAFA] p-4 pt-20
        lg:static lg:p-0 lg:pt-0 lg:bg-transparent lg:z-auto lg:translate-x-0
        ${showFilterSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <button className="lg:hidden absolute top-4 left-4 p-1 rounded hover:bg-ono-gray-light" onClick={() => setShowFilterSidebar(false)}>
          <X className="w-5 h-5 text-ono-gray" />
        </button>
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

          <MultiCheckboxFilter label="סלאג" options={slugOptions} selected={filterSlugs} onChange={v => { setFilterSlugs(v); setPage(1); }} counts={filterCounts.slugs} />
          <MultiCheckboxFilter label="קמפיין" options={[{ value: '__no_initiative__', label: 'ללא קמפיין' }, ...initiativeOptions]} selected={filterInitiatives} onChange={v => { setFilterInitiatives(v); setPage(1); }} counts={filterCounts.initiatives} />
          <MultiCheckboxFilter label="סוג קובץ" options={FILE_TYPES} selected={filterFileTypes} onChange={v => { setFilterFileTypes(v); setPage(1); }} counts={filterCounts.file_types} />
          <MultiCheckboxFilter label="סוג חומר" options={ASSET_TYPES} selected={filterAssetTypes} onChange={v => { setFilterAssetTypes(v); setPage(1); }} counts={filterCounts.asset_types} />
          <MultiCheckboxFilter label="פלטפורמה" options={[...PLATFORMS, { value: 'none', label: 'ללא שיוך', color: '#888' } as { value: string; label: string; color: string }]} selected={filterPlatforms} onChange={v => { setFilterPlatforms(v); setPage(1); }} counts={filterCounts.platforms} />
          <MultiCheckboxFilter label="יחס מידות" options={[...ASPECT_RATIOS, { value: 'other', label: 'אחר' }]} selected={filterAspectRatios} onChange={v => { setFilterAspectRatios(v); setPage(1); }} counts={filterCounts.aspect_ratios} />

          <div>
            <Label className="text-xs">מידות מדויקות</Label>
            <Input dir="ltr" className="text-left text-xs mt-1" placeholder="1080×1920" value={filterDimensions} onChange={e => { setFilterDimensions(e.target.value); setPage(1); }} />
          </div>

          <MultiCheckboxFilter label="סוג תוכן" options={DOMAIN_CONTEXTS} selected={filterDomainContexts} onChange={v => { setFilterDomainContexts(v); setPage(1); }} counts={filterCounts.domain_contexts} />

          <div>
            <Label className="text-xs mb-1.5 block">תוקף</Label>
            <select value={filterExpiry} onChange={e => { setFilterExpiry(e.target.value); setPage(1); }} className="w-full border border-[#E8E8E8] rounded-md p-1.5 text-xs">
              <option value="">הכל</option>
              <option value="valid">בתוקף</option>
              <option value="expiring_7days">פוקע ב-7 ימים</option>
              <option value="expiring_soon">פוקע ב-30 יום</option>
            </select>
          </div>

          {/* Uploader filter */}
          {uploaders.length > 0 && (
            <div>
              <Label className="text-xs mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" /> הועלה ע&quot;י</Label>
              <select value={filterUploadedBy} onChange={e => { setFilterUploadedBy(e.target.value); setPage(1); }} className="w-full border border-[#E8E8E8] rounded-md p-1.5 text-xs">
                <option value="">כל המשתמשים</option>
                {uploaders.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </aside>

      {/* Detail Modal */}
      <Dialog open={!!detailAsset} onOpenChange={() => { setDetailAsset(null); setEditMode(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto" dir="rtl">
          {detailAsset && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg">{detailAsset.stored_filename || detailAsset.original_filename}</DialogTitle>
                  <Button variant="ghost" size="sm" onClick={() => editMode ? setEditMode(false) : startEdit(detailAsset)}>
                    <Pencil className="w-4 h-4 ml-1" />
                    {editMode ? 'בטל עריכה' : 'ערוך'}
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {/* Preview: Image / Video / Link / Icon */}
                <div className="bg-ono-gray-light rounded-lg flex items-center justify-center p-4 min-h-[200px]">
                  {detailAsset.file_type === 'link' && detailAsset.external_url ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <ExternalLink className="w-16 h-16 text-purple-500" />
                      <a
                        href={detailAsset.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-800 underline font-mono max-w-full truncate px-4"
                        dir="ltr"
                      >
                        {detailAsset.external_url}
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                        onClick={() => window.open(detailAsset.external_url!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 ml-1" />
                        פתח קישור
                      </Button>
                    </div>
                  ) : detailAsset.drive_view_url && detailAsset.file_type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detailAsset.drive_view_url} alt={detailAsset.original_filename} className="max-h-[400px] rounded" />
                  ) : detailAsset.drive_view_url && detailAsset.file_type === 'video' ? (
                    <video src={detailAsset.drive_view_url} controls className="max-h-[400px] rounded w-full" preload="metadata" />
                  ) : <FileTypeIcon type={detailAsset.file_type} size="lg" />}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  {detailAsset.file_type === 'link' && detailAsset.external_url && (
                    <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                      <ExternalLink className="w-3 h-3 ml-1" />
                      {(() => { try { return new URL(detailAsset.external_url).hostname; } catch { return 'קישור'; } })()}
                    </Badge>
                  )}
                  {detailAsset.dimensions_label && <Badge className="bg-ono-green-light text-ono-green-dark border-ono-green/30">{detailAsset.dimensions_label}</Badge>}
                  {detailAsset.aspect_ratio && <Badge className="bg-ono-green-light text-ono-green-dark border-ono-green/30">{detailAsset.aspect_ratio}</Badge>}
                  {detailAsset.file_size_label && <Badge variant="outline">{detailAsset.file_size_label}</Badge>}
                  {detailAsset.asset_type && <Badge variant="outline">{ASSET_TYPES.find(t => t.value === detailAsset.asset_type)?.label}</Badge>}
                  {detailAsset.platforms?.map(p => <PlatformBadge key={p} platform={p} />)}
                  {detailAsset.version && detailAsset.version > 1 && <Badge variant="outline"><Layers className="w-3 h-3 ml-1" />גרסה {detailAsset.version}</Badge>}
                  {detailAsset.expires_at && <Badge variant="outline" className={new Date(detailAsset.expires_at) < new Date() ? 'border-red-300 text-red-600' : 'border-orange-300 text-orange-600'}><Clock className="w-3 h-3 ml-1" />{new Date(detailAsset.expires_at) < new Date() ? 'פג תוקף' : `תוקף עד ${new Date(detailAsset.expires_at).toLocaleDateString('he-IL')}`}</Badge>}
                </div>

                {/* Edit mode or read-only display */}
                {editMode ? (
                  <div className="space-y-3 bg-ono-gray-light/50 rounded-lg p-4 border border-[#E8E8E8]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">סלאג</Label>
                        <div className="flex gap-1 mt-1">
                          <select value={editData.slug_id || ''} onChange={e => setEditData({ ...editData, slug_id: e.target.value })} className="flex-1 border border-[#E8E8E8] rounded-md p-2 text-sm">
                            {slugs.filter(s => !s.is_archived).map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                          </select>
                          {userCanManage && (
                            <Button type="button" variant="outline" size="sm" className="shrink-0 h-[34px] w-[34px] p-0 border-ono-green text-ono-green hover:bg-ono-green-light" onClick={() => { setShowQuickSlug(true); setQuickSlugError(''); }} title="צור סלאג חדש">
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {/* Inline slug creation */}
                        {showQuickSlug && (
                          <div className="mt-2 p-2.5 bg-white border border-ono-green/30 rounded-md space-y-2">
                            <Input className="text-xs h-8" placeholder="שם תצוגה (עברית)" value={quickSlugName} onChange={e => setQuickSlugName(e.target.value)} />
                            <div className="flex gap-1">
                              <select value={quickSlugParent} onChange={e => setQuickSlugParent(e.target.value)} className="flex-1 border border-[#E8E8E8] rounded-md p-1 text-xs">
                                <option value="">ללא הורה</option>
                                {slugs.filter(s => !s.is_archived).map(s => <option key={s.slug} value={s.slug}>{s.display_name}</option>)}
                              </select>
                              <Input dir="ltr" className="flex-1 text-left font-mono text-xs h-8" placeholder="קוד (en)" value={quickSlugCode} onChange={e => setQuickSlugCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} />
                            </div>
                            {quickSlugParent && quickSlugCode && <p className="text-[10px] text-ono-gray font-mono" dir="ltr">{quickSlugParent}-{quickSlugCode}</p>}
                            {quickSlugError && <p className="text-[10px] text-red-600">{quickSlugError}</p>}
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-ono-green hover:bg-ono-green-dark text-white" onClick={handleQuickCreateSlug} disabled={quickSlugSaving || !quickSlugName || !quickSlugCode}>{quickSlugSaving ? '...' : 'צור'}</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowQuickSlug(false)}>ביטול</Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">קמפיין</Label>
                        <div className="flex gap-1 mt-1">
                          <select value={editData.initiative_id || ''} onChange={e => setEditData({ ...editData, initiative_id: e.target.value || undefined })} className="flex-1 border border-[#E8E8E8] rounded-md p-2 text-sm">
                            <option value="">ללא קמפיין</option>
                            {initiatives.map(i => <option key={i.id} value={i.id}>{i.name} ({i.short_code})</option>)}
                          </select>
                          {userCanManage && (
                            <Button type="button" variant="outline" size="sm" className="shrink-0 h-[34px] w-[34px] p-0 border-ono-green text-ono-green hover:bg-ono-green-light" onClick={() => { setShowQuickInit(true); setQuickInitError(''); }} title="צור קמפיין חדש">
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        {/* Inline initiative creation */}
                        {showQuickInit && (
                          <div className="mt-2 p-2.5 bg-white border border-ono-green/30 rounded-md space-y-2">
                            <Input className="text-xs h-8" placeholder="שם קמפיין (עברית)" value={quickInitName} onChange={e => setQuickInitName(e.target.value)} />
                            <Input dir="ltr" className="text-left font-mono text-xs h-8" placeholder="קוד קצר (en)" value={quickInitCode} onChange={e => setQuickInitCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} />
                            {quickInitError && <p className="text-[10px] text-red-600">{quickInitError}</p>}
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-ono-green hover:bg-ono-green-dark text-white" onClick={handleQuickCreateInit} disabled={quickInitSaving || !quickInitName || !quickInitCode}>{quickInitSaving ? '...' : 'צור'}</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowQuickInit(false)}>ביטול</Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">סוג תוכן</Label>
                        <select value={editData.domain_context || ''} onChange={e => setEditData({ ...editData, domain_context: (e.target.value || null) as Asset['domain_context'] })} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                          <option value="">לא מוגדר</option>
                          {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">סוג חומר</Label>
                        <select value={editData.asset_type || 'production'} onChange={e => setEditData({ ...editData, asset_type: e.target.value as Asset['asset_type'] })} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">תגיות</Label>
                      {/* Tag chips */}
                      {Array.isArray(editData.tags) && editData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                          {editData.tags.map(tag => (
                            <Badge key={tag} className="bg-ono-green-light text-ono-green-dark border border-ono-green/30 text-[10px] cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors" onClick={() => setEditData({ ...editData, tags: editData.tags!.filter(t => t !== tag) })}>
                              {tag} <X className="w-2.5 h-2.5 mr-0.5" />
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* Tag search input with autocomplete */}
                      <div className="relative">
                        <Input
                          className="mt-1 text-sm"
                          placeholder="הקלידו לחיפוש או הוספת תגית..."
                          value={editTagInput}
                          onChange={e => { setEditTagInput(e.target.value); setShowEditTagSuggestions(true); }}
                          onFocus={() => setShowEditTagSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowEditTagSuggestions(false), 200)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && editTagInput.trim()) {
                              e.preventDefault();
                              const newTag = editTagInput.trim();
                              const current = Array.isArray(editData.tags) ? editData.tags : [];
                              if (!current.includes(newTag)) setEditData({ ...editData, tags: [...current, newTag] });
                              setEditTagInput('');
                              setShowEditTagSuggestions(false);
                            }
                          }}
                        />
                        {showEditTagSuggestions && (editTagInput || availableTags.length > 0) && (
                          <div className="absolute z-30 top-full mt-1 w-full bg-white border border-[#E8E8E8] rounded-md shadow-lg max-h-32 overflow-auto">
                            {availableTags
                              .filter(t => {
                                const current = Array.isArray(editData.tags) ? editData.tags : [];
                                return !current.includes(t.name) && (!editTagInput || t.name.includes(editTagInput));
                              })
                              .slice(0, 8)
                              .map(tag => (
                                <button key={tag.name} type="button" className="w-full text-right px-3 py-1 text-xs hover:bg-ono-green-light/50 transition-colors" onMouseDown={e => {
                                  e.preventDefault();
                                  const current = Array.isArray(editData.tags) ? editData.tags : [];
                                  setEditData({ ...editData, tags: [...current, tag.name] });
                                  setEditTagInput('');
                                  setShowEditTagSuggestions(false);
                                }}>{tag.name} <span className="text-ono-gray">({tag.count})</span></button>
                              ))}
                            {editTagInput.trim() && !availableTags.some(t => t.name === editTagInput.trim()) && (
                              <button type="button" className="w-full text-right px-3 py-1 text-xs text-ono-green font-medium hover:bg-ono-green-light/50 transition-colors border-t border-[#E8E8E8]" onMouseDown={e => {
                                e.preventDefault();
                                const current = Array.isArray(editData.tags) ? editData.tags : [];
                                setEditData({ ...editData, tags: [...current, editTagInput.trim()] });
                                setEditTagInput('');
                                setShowEditTagSuggestions(false);
                              }}>+ צור תגית &quot;{editTagInput.trim()}&quot;</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">פלטפורמות</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {PLATFORMS.map(p => (
                          <label key={p.value} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox checked={Array.isArray(editData.platforms) && editData.platforms.includes(p.value)} onCheckedChange={c => {
                              const cur = Array.isArray(editData.platforms) ? editData.platforms : [];
                              setEditData({ ...editData, platforms: c ? [...cur, p.value] : cur.filter(v => v !== p.value) });
                            }} className="h-3.5 w-3.5" />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">הערות</Label>
                      <textarea className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1 min-h-[60px]" value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="הערות על החומר..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">תאריך תפוגה</Label>
                        <Input type="date" className="mt-1 text-sm" dir="ltr" value={editData.expires_at ? editData.expires_at.split('T')[0] : ''} onChange={e => setEditData({ ...editData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                      </div>
                      <div>
                        <Label className="text-xs">הערות רישיון</Label>
                        <Input className="mt-1 text-sm" value={editData.license_notes || ''} onChange={e => setEditData({ ...editData, license_notes: e.target.value })} placeholder="פרטי רישיון..." />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={saveEdit} disabled={editSaving}>
                        {editSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
                        שמור שינויים
                      </Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>ביטול</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-ono-gray">סלאג:</span><span className="mr-2 text-ono-gray-dark">{(detailAsset as Asset & { slugs?: { display_name: string } }).slugs?.display_name || '—'}</span></div>
                      <div><span className="text-ono-gray">קמפיין:</span><span className="mr-2 text-ono-gray-dark">{(detailAsset as Asset & { initiatives?: { name: string } }).initiatives?.name || '—'}</span></div>
                      <div><span className="text-ono-gray">סוג קובץ:</span><span className="mr-2 text-ono-gray-dark">{FILE_TYPES.find(f => f.value === detailAsset.file_type)?.label}</span></div>
                      <div><span className="text-ono-gray">סוג תוכן:</span><span className="mr-2 text-ono-gray-dark">{DOMAIN_CONTEXTS.find(d => d.value === detailAsset.domain_context)?.label || '—'}</span></div>
                      <div><span className="text-ono-gray">תאריך:</span><span className="mr-2 text-ono-gray-dark">{new Date(detailAsset.upload_date).toLocaleDateString('he-IL')}</span></div>
                      <div><span className="text-ono-gray">הועלה ע&quot;י:</span><span className="mr-2 text-ono-gray-dark">{detailAsset.uploaded_by_name || '—'}</span></div>
                      <div><span className="text-ono-gray">תגיות:</span><span className="mr-2 text-ono-gray-dark">{detailAsset.tags?.join(', ') || '—'}</span></div>
                      {detailAsset.license_notes && <div className="col-span-2"><span className="text-ono-gray">רישיון:</span><span className="mr-2 text-ono-gray-dark">{detailAsset.license_notes}</span></div>}
                    </div>
                    {/* Notes */}
                    {detailAsset.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <span className="text-xs font-bold text-yellow-700 block mb-1">הערות</span>
                        <p className="text-sm text-yellow-800">{detailAsset.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Version chain */}
                <VersionChain asset={detailAsset} onSelectVersion={(v) => setDetailAsset(v)} />

                {/* Platform suggestion */}
                <PlatformSuggestion asset={detailAsset} onDismiss={() => {}} />

                {/* Comments section — threaded */}
                <div className="border-t border-[#E8E8E8] pt-4">
                  <CommentThreadSection assetId={detailAsset.id} userId={userId} />
                </div>

                {/* Similar assets */}
                <SimilarAssets assetId={detailAsset.id} onSelect={(a) => setDetailAsset(a)} />

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[#E8E8E8]">
                  {detailAsset.file_type === 'link' && detailAsset.external_url ? (
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => window.open(detailAsset.external_url!, '_blank')}><ExternalLink className="w-4 h-4 ml-2" />פתח קישור</Button>
                  ) : (
                    <Button className="bg-ono-green hover:bg-ono-green-dark text-white" onClick={() => handleDownloadSingle(detailAsset)}><Download className="w-4 h-4 ml-2" />הורד</Button>
                  )}
                  <Button
                    variant="outline"
                    className={favorites.has(detailAsset.id) ? 'bg-yellow-50 border-yellow-400 text-yellow-600' : ''}
                    onClick={() => toggleFavorite(detailAsset.id)}
                  >
                    <Star className={`w-4 h-4 ml-2 ${favorites.has(detailAsset.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    {favorites.has(detailAsset.id) ? 'במועדפים' : 'הוסף למועדפים'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedAssets(new Set([detailAsset.id]));
                    setShowShareDialog(true);
                    setShareLink('');
                    setDetailAsset(null);
                  }}><Share2 className="w-4 h-4 ml-2" />שתף</Button>
                  <Button
                    variant="outline"
                    onClick={() => versionInputRef.current?.click()}
                    disabled={versionUploading}
                  >
                    {versionUploading
                      ? <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin ml-2" />
                      : <Layers className="w-4 h-4 ml-2" />
                    }
                    {versionUploading ? 'מעלה...' : 'העלה גרסה חדשה'}
                  </Button>
                  <input
                    ref={versionInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVersionUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => {
                    setShowArchiveConfirm(detailAsset);
                  }}><Archive className="w-4 h-4 ml-2" />העבר לארכיון</Button>
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

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!showArchiveConfirm} onOpenChange={() => setShowArchiveConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> אישור העברה לארכיון</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-ono-gray">
              האם להעביר את &quot;{showArchiveConfirm?.stored_filename || showArchiveConfirm?.original_filename}&quot; לארכיון?
            </p>
            <p className="text-xs text-ono-gray mt-2">
              החומר לא יופיע בספרייה אך לא יימחק לצמיתות.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveConfirm(null)}>ביטול</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={async () => {
              if (!showArchiveConfirm) return;
              try {
                const res = await fetch(`/api/assets/${showArchiveConfirm.id}`, { method: 'DELETE' });
                if (!res.ok) { showToast('שגיאה בהעברה לארכיון', 'error'); return; }
                fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'archive', entity_type: 'asset', entity_id: showArchiveConfirm.id, entity_name: showArchiveConfirm.original_filename })
                }).catch(() => {});
                setShowArchiveConfirm(null);
                setDetailAsset(null);
                fetchAssets();
                showToast('החומר הועבר לארכיון', 'success');
              } catch { showToast('שגיאה בהעברה לארכיון', 'error'); }
            }}>העבר לארכיון</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-ono-green" /> עריכה מרוכזת ({selectedAssets.size} חומרים)</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-ono-gray">השאר שדות ריקים כדי לא לשנות אותם. רק שדות שמולאו יעודכנו.</p>
            <div>
              <Label className="text-xs">סוג תוכן</Label>
              <select value={bulkEditData.domain_context || ''} onChange={e => setBulkEditData({ ...bulkEditData, domain_context: e.target.value || undefined })} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">ללא שינוי</option>
                {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">קמפיין</Label>
              <select value={bulkEditData.initiative_id || ''} onChange={e => setBulkEditData({ ...bulkEditData, initiative_id: e.target.value || undefined })} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">ללא שינוי</option>
                {initiatives.map(i => <option key={i.id} value={i.id}>{i.name} ({i.short_code})</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">סוג חומר</Label>
              <select value={bulkEditData.asset_type || ''} onChange={e => setBulkEditData({ ...bulkEditData, asset_type: e.target.value || undefined })} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">ללא שינוי</option>
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">פלטפורמות</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PLATFORMS.map(p => (
                  <label key={p.value} className="flex items-center gap-1 text-xs cursor-pointer">
                    <Checkbox checked={bulkEditData.platforms?.includes(p.value) || false} onCheckedChange={c => {
                      const cur = bulkEditData.platforms || [];
                      setBulkEditData({ ...bulkEditData, platforms: c ? [...cur, p.value] : cur.filter(v => v !== p.value) });
                    }} className="h-3.5 w-3.5" />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">תגיות</Label>
                <div className="flex gap-1">
                  <Button variant={bulkEditData.tags_action === 'add' || !bulkEditData.tags_action ? 'default' : 'outline'} size="sm" className={`text-[10px] h-5 px-2 ${bulkEditData.tags_action !== 'set' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}`} onClick={() => setBulkEditData({ ...bulkEditData, tags_action: 'add' })}>הוסף</Button>
                  <Button variant={bulkEditData.tags_action === 'set' ? 'default' : 'outline'} size="sm" className={`text-[10px] h-5 px-2 ${bulkEditData.tags_action === 'set' ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}`} onClick={() => setBulkEditData({ ...bulkEditData, tags_action: 'set' })}>החלף</Button>
                </div>
              </div>
              <Input className="text-sm" value={bulkEditData.tags || ''} onChange={e => setBulkEditData({ ...bulkEditData, tags: e.target.value })} placeholder="תגית1, תגית2, ..." />
              <p className="text-[10px] text-ono-gray mt-1">{bulkEditData.tags_action === 'set' ? 'כל התגיות הקיימות יוחלפו' : 'התגיות יתווספו לתגיות הקיימות'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkEdit(false); setBulkEditData({}); }}>ביטול</Button>
            <Button onClick={handleBulkEdit} disabled={bulkSaving} className="bg-ono-green hover:bg-ono-green-dark text-white">
              {bulkSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
              עדכן {selectedAssets.size} חומרים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast is now global via ToastProvider */}
    </div>
  );
}
