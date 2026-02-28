'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Archive, Trash2, ChevronLeft, FolderTree } from 'lucide-react';
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
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useGlobalToast } from '@/components/ui/global-toast';
import { logClientError } from '@/lib/error-logger';
import type { Slug } from '@/lib/types';

interface SlugWithCounts extends Slug {
  asset_count: number;
  initiative_count: number;
}

function buildTree(slugs: SlugWithCounts[]): (SlugWithCounts & { children: SlugWithCounts[] })[] {
  const map = new Map<string, SlugWithCounts & { children: SlugWithCounts[] }>();
  const roots: (SlugWithCounts & { children: SlugWithCounts[] })[] = [];

  // Initialize all with empty children
  slugs.forEach((s) => {
    map.set(s.slug, { ...s, children: [] });
  });

  slugs.forEach((s) => {
    const parts = s.slug.split('-');
    if (parts.length > 1) {
      const parentSlug = parts.slice(0, -1).join('-');
      const parent = map.get(parentSlug);
      if (parent) {
        parent.children.push(map.get(s.slug)!);
        return;
      }
    }
    roots.push(map.get(s.slug)!);
  });

  return roots;
}

function getParentSlug(slug: string): string | null {
  const parts = slug.split('-');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('-');
}

function SlugTreeNode({
  node,
  depth,
  onArchive,
  onDelete,
}: {
  node: SlugWithCounts & { children: SlugWithCounts[] };
  depth: number;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div
        className={`flex items-center justify-between py-2.5 px-4 hover:bg-ono-gray-light transition-colors ${
          node.is_archived ? 'opacity-50' : ''
        }`}
        style={{ paddingRight: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {depth > 0 && (
            <ChevronLeft className="w-4 h-4 text-ono-gray" />
          )}
          <div>
            <span className="text-sm font-medium text-ono-gray-dark">
              {node.display_name}
            </span>
            <span className="text-xs text-ono-gray mr-2 font-mono">
              {node.slug}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {node.asset_count} חומרים
          </Badge>
          <Badge variant="outline" className="text-xs">
            {node.initiative_count} מהלכים
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(node.id, !node.is_archived)}
            title={node.is_archived ? 'שחזר' : 'העבר לארכיון'}
          >
            <Archive className="w-4 h-4 text-ono-gray" />
          </Button>
          {node.asset_count === 0 && node.initiative_count === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(node.id)}
              title="מחק"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
      {node.children.map((child) => (
        <SlugTreeNode
          key={child.id}
          node={child as SlugWithCounts & { children: SlugWithCounts[] }}
          depth={depth + 1}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function SlugManagerPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { showError, showSuccess } = useGlobalToast();
  const [slugs, setSlugs] = useState<SlugWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');

  const fetchSlugs = useCallback(async () => {
    const res = await fetch('/api/slugs');
    const data = await res.json();
    setSlugs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlugs();
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data);
        if (data.length > 0) setSelectedWorkspace(data[0].id);
      });
  }, [fetchSlugs]);

  const parentPreview = getParentSlug(newSlug);
  const parentSlugObj = parentPreview
    ? slugs.find((s) => s.slug === parentPreview)
    : null;

  const handleCreate = async () => {
    if (!newSlug || !newDisplayName || !selectedWorkspace) return;
    setSaving(true);
    setError(null);

    const res = await fetch('/api/slugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: newSlug,
        display_name: newDisplayName,
        description: newDescription || null,
        workspace_id: selectedWorkspace,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    setNewSlug('');
    setNewDisplayName('');
    setNewDescription('');
    setShowModal(false);
    setSaving(false);
    fetchSlugs();
  };

  const handleArchive = async (id: string, is_archived: boolean) => {
    await fetch(`/api/slugs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived }),
    });
    fetchSlugs();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/slugs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      const errMsg = data.error || 'שגיאה במחיקת הסלאג';
      showError(errMsg, undefined, data.error?.includes('חומרים') ? 'העבר או מחק את כל החומרים לפני מחיקת הסלאג.' : 'נסה שוב.');
      logClientError('slug-delete', errMsg);
      return;
    }
    fetchSlugs();
  };

  const tree = buildTree(slugs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderTree className="w-6 h-6 text-ono-green" />
          <h1 className="text-2xl font-bold text-ono-gray-dark">ניהול סלאגים</h1>
          <InfoTooltip text="סלאגים מגדירים את מבנה התחומים של הארגון. כל חומר חייב להיות משויך לסלאג. השתמשו במקפים ליצירת היררכיה." size="md" />
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-ono-green hover:bg-ono-green-dark text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          סלאג חדש
        </Button>
      </div>

      <p className="text-sm text-ono-gray">
        סלאגים מגדירים את מבנה התחומים של הארגון. השתמשו במקפים ליצירת היררכיה
        (לדוגמה: mba → mba-finance → mba-finance-adv).
      </p>

      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] divide-y divide-[#E8E8E8]">
        {loading ? (
          <div className="p-8 text-center text-ono-gray">טוען...</div>
        ) : tree.length === 0 ? (
          <div className="p-8 text-center text-ono-gray">
            אין סלאגים עדיין. צרו את הסלאג הראשון.
          </div>
        ) : (
          tree.map((node) => (
            <SlugTreeNode
              key={node.id}
              node={node}
              depth={0}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Create Slug Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>סלאג חדש</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {workspaces.length > 1 && (
              <div>
                <Label>סביבת עבודה</Label>
                <select
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1">מזהה סלאג (באנגלית) <InfoTooltip text="מזהה ייחודי באנגלית (אותיות קטנות, מספרים ומקפים). השתמשו במקף ליצירת היררכיה: mba-finance הוא צאצא של mba." /></Label>
              <Input
                dir="ltr"
                className="text-left font-mono mt-1"
                placeholder="mba-finance"
                value={newSlug}
                onChange={(e) => {
                  const val = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/--+/g, '-');
                  setNewSlug(val);
                }}
              />
              {parentSlugObj && (
                <p className="text-xs text-ono-green mt-1">
                  ← צאצא של: {parentSlugObj.display_name} ({parentPreview})
                </p>
              )}
              {parentPreview && !parentSlugObj && (
                <p className="text-xs text-ono-orange mt-1">
                  הורה &quot;{parentPreview}&quot; לא קיים — זה יהיה סלאג בסיס
                </p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-1">שם תצוגה (בעברית) <InfoTooltip text="השם שיוצג בממשק המשתמש. כתבו שם ברור בעברית, למשל: מנהל עסקים — פיננסים." /></Label>
              <Input
                className="mt-1"
                placeholder="מנהל עסקים — פיננסים"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>

            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Input
                className="mt-1"
                placeholder="תוכנית לתואר שני בפיננסים"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !newSlug || !newDisplayName}
              className="bg-ono-green hover:bg-ono-green-dark text-white"
            >
              {saving ? 'שומר...' : 'צור סלאג'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
