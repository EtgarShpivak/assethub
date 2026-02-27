'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bookmark,
  Plus,
  Calendar,
  FolderOpen,
  Share2,
  Trash2,
  ArrowRight,
  Search,
  Image as ImageIcon,
  Film,
  FileText,
  Newspaper,
  File,
  X,
  CheckCircle,
  AlertTriangle,
  Users,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Collection, Asset } from '@/lib/types';

// ─── Toast ───────────────────────────────────────────────────────────────────

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

// ─── File type icon helper ───────────────────────────────────────────────────

function FileTypeIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-8 h-8' : 'w-5 h-5';
  switch (type) {
    case 'image': return <ImageIcon className={`${cls} text-ono-green`} />;
    case 'video': return <Film className={`${cls} text-platform-meta`} />;
    case 'pdf': return <FileText className={`${cls} text-platform-google`} />;
    case 'newsletter': return <Newspaper className={`${cls} text-ono-orange`} />;
    default: return <File className={`${cls} text-ono-gray`} />;
  }
}

// ─── Types for the detail view ───────────────────────────────────────────────

interface CollectionDetail extends Collection {
  assets: Asset[];
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  // ── List state ──────────────────────────────────────────────────────────────
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Create dialog ───────────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsShared, setFormIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Detail view ─────────────────────────────────────────────────────────────
  const [activeCollection, setActiveCollection] = useState<CollectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Delete confirmation ─────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Add assets dialog ───────────────────────────────────────────────────────
  const [showAddAssetsDialog, setShowAddAssetsDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [assetsSearchQuery, setAssetsSearchQuery] = useState('');
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [addingAssets, setAddingAssets] = useState(false);

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  }, []);

  // ── Fetch collections ──────────────────────────────────────────────────────

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch {
      showToast('שגיאה בטעינת אוספים', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  // ── Create collection ──────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_shared: formIsShared,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'שגיאה ביצירת האוסף');
        setSaving(false);
        return;
      }

      resetCreateForm();
      setShowCreateDialog(false);
      fetchCollections();
      showToast('האוסף נוצר בהצלחה', 'success');
    } catch {
      setFormError('שגיאה ביצירת האוסף');
    }
    setSaving(false);
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormDescription('');
    setFormIsShared(false);
    setFormError(null);
  };

  // ── Open collection detail ─────────────────────────────────────────────────

  const openCollection = async (collection: Collection) => {
    setDetailLoading(true);
    setActiveCollection({ ...collection, assets: [] });

    try {
      const res = await fetch(`/api/collections/${collection.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActiveCollection({
        ...data,
        assets: data.assets || [],
        asset_count: data.asset_count ?? 0,
      });
    } catch {
      showToast('שגיאה בטעינת פרטי האוסף', 'error');
      setActiveCollection(null);
    }
    setDetailLoading(false);
  };

  // ── Toggle shared status ───────────────────────────────────────────────────

  const toggleShared = async (collection: Collection | CollectionDetail) => {
    const newShared = !collection.is_shared;
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared: newShared }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      if (activeCollection && activeCollection.id === collection.id) {
        setActiveCollection(prev => prev ? { ...prev, is_shared: newShared } : null);
      }
      setCollections(prev =>
        prev.map(c => c.id === collection.id ? { ...c, is_shared: newShared } : c)
      );
      showToast(newShared ? 'האוסף שותף עם הצוות' : 'האוסף הפך לפרטי', 'success');
    } catch {
      showToast('שגיאה בעדכון סטטוס השיתוף', 'error');
    }
  };

  // ── Delete collection ──────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/collections/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      if (activeCollection?.id === deleteTarget.id) {
        setActiveCollection(null);
      }
      setDeleteTarget(null);
      fetchCollections();
      showToast('האוסף נמחק בהצלחה', 'success');
    } catch {
      showToast('שגיאה במחיקת האוסף', 'error');
    }
    setDeleting(false);
  };

  // ── Remove asset from collection ───────────────────────────────────────────

  const removeAssetFromCollection = async (assetId: string) => {
    if (!activeCollection) return;

    try {
      const res = await fetch(`/api/collections/${activeCollection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_asset_ids: [assetId] }),
      });

      if (!res.ok) throw new Error('Failed to remove');

      setActiveCollection(prev => {
        if (!prev) return null;
        const updated = prev.assets.filter(a => a.id !== assetId);
        return { ...prev, assets: updated, asset_count: updated.length };
      });
      setCollections(prev =>
        prev.map(c =>
          c.id === activeCollection.id
            ? { ...c, asset_count: Math.max(0, (c.asset_count ?? 1) - 1) }
            : c
        )
      );
      showToast('החומר הוסר מהאוסף', 'success');
    } catch {
      showToast('שגיאה בהסרת החומר', 'error');
    }
  };

  // ── Add assets search & add ────────────────────────────────────────────────

  const openAddAssetsDialog = () => {
    setShowAddAssetsDialog(true);
    setAssetsSearchQuery('');
    setSelectedAssetIds(new Set());
    setAvailableAssets([]);
  };

  const searchAvailableAssets = async (query: string) => {
    setAssetsSearchQuery(query);
    if (!query.trim()) {
      setAvailableAssets([]);
      return;
    }

    setAssetsLoading(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '20' });
      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();
      setAvailableAssets(data.assets || []);
    } catch {
      setAvailableAssets([]);
    }
    setAssetsLoading(false);
  };

  const toggleAssetSelection = (id: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddAssets = async () => {
    if (!activeCollection || selectedAssetIds.size === 0) return;
    setAddingAssets(true);

    try {
      const res = await fetch(`/api/collections/${activeCollection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_asset_ids: Array.from(selectedAssetIds) }),
      });

      if (!res.ok) throw new Error('Failed to add');

      setShowAddAssetsDialog(false);
      setSelectedAssetIds(new Set());

      // Refresh collection detail
      await openCollection(activeCollection);
      fetchCollections();
      showToast(`${selectedAssetIds.size} חומרים נוספו לאוסף`, 'success');
    } catch {
      showToast('שגיאה בהוספת חומרים', 'error');
    }
    setAddingAssets(false);
  };

  // ── Filter collections by search ───────────────────────────────────────────

  const filtered = searchQuery
    ? collections.filter(c =>
        c.name.includes(searchQuery) ||
        (c.description && c.description.includes(searchQuery))
      )
    : collections;

  // ── Back to list ───────────────────────────────────────────────────────────

  const backToList = () => {
    setActiveCollection(null);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: Collection detail view
  // ══════════════════════════════════════════════════════════════════════════════

  if (activeCollection) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={backToList} className="text-ono-gray hover:text-ono-gray-dark">
              <ArrowRight className="w-4 h-4 ml-1" />
              חזרה
            </Button>
            <div className="w-px h-6 bg-[#E8E8E8]" />
            <Bookmark className="w-6 h-6 text-ono-green" />
            <div>
              <h1 className="text-2xl font-bold text-ono-gray-dark">{activeCollection.name}</h1>
              {activeCollection.description && (
                <p className="text-sm text-ono-gray mt-0.5">{activeCollection.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleShared(activeCollection)}
              className={activeCollection.is_shared ? 'border-ono-green text-ono-green' : ''}
            >
              {activeCollection.is_shared ? <Users className="w-4 h-4 ml-1" /> : <Lock className="w-4 h-4 ml-1" />}
              {activeCollection.is_shared ? 'משותף' : 'פרטי'}
            </Button>
            <Button
              onClick={openAddAssetsDialog}
              className="bg-ono-green hover:bg-ono-green-dark text-white"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף חומרים
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(activeCollection)}
              className="text-red-500 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-sm text-ono-gray">
          <Badge variant="outline" className="text-xs">
            <FolderOpen className="w-3 h-3 ml-1" />
            {activeCollection.asset_count ?? activeCollection.assets.length} חומרים
          </Badge>
          {activeCollection.is_shared && (
            <Badge className="bg-ono-green-light text-ono-green-dark text-xs">
              <Share2 className="w-3 h-3 ml-1" />
              משותף
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs">
            <Calendar className="w-3 h-3" />
            נוצר {new Date(activeCollection.created_at).toLocaleDateString('he-IL')}
          </span>
        </div>

        {/* Assets grid */}
        {detailLoading ? (
          <div className="text-center py-12 text-ono-gray">
            <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            טוען חומרים...
          </div>
        ) : activeCollection.assets.length === 0 ? (
          <div className="text-center py-16 text-ono-gray">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
            <p className="mb-4">אין חומרים באוסף הזה עדיין</p>
            <Button onClick={openAddAssetsDialog} className="bg-ono-green hover:bg-ono-green-dark text-white">
              <Plus className="w-4 h-4 ml-2" />
              הוסף חומרים
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {activeCollection.assets.map(asset => (
              <div
                key={asset.id}
                className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-ono-gray-light flex items-center justify-center relative">
                  {asset.drive_view_url && asset.file_type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.drive_view_url}
                      alt={asset.original_filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : asset.drive_view_url && asset.file_type === 'video' ? (
                    <>
                      <video src={asset.drive_view_url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Film className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                    </>
                  ) : (
                    <FileTypeIcon type={asset.file_type} size="md" />
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeAssetFromCollection(asset.id)}
                    className="absolute top-2 left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="הסר מהאוסף"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium text-ono-gray-dark truncate mb-1">
                    {asset.original_filename}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {asset.dimensions_label && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.dimensions_label}</Badge>
                    )}
                    {asset.file_size_label && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.file_size_label}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-ono-gray mt-1">
                    {new Date(asset.upload_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add assets dialog */}
        <Dialog open={showAddAssetsDialog} onOpenChange={setShowAddAssetsDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-ono-green" />
                הוסף חומרים לאוסף
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
                <Input
                  className="pr-10"
                  placeholder="חפש לפי שם קובץ..."
                  value={assetsSearchQuery}
                  onChange={e => searchAvailableAssets(e.target.value)}
                />
              </div>

              <div className="border border-[#E8E8E8] rounded-lg max-h-[320px] overflow-y-auto">
                {assetsLoading ? (
                  <div className="text-center py-8 text-ono-gray text-sm">
                    <div className="w-5 h-5 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    מחפש...
                  </div>
                ) : availableAssets.length === 0 ? (
                  <div className="text-center py-8 text-ono-gray text-sm">
                    {assetsSearchQuery ? 'לא נמצאו חומרים' : 'הקלד לחיפוש חומרים'}
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8E8E8]">
                    {availableAssets.map(asset => {
                      const isInCollection = activeCollection.assets.some(a => a.id === asset.id);
                      const isSelected = selectedAssetIds.has(asset.id);

                      return (
                        <button
                          key={asset.id}
                          onClick={() => !isInCollection && toggleAssetSelection(asset.id)}
                          disabled={isInCollection}
                          className={`w-full flex items-center gap-3 p-3 text-right transition-colors ${
                            isInCollection
                              ? 'opacity-50 cursor-not-allowed bg-ono-gray-light/50'
                              : isSelected
                              ? 'bg-ono-green-light'
                              : 'hover:bg-ono-gray-light/50'
                          }`}
                        >
                          {/* Selection indicator */}
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                              isInCollection
                                ? 'bg-ono-gray border-ono-gray'
                                : isSelected
                                ? 'bg-ono-green border-ono-green'
                                : 'border-ono-gray/40'
                            }`}
                          >
                            {(isSelected || isInCollection) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>

                          {/* Thumbnail */}
                          <div className="w-10 h-10 bg-ono-gray-light rounded flex items-center justify-center shrink-0 overflow-hidden">
                            {asset.drive_view_url && asset.file_type === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.drive_view_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileTypeIcon type={asset.file_type} size="sm" />
                            )}
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ono-gray-dark truncate">{asset.original_filename}</p>
                            <p className="text-[10px] text-ono-gray">
                              {asset.dimensions_label || asset.file_size_label || ''}
                              {isInCollection && ' - כבר באוסף'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedAssetIds.size > 0 && (
                <p className="text-sm text-ono-green font-medium">
                  {selectedAssetIds.size} חומרים נבחרו להוספה
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddAssetsDialog(false)}>ביטול</Button>
              <Button
                onClick={handleAddAssets}
                disabled={addingAssets || selectedAssetIds.size === 0}
                className="bg-ono-green hover:bg-ono-green-dark text-white"
              >
                {addingAssets ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                ) : (
                  <Plus className="w-4 h-4 ml-2" />
                )}
                הוסף {selectedAssetIds.size > 0 ? `(${selectedAssetIds.size})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-600">מחיקת אוסף</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-ono-gray">
                האם למחוק את האוסף <strong className="text-ono-gray-dark">&quot;{deleteTarget?.name}&quot;</strong>?
              </p>
              <p className="text-xs text-ono-gray mt-2">
                החומרים עצמם לא יימחקו, רק השיוך לאוסף.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? 'מוחק...' : 'מחק אוסף'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toast */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: Collections list
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bookmark className="w-6 h-6 text-ono-green" />
          <h1 className="text-2xl font-bold text-ono-gray-dark">אוספים</h1>
          <Badge variant="outline" className="text-xs">{collections.length}</Badge>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-ono-green hover:bg-ono-green-dark text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          אוסף חדש
        </Button>
      </div>

      {/* Search */}
      {collections.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
          <Input
            className="pr-10"
            placeholder="חיפוש אוספים..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Collections list */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ono-gray">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>{searchQuery ? 'לא נמצאו אוספים התואמים את החיפוש' : 'אין אוספים עדיין'}</p>
          {!searchQuery && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-ono-green hover:bg-ono-green-dark text-white mt-4"
            >
              <Plus className="w-4 h-4 ml-2" />
              צור אוסף ראשון
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(collection => (
            <div
              key={collection.id}
              className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5 hover:border-ono-green transition-colors cursor-pointer"
              onClick={() => openCollection(collection)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-ono-green-light rounded-lg flex items-center justify-center shrink-0">
                    <Bookmark className="w-5 h-5 text-ono-green" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ono-gray-dark">{collection.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-ono-gray mt-1">
                      {collection.description && (
                        <>
                          <span className="max-w-[300px] truncate">{collection.description}</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(collection.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <Badge variant="outline" className="text-xs">
                    <FolderOpen className="w-3 h-3 ml-1" />
                    {collection.asset_count ?? 0} חומרים
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleShared(collection)}
                    className={`h-8 px-2 ${collection.is_shared ? 'text-ono-green' : 'text-ono-gray'}`}
                    title={collection.is_shared ? 'משותף - לחץ להפוך לפרטי' : 'פרטי - לחץ לשתף'}
                  >
                    {collection.is_shared ? <Users className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(collection)}
                    className="h-8 px-2 text-ono-gray hover:text-red-500"
                    title="מחק אוסף"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-ono-green" />
              אוסף חדש
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>שם האוסף *</Label>
              <Input
                className="mt-1"
                placeholder="למשל: באנרים לקמפיין הקיץ"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            <div>
              <Label>תיאור</Label>
              <Input
                className="mt-1"
                placeholder="תיאור קצר של האוסף..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formIsShared}
                  onClick={() => setFormIsShared(!formIsShared)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    formIsShared ? 'bg-ono-green' : 'bg-ono-gray/30'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      formIsShared ? '-translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm flex items-center gap-1">
                  <Users className="w-4 h-4 text-ono-gray" />
                  שתף עם כל הצוות
                </span>
              </label>
              <p className="text-xs text-ono-gray mt-1">
                {formIsShared ? 'כל חברי הצוות יוכלו לראות את האוסף' : 'רק אתה תוכל לראות את האוסף'}
              </p>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}>
              ביטול
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="bg-ono-green hover:bg-ono-green-dark text-white"
            >
              {saving ? 'שומר...' : 'צור אוסף'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-600">מחיקת אוסף</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-ono-gray">
              האם למחוק את האוסף <strong className="text-ono-gray-dark">&quot;{deleteTarget?.name}&quot;</strong>?
            </p>
            <p className="text-xs text-ono-gray mt-2">
              החומרים עצמם לא יימחקו, רק השיוך לאוסף.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? 'מוחק...' : 'מחק אוסף'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
