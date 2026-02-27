'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Calendar,
  FolderOpen,
  Globe,
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
import { INITIATIVE_STATUSES, containsHebrew } from '@/lib/platform-specs';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { Initiative, Slug } from '@/lib/types';

const statusBadgeStyles: Record<string, string> = {
  active: 'bg-ono-green-light text-ono-green-dark',
  ongoing: 'bg-blue-50 text-blue-700',
  ended: 'bg-ono-gray-light text-ono-gray',
  archived: 'bg-ono-gray-light text-ono-gray',
};

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<(Initiative & { slugs?: { slug: string; display_name: string } | null; asset_count?: number })[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [codeWarning, setCodeWarning] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formWorkspace, setFormWorkspace] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsCrossSlug, setFormIsCrossSlug] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/initiatives').then(r => r.json()),
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/workspaces').then(r => r.json()),
    ]).then(([ini, sl, ws]) => {
      setInitiatives(ini);
      setSlugs(sl);
      setWorkspaces(ws);
      if (ws.length > 0 && !formWorkspace) setFormWorkspace(ws[0].id);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!formName || !formCode || !formWorkspace) return;
    if (!formIsCrossSlug && !formSlug) return;
    setSaving(true);
    setError(null);

    const res = await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        short_code: formCode,
        slug_id: formIsCrossSlug ? null : formSlug,
        workspace_id: formWorkspace,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        notes: formNotes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setSaving(false);
      return;
    }

    resetForm();
    setShowModal(false);
    setSaving(false);
    fetchAll();
  };

  const resetForm = () => {
    setFormName(''); setFormCode(''); setFormSlug('');
    setFormStartDate(''); setFormEndDate(''); setFormNotes('');
    setFormIsCrossSlug(false); setError(null); setCodeWarning('');
  };

  const filtered = filterStatus
    ? initiatives.filter(i => i.status === filterStatus)
    : initiatives;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-ono-green" />
          <h1 className="text-2xl font-bold text-ono-gray-dark">קמפיינים</h1>
          <InfoTooltip text="קמפיין = מהלך שיווקי שאליו משייכים חומרים. כל קמפיין מקבל שם, קוד קצר באנגלית, ותאריכים." size="md" />
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-ono-green hover:bg-ono-green-dark text-white">
          <Plus className="w-4 h-4 ml-2" />
          קמפיין חדש
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={!filterStatus ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('')} className={!filterStatus ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}>
          הכל ({initiatives.length})
        </Button>
        {INITIATIVE_STATUSES.map(s => {
          const count = initiatives.filter(i => i.status === s.value).length;
          return (
            <Button key={s.value} variant={filterStatus === s.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s.value)} className={filterStatus === s.value ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}>
              {s.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Initiatives list */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ono-gray">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>אין קמפיינים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(initiative => (
            <Link
              key={initiative.id}
              href={`/initiatives/${initiative.id}`}
              className="block bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5 hover:border-ono-green transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-bold text-ono-gray-dark">{initiative.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-ono-gray mt-1">
                      <span className="font-mono">{initiative.short_code}</span>
                      <span>·</span>
                      {initiative.slug_id ? (
                        <span>{initiative.slugs?.display_name}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-ono-orange">
                          <Globe className="w-3 h-3" />
                          רוחבי
                        </span>
                      )}
                      {initiative.start_date && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(initiative.start_date).toLocaleDateString('he-IL')}
                            {initiative.end_date && ` — ${new Date(initiative.end_date).toLocaleDateString('he-IL')}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    <FolderOpen className="w-3 h-3 ml-1" />
                    {initiative.asset_count || 0} חומרים
                  </Badge>
                  <Badge className={`${statusBadgeStyles[initiative.status]} text-xs`}>
                    {INITIATIVE_STATUSES.find(s => s.value === initiative.status)?.label}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Initiative Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>קמפיין חדש</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="flex items-center gap-1">שם המהלך * <InfoTooltip text="שם תיאורי בעברית שמזהה את המהלך, למשל: קמפיין חזרה ללימודים 2025." /></Label>
              <Input className="mt-1" placeholder="קמפיין חזרה ללימודים 2025" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>

            <div>
              <Label className="flex items-center gap-1">קוד קצר (באנגלית) * <InfoTooltip text="קוד באנגלית (אותיות קטנות ומספרים) שישמש בשמות קבצי ייצוא. למשל: bts25 עבור Back to School 2025." /></Label>
              <Input dir="ltr" className={`text-left font-mono mt-1 ${codeWarning ? 'border-ono-orange' : ''}`} placeholder="bts25" value={formCode} onChange={e => {
                const raw = e.target.value;
                if (containsHebrew(raw)) {
                  setCodeWarning('שדה זה מקבל אותיות באנגלית בלבד. אנא החלף שפה למקלדת אנגלית.');
                  return;
                }
                setCodeWarning('');
                setFormCode(raw.toLowerCase().replace(/[^a-z0-9]/g, ''));
              }} />
              {codeWarning ? (
                <p className="text-xs text-ono-orange mt-1 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-ono-orange text-white text-[8px] flex items-center justify-center font-bold">!</span>
                  {codeWarning}
                </p>
              ) : (
                <p className="text-xs text-ono-gray mt-1">ישמש בשמות קבצי הייצוא. אותיות קטנות ומספרים בלבד.</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <Checkbox checked={formIsCrossSlug} onCheckedChange={(v) => { setFormIsCrossSlug(!!v); if (v) setFormSlug(''); }} />
                <span className="text-sm flex items-center gap-1">
                  <Globe className="w-4 h-4 text-ono-orange" />
                  מהלך רוחבי (לא משויך לסלאג ספציפי)
                  <InfoTooltip text="מהלך רוחבי חוצה תחומים ואינו שייך לסלאג אחד. לדוגמה: קמפיין כללי של המכללה." />
                </span>
              </label>

              {!formIsCrossSlug && (
                <>
                  <Label>סלאג *</Label>
                  <select value={formSlug} onChange={e => setFormSlug(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                    <option value="">בחר סלאג...</option>
                    {slugs.filter(s => !s.is_archived).map(s => (
                      <option key={s.id} value={s.id}>{s.display_name} ({s.slug})</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך התחלה</Label>
                <Input type="date" className="mt-1" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
              </div>
              <div>
                <Label>תאריך סיום</Label>
                <Input type="date" className="mt-1" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>הערות</Label>
              <Input className="mt-1" placeholder="פרטים נוספים על המהלך..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>ביטול</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName || !formCode || (!formIsCrossSlug && !formSlug)}
              className="bg-ono-green hover:bg-ono-green-dark text-white"
            >
              {saving ? 'שומר...' : 'צור מהלך'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
