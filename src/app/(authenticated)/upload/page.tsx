'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Upload as UploadIcon,
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Package,
  Plus,
  Globe,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DOMAIN_CONTEXTS, PLATFORMS, ASSET_TYPES, FILE_TYPES, containsHebrew } from '@/lib/platform-specs';
import { computeFileSizeLabel } from '@/lib/aspect-ratio';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { Slug, Initiative } from '@/lib/types';

interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
}

const NEWSLETTER_EXTS = new Set(['indd', 'ai', 'eps', 'pub', 'html', 'htm', 'pptx', 'ppt', 'docx', 'doc', 'idml']);

function FileTypeIcon({ type, filename }: { type: string; filename?: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-ono-green" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-platform-meta" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-platform-google" />;
  if (type.includes('zip')) return <Package className="w-5 h-5 text-ono-orange" />;
  // Check newsletter by extension
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (NEWSLETTER_EXTS.has(ext) || type.includes('indesign') || type.includes('publisher') || type === 'text/html') {
    return <Newspaper className="w-5 h-5 text-ono-orange" />;
  }
  return <File className="w-5 h-5 text-ono-gray" />;
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);

  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [domainContext, setDomainContext] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [assetType, setAssetType] = useState('production');
  const [fileTypeOverride, setFileTypeOverride] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [uploadResults, setUploadResults] = useState<{ uploaded: number; errors: number } | null>(null);

  // Quick initiative creation
  const [showInitiativeModal, setShowInitiativeModal] = useState(false);
  const [newInitName, setNewInitName] = useState('');
  const [newInitCode, setNewInitCode] = useState('');
  const [newInitCodeWarning, setNewInitCodeWarning] = useState('');
  const [newInitIsCross, setNewInitIsCross] = useState(false);
  const [newInitStartDate, setNewInitStartDate] = useState('');
  const [newInitEndDate, setNewInitEndDate] = useState('');
  const [savingInitiative, setSavingInitiative] = useState(false);
  const [initError, setInitError] = useState('');

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/workspaces').then(r => r.json()),
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/initiatives').then(r => r.json()),
    ]).then(([ws, sl, ini]) => {
      setWorkspaces(ws);
      setSlugs(sl);
      setInitiatives(ini);
      if (ws.length > 0 && !selectedWorkspace) setSelectedWorkspace(ws[0].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredInitiatives = initiatives.filter(
    (i) => !i.slug_id || i.slug_id === selectedSlug
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const addFiles = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map(f => ({
      file: f, name: f.name, size: f.size, type: f.type,
    }));
    setFiles(prev => [...prev, ...entries]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedSlug || !selectedWorkspace || files.length === 0) return;
    setUploading(true);
    setUploadResults(null);

    const progress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
    files.forEach((_, i) => { progress[i] = 'uploading'; });
    setUploadProgress({ ...progress });

    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file));

    formData.append('workspace_id', selectedWorkspace);
    formData.append('slug_id', selectedSlug);
    formData.append('asset_type', assetType);
    formData.append('upload_date', uploadDate);
    if (selectedInitiative) formData.append('initiative_id', selectedInitiative);
    if (domainContext) formData.append('domain_context', domainContext);
    if (selectedPlatforms.length > 0) formData.append('platforms', JSON.stringify(selectedPlatforms));
    if (tagsInput) formData.append('tags', tagsInput);
    if (fileTypeOverride) formData.append('file_type_override', fileTypeOverride);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();

      files.forEach((f, i) => {
        progress[i] = result.errors?.find((e: { file: string }) => e.file === f.name) ? 'error' : 'done';
      });
      setUploadProgress({ ...progress });
      setUploadResults({
        uploaded: result.uploaded?.length || 0,
        errors: result.errors?.length || 0,
      });
    } catch {
      files.forEach((_, i) => { progress[i] = 'error'; });
      setUploadProgress({ ...progress });
    }

    setUploading(false);
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleCreateInitiative = async () => {
    if (!newInitName || !newInitCode || !selectedWorkspace) return;
    if (!newInitIsCross && !selectedSlug) {
      setInitError('יש לבחור סלאג קודם, או לסמן מהלך רוחבי');
      return;
    }
    setSavingInitiative(true);
    setInitError('');

    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newInitName,
          short_code: newInitCode,
          slug_id: newInitIsCross ? null : selectedSlug,
          workspace_id: selectedWorkspace,
          start_date: newInitStartDate || null,
          end_date: newInitEndDate || null,
          notes: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setInitError(data.error || 'שגיאה ביצירת מהלך');
        setSavingInitiative(false);
        return;
      }

      const created = await res.json();
      // Refresh initiatives and auto-select the new one
      const iniRes = await fetch('/api/initiatives');
      const allIni = await iniRes.json();
      setInitiatives(allIni);
      setSelectedInitiative(created.id);

      // Reset and close
      setNewInitName('');
      setNewInitCode('');
      setNewInitCodeWarning('');
      setNewInitIsCross(false);
      setNewInitStartDate('');
      setNewInitEndDate('');
      setShowInitiativeModal(false);
    } catch {
      setInitError('שגיאה ביצירת מהלך');
    }
    setSavingInitiative(false);
  };

  const zipCount = files.filter(f => f.type.includes('zip') || f.name.endsWith('.zip')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UploadIcon className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">העלאת חומרים</h1>
        <InfoTooltip text="העלו קבצים חדשים למערכת. גררו קבצים לאזור ההעלאה או לחצו לבחירה מהמחשב. קבצי ZIP ייפתחו אוטומטית." size="md" />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-ono-green/40 rounded-lg p-12 text-center hover:border-ono-green hover:bg-ono-green-light/30 transition-colors cursor-pointer"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <UploadIcon className="w-12 h-12 text-ono-green mx-auto mb-4" />
        <p className="text-ono-gray-dark font-medium mb-1">גררו קבצים לכאן או לחצו לבחירה</p>
        <p className="text-sm text-ono-gray">תמונות, וידאו, PDF, ידיעונים (InDesign, AI, HTML, PPTX, DOCX), ZIP — עד 2GB</p>
        <p className="text-xs text-ono-orange mt-2">קבצי ZIP ייפתחו אוטומטית — כל קובץ מוכר בתוכם יועלה בנפרד</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf,.zip,.indd,.ai,.eps,.pub,.html,.htm,.pptx,.ppt,.docx,.doc,.idml"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)]">
          <div className="p-4 border-b border-[#E8E8E8]">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-ono-gray-dark">
                {files.length} קבצים נבחרו
                {zipCount > 0 && (
                  <span className="text-xs text-ono-orange mr-2">({zipCount} ZIP - ייפתחו אוטומטית)</span>
                )}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-ono-gray">נקה הכל</Button>
            </div>
          </div>
          <div className="divide-y divide-[#E8E8E8] max-h-60 overflow-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <FileTypeIcon type={f.type} filename={f.name} />
                  <div>
                    <p className="text-sm text-ono-gray-dark">{f.name}</p>
                    <p className="text-xs text-ono-gray">{computeFileSizeLabel(f.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadProgress[i] === 'done' && <CheckCircle className="w-4 h-4 text-ono-green" />}
                  {uploadProgress[i] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {uploadProgress[i] === 'uploading' && <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" />}
                  <Button variant="ghost" size="sm" onClick={() => removeFile(i)}><X className="w-4 h-4 text-ono-gray" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classification panel */}
      {files.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
          <h3 className="font-bold text-ono-gray-dark">סיווג חומרים</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.length > 1 && (
              <div>
                <Label>סביבת עבודה</Label>
                <select value={selectedWorkspace} onChange={e => setSelectedWorkspace(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                  {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1">סלאג * <InfoTooltip text="הסלאג מייצג את התחום או המחלקה שאליה שייך החומר, למשל: mba, law, cs. חובה לבחור סלאג." /></Label>
              <select value={selectedSlug} onChange={e => { setSelectedSlug(e.target.value); setSelectedInitiative(''); }} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר סלאג...</option>
                {slugs.filter(s => !s.is_archived).map(s => (
                  <option key={s.id} value={s.id}>{s.slug.includes('-') ? '  \u2190 ' : ''}{s.display_name} ({s.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-1">מהלך שיווקי (אופציונלי) <InfoTooltip text="שייכו את החומר למהלך/קמפיין ספציפי. ניתן גם ליצור מהלך חדש ישירות מכאן." /></Label>
              <div className="flex gap-1.5 mt-1">
                <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} className="flex-1 border border-[#E8E8E8] rounded-md p-2 text-sm">
                  <option value="">ללא מהלך</option>
                  {filteredInitiatives.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.short_code}) {!i.slug_id ? '\uD83C\uDF10' : ''}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-[38px] px-2.5 border-ono-green text-ono-green hover:bg-ono-green-light"
                  onClick={() => { setShowInitiativeModal(true); setInitError(''); }}
                  title="צור מהלך חדש"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1">סוג חומר <InfoTooltip text="חומרי הפקה = קבצים מוגמרים מוכנים לשימוש. חומרי מקור = קבצי עיצוב מקוריים. טיוטות = גרסאות ביניים." /></Label>
              <select value={assetType} onChange={e => setAssetType(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-1">סוג קובץ <InfoTooltip text="בד&quot;כ המערכת מזהה אוטומטית. בחרו &quot;ידיעונים וברושורים&quot; כדי לסווג ידנית קבצים כמו ניוזלטרים, ברושורים, עלוני מידע." /></Label>
              <select value={fileTypeOverride} onChange={e => setFileTypeOverride(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">זיהוי אוטומטי</option>
                {FILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-1">הקשר תחומי <InfoTooltip text="מגדיר את סוג השימוש: סושיאל, דיספליי, דפוס, מיתוג או פנימי. עוזר לסנן ולארגן חומרים." /></Label>
              <select value={domainContext} onChange={e => setDomainContext(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר...</option>
                {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-1">תאריך מסמך <InfoTooltip text="תאריך המסמך המקורי. ברירת מחדל: היום. ניתן לשנות לתאריך ישן יותר אם מעלים חומר ישן." /></Label>
              <Input type="date" className="mt-1" value={uploadDate} onChange={e => setUploadDate(e.target.value)} />
              <p className="text-[10px] text-ono-gray mt-0.5">ברירת מחדל: היום. ניתן לשנות.</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 flex items-center gap-1">פלטפורמות <InfoTooltip text="סמנו את הפלטפורמות שבהן החומר ישמש: META, Google Ads, TikTok, LinkedIn. ניתן לבחור מספר פלטפורמות." /></Label>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map(p => (
                <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedPlatforms.includes(p.value)} onCheckedChange={() => togglePlatform(p.value)} />
                  <Badge style={{ backgroundColor: `${p.color}20`, color: p.color, borderColor: p.color }} className="border text-xs">{p.label}</Badge>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">תגיות (מופרדות בפסיקים) <InfoTooltip text="הוסיפו מילות מפתח לחיפוש מהיר. הפרידו בפסיקים, למשל: קיץ 2025, קמפוס, תלמידים." /></Label>
            <Input className="mt-1" placeholder="קיץ 2025, קמפוס, תלמידים" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
          </div>

          {uploadResults && (
            <div className={`p-3 rounded-lg ${uploadResults.errors > 0 ? 'bg-ono-orange-light' : 'bg-ono-green-light'}`}>
              <p className="text-sm font-medium">
                {uploadResults.uploaded > 0 && <span className="text-ono-green-dark">{'\u2713'} {uploadResults.uploaded} קבצים הועלו בהצלחה</span>}
                {uploadResults.errors > 0 && <span className="text-ono-orange mr-3">{'\u2717'} {uploadResults.errors} קבצים נכשלו</span>}
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedSlug || files.length === 0}
            className="bg-ono-green hover:bg-ono-green-dark text-white w-full py-3"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                מעלה...
              </span>
            ) : (
              `העלה ${files.length} קבצים`
            )}
          </Button>
        </div>
      )}

      {/* Quick Initiative Creation Modal */}
      <Dialog open={showInitiativeModal} onOpenChange={setShowInitiativeModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-ono-green" />
              יצירת מהלך שיווקי מהיר
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="flex items-center gap-1">שם המהלך * <InfoTooltip text="שם תיאורי בעברית, למשל: קמפיין חזרה ללימודים 2025." /></Label>
              <Input className="mt-1" placeholder="קמפיין חזרה ללימודים 2025" value={newInitName} onChange={e => setNewInitName(e.target.value)} />
            </div>

            <div>
              <Label className="flex items-center gap-1">קוד קצר (באנגלית) * <InfoTooltip text="קוד באנגלית שישמש בשמות קבצי ייצוא. אותיות קטנות ומספרים בלבד." /></Label>
              <Input
                dir="ltr"
                className={`text-left font-mono mt-1 ${newInitCodeWarning ? 'border-ono-orange' : ''}`}
                placeholder="bts25"
                value={newInitCode}
                onChange={e => {
                  const raw = e.target.value;
                  if (containsHebrew(raw)) {
                    setNewInitCodeWarning('שדה זה מקבל אותיות באנגלית בלבד.');
                    return;
                  }
                  setNewInitCodeWarning('');
                  setNewInitCode(raw.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }}
              />
              {newInitCodeWarning && (
                <p className="text-xs text-ono-orange mt-1">{newInitCodeWarning}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={newInitIsCross} onCheckedChange={v => setNewInitIsCross(!!v)} />
                <span className="text-sm flex items-center gap-1">
                  <Globe className="w-4 h-4 text-ono-orange" />
                  מהלך רוחבי (חוצה סלאגים)
                </span>
              </label>
              {!newInitIsCross && !selectedSlug && (
                <p className="text-xs text-ono-orange mt-1">יש לבחור סלאג בטופס ההעלאה קודם, או לסמן מהלך רוחבי.</p>
              )}
              {!newInitIsCross && selectedSlug && (
                <p className="text-xs text-ono-gray mt-1">
                  ישויך לסלאג: {slugs.find(s => s.id === selectedSlug)?.display_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך התחלה</Label>
                <Input type="date" className="mt-1" value={newInitStartDate} onChange={e => setNewInitStartDate(e.target.value)} />
              </div>
              <div>
                <Label>תאריך סיום</Label>
                <Input type="date" className="mt-1" value={newInitEndDate} onChange={e => setNewInitEndDate(e.target.value)} />
              </div>
            </div>

            {initError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{initError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiativeModal(false)}>ביטול</Button>
            <Button
              onClick={handleCreateInitiative}
              disabled={savingInitiative || !newInitName || !newInitCode || (!newInitIsCross && !selectedSlug)}
              className="bg-ono-green hover:bg-ono-green-dark text-white"
            >
              {savingInitiative ? 'יוצר...' : 'צור מהלך'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
