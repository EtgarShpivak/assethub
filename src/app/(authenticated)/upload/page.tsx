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
  Star,
  ScrollText,
  ExternalLink,
  Link as LinkIcon,
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
import { DOMAIN_CONTEXTS, PLATFORMS, ASSET_TYPES, containsHebrew } from '@/lib/platform-specs';
import { computeFileSizeLabel } from '@/lib/aspect-ratio';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useGlobalToast } from '@/components/ui/global-toast';
import { logClientError } from '@/lib/error-logger';
import type { Slug, Initiative } from '@/lib/types';

interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const NEWSLETTER_EXTS = new Set(['indd', 'ai', 'eps', 'pub', 'html', 'htm', 'pptx', 'ppt', 'idml']);
const BRIEF_EXTS = new Set(['docx', 'doc', 'txt', 'rtf', 'odt', 'pages']);

function FileTypeIcon({ type, filename }: { type: string; filename?: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-ono-green" />;
  if (type.startsWith('video/')) return <Film className="w-5 h-5 text-platform-meta" />;
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-platform-google" />;
  if (type.includes('zip')) return <Package className="w-5 h-5 text-ono-orange" />;
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  // Brief (documents)
  if (BRIEF_EXTS.has(ext) || type === 'application/msword' || type.includes('wordprocessingml') || type === 'text/plain' || type.includes('rtf') || type.includes('opendocument.text')) {
    return <ScrollText className="w-5 h-5 text-sky-600" />;
  }
  // Newsletter by extension
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [assetType, setAssetType] = useState('production');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [noExpiry, setNoExpiry] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [autoFavorite, setAutoFavorite] = useState(false);

  // Tab mode: files or link
  const [uploadMode, setUploadMode] = useState<'files' | 'link'>('files');
  // Link form state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [filePercent, setFilePercent] = useState<Record<number, number>>({}); // per-file 0-100
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

  const { showError, showSuccess, showWarning } = useGlobalToast();

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/workspaces').then(r => r.json()),
      fetch('/api/slugs').then(r => r.json()),
      fetch('/api/initiatives').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]).then(([ws, sl, ini, tags]) => {
      setWorkspaces(ws);
      setSlugs(sl);
      setInitiatives(ini);
      setAvailableTags(tags || []);
      if (ws.length > 0 && !selectedWorkspace) setSelectedWorkspace(ws[0].id);
    }).catch(() => {
      showError('שגיאה בטעינת נתוני הטופס', 'לא ניתן היה לטעון סלאגים, קמפיינים ותגיות.', 'רענן את הדף ונסה שוב.');
      logClientError('upload-fetch-data', 'Failed to load upload form data');
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
    const entries: FileEntry[] = newFiles.map(f => {
      const isZip = f.type.includes('zip') || f.name.toLowerCase().endsWith('.zip');
      const tooLarge = !isZip && f.size > MAX_FILE_SIZE;
      return {
        file: f, name: f.name, size: f.size, type: f.type,
        error: tooLarge ? `הקובץ גדול מדי (${(f.size / (1024 * 1024)).toFixed(1)} MB). הגודל המקסימלי הוא 50MB` : undefined,
      };
    });
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
    files.forEach((_, i) => { progress[i] = 'pending'; });

    // Split files: oversized already have errors, then ZIPs vs direct
    const validFiles = files.filter(f => !f.error);
    const zipFiles = validFiles.filter(f => f.type.includes('zip') || f.name.toLowerCase().endsWith('.zip'));
    const directFiles = validFiles.filter(f => !f.type.includes('zip') && !f.name.toLowerCase().endsWith('.zip'));

    // Mark oversized as error immediately
    files.forEach((f, i) => { if (f.error) progress[i] = 'error'; });
    setUploadProgress({ ...progress });

    let totalUploaded = 0;
    let totalErrors = files.filter(f => f.error).length;
    const allErrorDetails: { file: string; error: string }[] = files
      .filter(f => f.error)
      .map(f => ({ file: f.name, error: f.error! }));

    // --- Phase A: Upload ZIPs through existing route ---
    if (zipFiles.length > 0) {
      const zipIndices = files.map((f, i) => zipFiles.includes(f) ? i : -1).filter(i => i >= 0);
      zipIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      const formData = new FormData();
      zipFiles.forEach(f => formData.append('files', f.file));
      formData.append('workspace_id', selectedWorkspace);
      formData.append('slug_id', selectedSlug);
      formData.append('asset_type', assetType);
      formData.append('upload_date', uploadDate);
      if (expiresAt) formData.append('expires_at', new Date(expiresAt).toISOString());
      if (selectedInitiative) formData.append('initiative_id', selectedInitiative);
      if (domainContext) formData.append('domain_context', domainContext);
      if (selectedPlatforms.length > 0) formData.append('platforms', JSON.stringify(selectedPlatforms));
      if (selectedTags.length > 0) formData.append('tags', selectedTags.join(','));

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const result = await res.json();
          totalUploaded += result.uploaded?.length || 0;
          if (result.errors?.length) {
            totalErrors += result.errors.length;
            allErrorDetails.push(...result.errors);
          }
          zipIndices.forEach(i => {
            progress[i] = result.errors?.find((e: { file: string }) => e.file === files[i].name) ? 'error' : 'done';
          });
        } else {
          zipIndices.forEach(i => { progress[i] = 'error'; });
          totalErrors += zipFiles.length;
        }
      } catch {
        zipIndices.forEach(i => { progress[i] = 'error'; });
        totalErrors += zipFiles.length;
      }
      setUploadProgress({ ...progress });
    }

    // --- Phase B: Direct upload for non-ZIP files ---
    if (directFiles.length > 0) {
      const directIndices = files.map((f, i) => directFiles.includes(f) ? i : -1).filter(i => i >= 0);
      directIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      try {
        // B1: Prepare — get signed URLs
        const prepareRes = await fetch('/api/upload/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: directFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
            slug_id: selectedSlug,
            workspace_id: selectedWorkspace,
            initiative_id: selectedInitiative || undefined,
            upload_date: uploadDate,
            asset_type: assetType,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          }),
        });

        if (!prepareRes.ok) {
          directIndices.forEach(i => { progress[i] = 'error'; });
          totalErrors += directFiles.length;
          setUploadProgress({ ...progress });
        } else {
          const prepareData = await prepareRes.json();

          // Handle files rejected by prepare
          if (prepareData.errors?.length) {
            totalErrors += prepareData.errors.length;
            allErrorDetails.push(...prepareData.errors);
            for (const err of prepareData.errors) {
              const idx = files.findIndex(f => f.name === err.file);
              if (idx >= 0) progress[idx] = 'error';
            }
            setUploadProgress({ ...progress });
          }

          // B2: Upload files in parallel (up to 3 concurrent) via signed URLs (XHR for progress)
          const successfulUploads: typeof prepareData.files = [];
          const CONCURRENCY = 3;
          const preparedFiles = prepareData.files || [];

          const uploadOne = async (prepared: typeof preparedFiles[0]) => {
            const fileEntry = directFiles.find(f => f.name === prepared.originalName);
            const fileIdx = files.findIndex(f => f.name === prepared.originalName);
            if (!fileEntry || fileIdx < 0) return;

            try {
              await new Promise<void>((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', prepared.signedUrl);
                xhr.setRequestHeader('Content-Type', fileEntry.type || 'application/octet-stream');

                xhr.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setFilePercent(prev => ({ ...prev, [fileIdx]: pct }));
                  }
                };

                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    progress[fileIdx] = 'done';
                    setFilePercent(prev => ({ ...prev, [fileIdx]: 100 }));
                    successfulUploads.push(prepared);
                    resolve();
                  } else {
                    progress[fileIdx] = 'error';
                    totalErrors++;
                    let errorMsg = '';
                    if (xhr.status === 400) {
                      errorMsg = 'הקובץ נדחה על ידי השרת. ייתכן שפג תוקף הקישור — נסה להעלות שוב.';
                    } else if (xhr.status === 403) {
                      errorMsg = 'אין הרשאה להעלות קובץ זה. בדוק שהסלאג קיים ושיש לך גישה.';
                    } else if (xhr.status === 404) {
                      errorMsg = 'מיקום ההעלאה לא נמצא. ייתכן שהסלאג נמחק — נסה לבחור סלאג אחר.';
                    } else if (xhr.status === 413) {
                      errorMsg = 'הקובץ גדול מדי. הגודל המקסימלי הוא 50MB.';
                    } else if (xhr.status >= 500) {
                      errorMsg = 'שגיאת שרת. אחסון הקבצים לא זמין כרגע — נסה שוב בעוד דקה.';
                    } else {
                      errorMsg = `שגיאה בהעלאה (קוד ${xhr.status}). נסה שוב.`;
                    }
                    allErrorDetails.push({ file: prepared.originalName, error: errorMsg });
                    resolve();
                  }
                };

                xhr.onerror = () => {
                  progress[fileIdx] = 'error';
                  totalErrors++;
                  allErrorDetails.push({ file: prepared.originalName, error: 'שגיאת רשת — בדוק את חיבור האינטרנט ונסה שוב.' });
                  resolve();
                };

                xhr.send(fileEntry.file);
              });
            } catch {
              progress[fileIdx] = 'error';
              totalErrors++;
              allErrorDetails.push({ file: prepared.originalName, error: 'שגיאת רשת — בדוק את חיבור האינטרנט ונסה שוב.' });
            }
            setUploadProgress({ ...progress });
          };

          // Process in batches of CONCURRENCY
          for (let i = 0; i < preparedFiles.length; i += CONCURRENCY) {
            const batch = preparedFiles.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(uploadOne));
          }

          // B3: Complete — create DB records for successful uploads
          if (successfulUploads.length > 0) {
            try {
              const completeRes = await fetch('/api/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  files: successfulUploads.map((p: { originalName: string; storagePath: string; fileType: string }) => ({
                    originalName: p.originalName,
                    storagePath: p.storagePath,
                    size: directFiles.find(f => f.name === p.originalName)?.size || 0,
                    type: directFiles.find(f => f.name === p.originalName)?.type || '',
                    fileType: p.fileType,
                  })),
                  slug_id: selectedSlug,
                  workspace_id: selectedWorkspace,
                  initiative_id: selectedInitiative || undefined,
                  domain_context: domainContext || undefined,
                  platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
                  tags: selectedTags.length > 0 ? selectedTags : undefined,
                  upload_date: uploadDate,
                  asset_type: assetType,
                  expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                }),
              });

              if (completeRes.ok) {
                const completeData = await completeRes.json();
                totalUploaded += completeData.uploaded?.length || 0;
                if (completeData.errors?.length) {
                  totalErrors += completeData.errors.length;
                  allErrorDetails.push(...completeData.errors);
                  for (const err of completeData.errors) {
                    const idx = files.findIndex(f => f.name === err.file);
                    if (idx >= 0) progress[idx] = 'error';
                  }
                }
              } else {
                for (const p of successfulUploads) {
                  const idx = files.findIndex(f => f.name === (p as { originalName: string }).originalName);
                  if (idx >= 0) progress[idx] = 'error';
                  totalErrors++;
                }
              }
            } catch {
              for (const p of successfulUploads) {
                const idx = files.findIndex(f => f.name === (p as { originalName: string }).originalName);
                if (idx >= 0) progress[idx] = 'error';
                totalErrors++;
              }
            }
            setUploadProgress({ ...progress });
          }
        }
      } catch (err) {
        directIndices.forEach(i => { progress[i] = 'error'; });
        totalErrors += directFiles.length;
        setUploadProgress({ ...progress });
        await logClientError('upload-direct', err instanceof Error ? err.message : 'Network error');
      }
    }

    // Auto-favorite uploaded assets
    if (autoFavorite && totalUploaded > 0) {
      try {
        const recentRes = await fetch(`/api/assets?slug_id=${selectedSlug}&sort_by=upload_date&sort_dir=desc&limit=${totalUploaded}`);
        const recentData = await recentRes.json();
        const recentAssets = recentData.assets || [];
        for (const a of recentAssets) {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asset_id: a.id }),
          });
        }
      } catch { /* ignore favorites error */ }
    }

    // Show results
    setUploadResults({ uploaded: totalUploaded, errors: totalErrors });
    if (totalUploaded > 0 && totalErrors === 0) {
      showSuccess(`${totalUploaded} קבצים הועלו בהצלחה`);
    } else if (totalUploaded > 0 && totalErrors > 0) {
      showWarning(
        `${totalUploaded} קבצים הועלו, ${totalErrors} נכשלו`,
        allErrorDetails.map(e => `${e.file}: ${e.error}`).join(' | '),
        'בדוק את הקבצים שנכשלו ונסה להעלות אותם שוב.',
      );
    } else if (totalErrors > 0) {
      showError(
        'כל הקבצים נכשלו בהעלאה',
        allErrorDetails.map(e => `${e.file}: ${e.error}`).join(' | '),
        'בדוק את סוג הקבצים ואת הגודל ונסה שוב.',
      );
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

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleCreateLink = async () => {
    if (!linkUrl || !linkTitle || !selectedSlug || !selectedWorkspace) return;
    if (!isValidUrl(linkUrl)) {
      showError('כתובת URL לא תקינה', 'יש להזין כתובת מלאה, למשל: https://example.com');
      return;
    }
    setSavingLink(true);
    try {
      const res = await fetch('/api/assets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace,
          slug_id: selectedSlug,
          initiative_id: selectedInitiative || undefined,
          title: linkTitle,
          url: linkUrl,
          notes: linkNotes || undefined,
          domain_context: domainContext || undefined,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          asset_type: assetType,
          upload_date: uploadDate,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        showSuccess('הקישור נשמר בהצלחה');
        setLinkUrl('');
        setLinkTitle('');
        setLinkNotes('');
      } else {
        const data = await res.json();
        showError('שגיאה בשמירת הקישור', data.error || '');
      }
    } catch {
      showError('שגיאת רשת', 'לא ניתן לשמור את הקישור. בדוק את חיבור האינטרנט.');
    }
    setSavingLink(false);
  };

  const zipCount = files.filter(f => f.type.includes('zip') || f.name.endsWith('.zip')).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UploadIcon className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">העלאת חומרים</h1>
        <InfoTooltip text="העלו קבצים חדשים למערכת, או הוסיפו קישור חיצוני עם תיאור." size="md" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-ono-gray-light rounded-lg p-1">
        <button
          onClick={() => setUploadMode('files')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${uploadMode === 'files' ? 'bg-white shadow-sm text-ono-gray-dark' : 'text-ono-gray hover:text-ono-gray-dark'}`}
        >
          <UploadIcon className="w-4 h-4" />
          העלאת קבצים
        </button>
        <button
          onClick={() => setUploadMode('link')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${uploadMode === 'link' ? 'bg-white shadow-sm text-ono-gray-dark' : 'text-ono-gray hover:text-ono-gray-dark'}`}
        >
          <LinkIcon className="w-4 h-4" />
          הוספת קישור
        </button>
      </div>

      {uploadMode === 'files' && <>
      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-ono-green/40 rounded-lg p-12 text-center hover:border-ono-green hover:bg-ono-green-light/30 transition-colors cursor-pointer"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <UploadIcon className="w-12 h-12 text-ono-green mx-auto mb-4" />
        <p className="text-ono-gray-dark font-medium mb-1">גררו קבצים לכאן או לחצו לבחירה</p>
        <p className="text-sm text-ono-green font-medium">ניתן להעלות מספר קבצים במקביל</p>
        <p className="text-sm text-ono-gray mt-1">תמונות, וידאו, PDF, מסמכים, ידיעונים (InDesign, AI, HTML, PPTX), ZIP — עד 50MB לקובץ</p>
        <p className="text-xs text-ono-orange mt-2">קבצי ZIP ייפתחו אוטומטית — כל קובץ מוכר בתוכם יועלה בנפרד</p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif,.heic,.heif,.avif,.mp4,.mov,.webm,.avi,.mpeg,.mpg,.mkv,.3gp,.ogg,.pdf,.zip,.indd,.ai,.eps,.pub,.html,.htm,.pptx,.ppt,.docx,.doc,.idml,.txt,.rtf,.odt,.pages"
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
              <div key={i} className={`px-4 py-2.5 ${f.error ? 'bg-red-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileTypeIcon type={f.type} filename={f.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ono-gray-dark truncate">{f.name}</p>
                      <p className="text-xs text-ono-gray">{computeFileSizeLabel(f.size)}</p>
                      {f.error && <p className="text-xs text-red-600 mt-0.5">{f.error}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {uploadProgress[i] === 'done' && <CheckCircle className="w-4 h-4 text-ono-green" />}
                    {uploadProgress[i] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {uploadProgress[i] === 'uploading' && (
                      <span className="text-xs text-ono-green font-medium min-w-[32px] text-left">
                        {filePercent[i] != null ? `${filePercent[i]}%` : ''}
                      </span>
                    )}
                    {!uploading && <Button variant="ghost" size="sm" onClick={() => removeFile(i)}><X className="w-4 h-4 text-ono-gray" /></Button>}
                  </div>
                </div>
                {uploadProgress[i] === 'uploading' && filePercent[i] != null && (
                  <div className="mt-1.5 w-full bg-[#E8E8E8] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-ono-green rounded-full transition-all duration-200"
                      style={{ width: `${filePercent[i]}%` }}
                    />
                  </div>
                )}
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
              <Label className="flex items-center gap-1">קמפיין (אופציונלי) <InfoTooltip text="שייכו את החומר לקמפיין ספציפי. ניתן גם ליצור קמפיין חדש ישירות מכאן." /></Label>
              <div className="flex gap-1.5 mt-1">
                <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} className="flex-1 border border-[#E8E8E8] rounded-md p-2 text-sm">
                  <option value="">ללא קמפיין</option>
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
              <Label className="flex items-center gap-1">סוג תוכן <InfoTooltip text="מגדיר את סוג השימוש: סושיאל, שילוט, דפוס, מיתוג, ידיעונים או פנימי. הסוג הטכני (תמונה, PDF, וידאו) מזוהה אוטומטית." /></Label>
              <select value={domainContext} onChange={e => setDomainContext(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר...</option>
                {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <Label className="flex items-center gap-1">תאריך המסמך המקורי <InfoTooltip text="תאריך המסמך המקורי. ברירת מחדל: היום. ניתן לשנות לתאריך ישן יותר אם מעלים חומר ישן." /></Label>
              <Input type="date" className="mt-1" value={uploadDate} onChange={e => setUploadDate(e.target.value)} />
              <p className="text-[10px] text-ono-gray mt-0.5">ברירת מחדל: היום. ניתן לשנות.</p>
            </div>

            <div>
              <Label className="flex items-center gap-1">תוקף תוכן <InfoTooltip text="הגדירו תאריך תפוגה לתוכן. לאחר התאריך התוכן יימחק אוטומטית מהמערכת." /></Label>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox checked={noExpiry} onCheckedChange={(c) => { setNoExpiry(!!c); if (c) setExpiresAt(''); }} className="h-4 w-4" />
                <span className="text-sm text-ono-gray-dark">ללא הגבלת תוקף</span>
              </div>
              {!noExpiry && (
                <Input type="date" className="mt-2" dir="ltr" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              )}
            </div>
          </div>

          {domainContext === 'social' && (
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
          )}

          <div>
            <Label className="flex items-center gap-1">תגיות <InfoTooltip text="בחרו תגיות קיימות או הוסיפו חדשות. תגיות עוזרות לחיפוש מהיר של חומרים." /></Label>
            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} className="bg-ono-green-light text-ono-green-dark border border-ono-green/30 text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors" onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
                    {tag} <X className="w-3 h-3 mr-1" />
                  </Badge>
                ))}
              </div>
            )}
            {/* Tag input with suggestions */}
            <div className="relative">
              <Input
                className="mt-1"
                placeholder="הקלידו לחיפוש או הוספת תגית חדשה..."
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    const newTag = tagInput.trim();
                    if (!selectedTags.includes(newTag)) {
                      setSelectedTags(prev => [...prev, newTag]);
                    }
                    setTagInput('');
                    setShowTagSuggestions(false);
                  }
                }}
              />
              {showTagSuggestions && (tagInput || availableTags.length > 0) && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#E8E8E8] rounded-md shadow-lg max-h-40 overflow-auto">
                  {availableTags
                    .filter(t => !selectedTags.includes(t.name) && (!tagInput || t.name.includes(tagInput)))
                    .slice(0, 10)
                    .map(tag => (
                      <button
                        key={tag.name}
                        type="button"
                        className="w-full text-right px-3 py-1.5 text-sm hover:bg-ono-green-light/50 transition-colors"
                        onMouseDown={e => {
                          e.preventDefault();
                          setSelectedTags(prev => [...prev, tag.name]);
                          setTagInput('');
                          setShowTagSuggestions(false);
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  {tagInput.trim() && !availableTags.some(t => t.name === tagInput.trim()) && !selectedTags.includes(tagInput.trim()) && (
                    <button
                      type="button"
                      className="w-full text-right px-3 py-1.5 text-sm text-ono-green font-medium hover:bg-ono-green-light/50 transition-colors border-t border-[#E8E8E8]"
                      onMouseDown={e => {
                        e.preventDefault();
                        setSelectedTags(prev => [...prev, tagInput.trim()]);
                        setTagInput('');
                        setShowTagSuggestions(false);
                      }}
                    >
                      + הוסף &quot;{tagInput.trim()}&quot;
                    </button>
                  )}
                  {availableTags.filter(t => !selectedTags.includes(t.name) && (!tagInput || t.name.includes(tagInput))).length === 0 && !tagInput.trim() && (
                    <p className="px-3 py-2 text-xs text-ono-gray">אין תגיות עדיין. הקלידו להוספת תגית חדשה.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload progress bar */}
          {uploading && files.length > 0 && (() => {
            const total = files.filter(f => !f.error).length;
            const done = Object.values(uploadProgress).filter(s => s === 'done').length;
            const errored = Object.values(uploadProgress).filter(s => s === 'error').length - files.filter(f => f.error).length;
            const completed = done + Math.max(0, errored);
            const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;
            // For files currently uploading, factor in their individual progress
            let weightedPct = 0;
            if (total > 0) {
              let sumPct = 0;
              files.forEach((f, i) => {
                if (f.error) return;
                if (uploadProgress[i] === 'done') sumPct += 100;
                else if (uploadProgress[i] === 'error') sumPct += 100;
                else if (uploadProgress[i] === 'uploading') sumPct += (filePercent[i] || 0);
              });
              weightedPct = Math.round(sumPct / total);
            }
            const displayPct = Math.max(overallPct, weightedPct);

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ono-gray-dark font-medium">מעלה קבצים...</span>
                  <span className="text-ono-gray">{done}/{total} הושלמו · {displayPct}%</span>
                </div>
                <div className="w-full bg-[#E8E8E8] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-ono-green rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${displayPct}%` }}
                  />
                </div>
                {errored > 0 && (
                  <p className="text-xs text-red-500">{errored} קבצים נכשלו</p>
                )}
              </div>
            );
          })()}

          {uploadResults && !uploading && (
            <div className={`p-3 rounded-lg ${uploadResults.errors > 0 ? 'bg-ono-orange-light' : 'bg-ono-green-light'}`}>
              <p className="text-sm font-medium">
                {uploadResults.uploaded > 0 && <span className="text-ono-green-dark">{'\u2713'} {uploadResults.uploaded} קבצים הועלו בהצלחה</span>}
                {uploadResults.errors > 0 && <span className="text-ono-orange mr-3">{'\u2717'} {uploadResults.errors} קבצים נכשלו</span>}
              </p>
            </div>
          )}

          {/* Auto-favorite option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={autoFavorite} onCheckedChange={v => setAutoFavorite(!!v)} className="h-4 w-4" />
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-ono-gray-dark">הוסף אוטומטית למועדפים לאחר העלאה</span>
          </label>

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

      </>}

      {/* Link Form */}
      {uploadMode === 'link' && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-ono-gray-dark">הוספת קישור חיצוני</h3>
          </div>
          <p className="text-sm text-ono-gray">הוסיפו קישור לעמוד חיצוני עם תיאור. הקישור יופיע כנכס בספריית החומרים.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="flex items-center gap-1">כתובת URL *</Label>
              <Input dir="ltr" className="mt-1 text-left font-mono" placeholder="https://example.com/page" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label className="flex items-center gap-1">כותרת *</Label>
              <Input className="mt-1" placeholder="שם תיאורי לקישור" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label>תיאור (אופציונלי)</Label>
              <textarea className="w-full mt-1 border border-[#E8E8E8] rounded-md p-2 text-sm min-h-[80px] resize-y" placeholder="תיאור קצר של מה שנמצא בקישור..." value={linkNotes} onChange={e => setLinkNotes(e.target.value)} />
            </div>

            {workspaces.length > 1 && (
              <div>
                <Label>סביבת עבודה</Label>
                <select value={selectedWorkspace} onChange={e => setSelectedWorkspace(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                  {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-1">סלאג * <InfoTooltip text="הסלאג מייצג את התחום שאליו שייך הקישור." /></Label>
              <select value={selectedSlug} onChange={e => { setSelectedSlug(e.target.value); setSelectedInitiative(''); }} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר סלאג...</option>
                {slugs.filter(s => !s.is_archived).map(s => (
                  <option key={s.id} value={s.id}>{s.display_name} ({s.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <Label>קמפיין (אופציונלי)</Label>
              <select value={selectedInitiative} onChange={e => setSelectedInitiative(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">ללא קמפיין</option>
                {filteredInitiatives.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.short_code})</option>
                ))}
              </select>
            </div>

            <div>
              <Label>סוג תוכן</Label>
              <select value={domainContext} onChange={e => setDomainContext(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר...</option>
                {DOMAIN_CONTEXTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">תגיות</Label>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} className="bg-ono-green-light text-ono-green-dark border border-ono-green/30 text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors" onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
                    {tag} <X className="w-3 h-3 mr-1" />
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Input
                className="mt-1"
                placeholder="הקלידו לחיפוש או הוספת תגית..."
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    const newTag = tagInput.trim();
                    if (!selectedTags.includes(newTag)) setSelectedTags(prev => [...prev, newTag]);
                    setTagInput('');
                    setShowTagSuggestions(false);
                  }
                }}
              />
              {showTagSuggestions && (tagInput || availableTags.length > 0) && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-[#E8E8E8] rounded-md shadow-lg max-h-40 overflow-auto">
                  {availableTags
                    .filter(t => !selectedTags.includes(t.name) && (!tagInput || t.name.includes(tagInput)))
                    .slice(0, 10)
                    .map(tag => (
                      <button key={tag.name} type="button" className="w-full text-right px-3 py-1.5 text-sm hover:bg-ono-green-light/50 transition-colors" onMouseDown={e => { e.preventDefault(); setSelectedTags(prev => [...prev, tag.name]); setTagInput(''); setShowTagSuggestions(false); }}>{tag.name}</button>
                    ))}
                  {tagInput.trim() && !availableTags.some(t => t.name === tagInput.trim()) && !selectedTags.includes(tagInput.trim()) && (
                    <button type="button" className="w-full text-right px-3 py-1.5 text-sm text-ono-green font-medium hover:bg-ono-green-light/50 transition-colors border-t border-[#E8E8E8]" onMouseDown={e => { e.preventDefault(); setSelectedTags(prev => [...prev, tagInput.trim()]); setTagInput(''); setShowTagSuggestions(false); }}>
                      + הוסף &quot;{tagInput.trim()}&quot;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleCreateLink}
            disabled={savingLink || !selectedSlug || !linkUrl || !linkTitle}
            className="bg-purple-600 hover:bg-purple-700 text-white w-full py-3"
          >
            {savingLink ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                שמור קישור
              </span>
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
              יצירת קמפיין מהיר
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="flex items-center gap-1">שם הקמפיין * <InfoTooltip text="שם תיאורי בעברית, למשל: קמפיין חזרה ללימודים 2025." /></Label>
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
                  קמפיין רוחבי (חוצה סלאגים)
                </span>
              </label>
              {!newInitIsCross && !selectedSlug && (
                <p className="text-xs text-ono-orange mt-1">יש לבחור סלאג בטופס ההעלאה קודם, או לסמן קמפיין רוחבי.</p>
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
              {savingInitiative ? 'יוצר...' : 'צור קמפיין'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
