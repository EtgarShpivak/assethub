'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Pencil,
  Trash2,
  Plus,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface TagEntry {
  name: string;
  count: number;
}

export default function TagManagementPage() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add new tag
  const [newTagName, setNewTagName] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit tag
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editNewName, setEditNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete tag
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tags');
    const data = await res.json();
    setTags(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const filteredTags = tags.filter(t =>
    !searchQuery || t.name.includes(searchQuery)
  );

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    // Check if tag already exists
    if (tags.some(t => t.name === newTagName.trim())) {
      return;
    }
    setAdding(true);
    // To add a new managed tag, we create a dummy asset update
    // Instead, we'll just show it in the list - it will be available in uploads
    // For now, just add it locally
    setTags(prev => [...prev, { name: newTagName.trim(), count: 0 }].sort((a, b) => a.name.localeCompare(b.name, 'he')));
    setNewTagName('');
    setAdding(false);
  };

  const handleRenameTag = async () => {
    if (!editingTag || !editNewName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: editingTag, newName: editNewName.trim() }),
      });
      if (res.ok) {
        await fetchTags();
        setEditingTag(null);
        setEditNewName('');
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDeleteTag = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deleteConfirm }),
      });
      if (res.ok) {
        await fetchTags();
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">ניהול תגיות</h1>
        <InfoTooltip text="נהלו את התגיות במערכת. ניתן לשנות שם, למחוק תגיות שאינן בשימוש, ולהוסיף תגיות חדשות. שינוי שם או מחיקה ישפיעו על כל החומרים המשויכים." size="md" />
      </div>

      {/* Add + Search */}
      <div className="flex gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray" />
            <Input
              className="pr-10"
              placeholder="חיפוש תגית..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="שם תגית חדשה..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
            className="w-48"
          />
          <Button
            onClick={handleAddTag}
            disabled={adding || !newTagName.trim() || tags.some(t => t.name === newTagName.trim())}
            className="bg-ono-green hover:bg-ono-green-dark text-white"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף
          </Button>
        </div>
      </div>

      {/* Tags count */}
      <div className="text-sm text-ono-gray">
        {tags.length} תגיות במערכת
        {searchQuery && ` · ${filteredTags.length} תוצאות`}
      </div>

      {/* Tags table */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען תגיות...
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12 text-ono-gray">
          <Tag className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>{searchQuery ? 'לא נמצאו תגיות' : 'אין תגיות עדיין. הוסיפו תגית חדשה.'}</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ono-gray-light border-b border-[#E8E8E8]">
                <th className="p-3 text-right font-bold text-ono-gray-dark">תגית</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark w-24">חומרים</th>
                <th className="p-3 text-right font-bold text-ono-gray-dark w-32">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag, i) => (
                <tr key={tag.name} className={`border-b border-[#E8E8E8] ${i % 2 === 1 ? 'bg-ono-gray-light/30' : ''}`}>
                  <td className="p-3">
                    {editingTag === tag.name ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editNewName}
                          onChange={e => setEditNewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRenameTag()}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={handleRenameTag} disabled={saving} className="h-8 w-8 p-0 text-ono-green">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)} className="h-8 w-8 p-0 text-ono-gray">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-ono-green-light text-ono-green-dark border border-ono-green/30 text-xs">
                          {tag.name}
                        </Badge>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-ono-gray text-center">
                    <Badge variant="outline" className="text-xs">{tag.count}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-ono-gray hover:text-ono-green"
                        onClick={() => { setEditingTag(tag.name); setEditNewName(tag.name); }}
                        title="שנה שם"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-ono-gray hover:text-red-600"
                        onClick={() => setDeleteConfirm(tag.name)}
                        title="מחק"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת תגית</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ono-gray-dark py-2">
            האם למחוק את התגית <Badge className="bg-ono-green-light text-ono-green-dark border border-ono-green/30 text-xs mx-1">{deleteConfirm}</Badge>?
          </p>
          <p className="text-xs text-ono-orange">
            התגית תוסר מכל החומרים שמשויכים אליה. פעולה זו אינה ניתנת לביטול.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ביטול</Button>
            <Button
              onClick={handleDeleteTag}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'מוחק...' : 'מחק תגית'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
