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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DOMAIN_CONTEXTS, PLATFORMS, ASSET_TYPES } from '@/lib/platform-specs';
import { computeFileSizeLabel } from '@/lib/aspect-ratio';
import type { Slug, Initiative } from '@/lib/types';

interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-ono-green" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-platform-meta" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-platform-google" />;
  if (type.includes('zip')) return <Package className="w-5 h-5 text-ono-orange" />;
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
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [uploadResults, setUploadResults] = useState<{ uploaded: number; errors: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/workspaces').then(r => r.json()),
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/initiatives').then(r => r.json()),
    ]).then(([ws, sl, ini]) => {
      setWorkspaces(ws);
      setSlugs(sl);
      setInitiatives(ini);
      if (ws.length > 0) setSelectedWorkspace(ws[0].id);
    });
  }, []);

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

  const zipCount = files.filter(f => f.type.includes('zip') || f.name.endsWith('.zip')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UploadIcon className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">העלאת חומרים</h1>
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
        <p className="text-sm text-ono-gray">JPG, PNG, MP4, MOV, GIF, PDF, ZIP — עד 2GB לקובץ</p>
        <p className="text-xs text-ono-orange mt-2">קבצי ZIP ייפתחו אוטומטית — כל קובץ תמונה/וידאו/PDF בתוכם יועלה בנפרד</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf,.zip"
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
                  <FileTypeIcon type={f.type} />
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
              <Label>סלאג *</Label>
              <select value={selectedSlug} onChange={e => { setSelectedSlug(e.target.value); setSelectedInitiative(''); }} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר סלאג...</option>
                {slugs.filter(s => !s.is_archived).map(s => (
                  <option key={s.id} value={s.id}>{s.slug.includes('-') ? '  ← ' : ''}{s.display_name} ({s.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <Label>מהלך שיווקי (אופציונלי)</Label>
              <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">ללא מהלך</option>
                {filteredInitiatives.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.short_code}) {!i.slug_id ? '🌐' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>סוג חומר</Label>
              <select value={assetType} onChange={e => setAssetType(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <Label>הקשר תחומי</Label>
              <select value={domainContext} onChange={e => setDomainContext(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר...</option>
                {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <Label>תאריך מסמך</Label>
              <Input type="date" className="mt-1" value={uploadDate} onChange={e => setUploadDate(e.target.value)} />
              <p className="text-[10px] text-ono-gray mt-0.5">ברירת מחדל: היום. ניתן לשנות.</p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">פלטפורמות</Label>
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
            <Label>תגיות (מופרדות בפסיקים)</Label>
            <Input className="mt-1" placeholder="קיץ 2025, קמפוס, תלמידים" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
          </div>

          {uploadResults && (
            <div className={`p-3 rounded-lg ${uploadResults.errors > 0 ? 'bg-ono-orange-light' : 'bg-ono-green-light'}`}>
              <p className="text-sm font-medium">
                {uploadResults.uploaded > 0 && <span className="text-ono-green-dark">✓ {uploadResults.uploaded} קבצים הועלו בהצלחה</span>}
                {uploadResults.errors > 0 && <span className="text-ono-orange mr-3">✗ {uploadResults.errors} קבצים נכשלו</span>}
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
    </div>
  );
}
