'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle, AlertCircle, FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeFileSizeLabel } from '@/lib/aspect-ratio';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface TokenInfo {
  valid: boolean;
  workspace_id: string;
  slug_id: string;
  initiative_id: string | null;
  workspace_name: string;
  slug_name: string;
  initiative_name: string | null;
  error?: string;
}

interface FileEntry {
  file: File;
  name: string;
  size: number;
  type: string;
  error?: string;
}

export default function ExternalUploadPage() {
  const params = useParams();
  const token = params.token as string;

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ uploaded: number; errors: number; errorDetails?: string[] } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [noExpiry, setNoExpiry] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    fetch(`/api/upload-tokens/${token}/validate`)
      .then((r) => r.json())
      .then((data) => {
        setTokenInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setTokenInfo({ valid: false, error: 'שגיאה בבדיקת הטוקן' } as TokenInfo);
        setLoading(false);
      });
  }, [token]);

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
    if (!tokenInfo || files.length === 0) return;
    setUploading(true);

    const progress: Record<number, 'pending' | 'uploading' | 'done' | 'error'> = {};
    files.forEach((_, i) => { progress[i] = 'pending'; });

    const validFiles = files.filter(f => !f.error);
    const zipFiles = validFiles.filter(f => f.type.includes('zip') || f.name.toLowerCase().endsWith('.zip'));
    const directFiles = validFiles.filter(f => !f.type.includes('zip') && !f.name.toLowerCase().endsWith('.zip'));

    // Mark oversized as error
    files.forEach((f, i) => { if (f.error) progress[i] = 'error'; });
    setUploadProgress({ ...progress });

    let totalUploaded = 0;
    let totalErrors = files.filter(f => f.error).length;
    const errorDetails: string[] = files.filter(f => f.error).map(f => `${f.name}: ${f.error}`);

    // Phase A: ZIPs through existing route
    if (zipFiles.length > 0) {
      const zipIndices = files.map((f, i) => zipFiles.includes(f) ? i : -1).filter(i => i >= 0);
      zipIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      const formData = new FormData();
      zipFiles.forEach(f => formData.append('files', f.file));
      formData.append('workspace_id', tokenInfo.workspace_id);
      formData.append('slug_id', tokenInfo.slug_id);
      if (tokenInfo.initiative_id) formData.append('initiative_id', tokenInfo.initiative_id);
      if (expiresAt) formData.append('expires_at', new Date(expiresAt).toISOString());

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const result = await res.json();
          totalUploaded += result.uploaded?.length || 0;
          if (result.errors?.length) {
            totalErrors += result.errors.length;
            errorDetails.push(...result.errors.map((e: { file: string; error: string }) => `${e.file}: ${e.error}`));
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

    // Phase B: Direct upload for non-ZIP files
    if (directFiles.length > 0) {
      const directIndices = files.map((f, i) => directFiles.includes(f) ? i : -1).filter(i => i >= 0);
      directIndices.forEach(i => { progress[i] = 'uploading'; });
      setUploadProgress({ ...progress });

      try {
        const prepareRes = await fetch('/api/upload/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: directFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
            slug_id: tokenInfo.slug_id,
            workspace_id: tokenInfo.workspace_id,
            initiative_id: tokenInfo.initiative_id || undefined,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          }),
        });

        if (!prepareRes.ok) {
          directIndices.forEach(i => { progress[i] = 'error'; });
          totalErrors += directFiles.length;
        } else {
          const prepareData = await prepareRes.json();

          if (prepareData.errors?.length) {
            totalErrors += prepareData.errors.length;
            errorDetails.push(...prepareData.errors.map((e: { file: string; error: string }) => `${e.file}: ${e.error}`));
            for (const err of prepareData.errors) {
              const idx = files.findIndex(f => f.name === err.file);
              if (idx >= 0) progress[idx] = 'error';
            }
          }

          const successfulUploads: typeof prepareData.files = [];
          for (const prepared of prepareData.files || []) {
            const fileEntry = directFiles.find(f => f.name === prepared.originalName);
            const fileIdx = files.findIndex(f => f.name === prepared.originalName);
            if (!fileEntry || fileIdx < 0) continue;

            try {
              const uploadRes = await fetch(prepared.signedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': fileEntry.type || 'application/octet-stream' },
                body: fileEntry.file,
              });

              if (uploadRes.ok) {
                progress[fileIdx] = 'done';
                successfulUploads.push(prepared);
              } else {
                progress[fileIdx] = 'error';
                totalErrors++;
                errorDetails.push(`${prepared.originalName}: שגיאה בהעלאה (${uploadRes.status})`);
              }
            } catch {
              progress[fileIdx] = 'error';
              totalErrors++;
              errorDetails.push(`${prepared.originalName}: שגיאת רשת`);
            }
            setUploadProgress({ ...progress });
          }

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
                  slug_id: tokenInfo.slug_id,
                  workspace_id: tokenInfo.workspace_id,
                  initiative_id: tokenInfo.initiative_id || undefined,
                  expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                }),
              });

              if (completeRes.ok) {
                const completeData = await completeRes.json();
                totalUploaded += completeData.uploaded?.length || 0;
                if (completeData.errors?.length) {
                  totalErrors += completeData.errors.length;
                  errorDetails.push(...completeData.errors.map((e: { file: string; error: string }) => `${e.file}: ${e.error}`));
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
          }
        }
      } catch {
        directIndices.forEach(i => { progress[i] = 'error'; });
        totalErrors += directFiles.length;
      }
      setUploadProgress({ ...progress });
    }

    setUploadResult({ uploaded: totalUploaded, errors: totalErrors, errorDetails: errorDetails.length > 0 ? errorDetails : undefined });
    setUploadDone(true);
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <p className="text-ono-gray">טוען...</p>
      </div>
    );
  }

  if (!tokenInfo?.valid) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-ono-orange mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ono-gray-dark mb-2">קישור לא חוקי</h1>
          <p className="text-ono-gray">{tokenInfo?.error || 'הקישור אינו תקף או שפג תוקפו'}</p>
        </div>
      </div>
    );
  }

  if (uploadDone) {
    return (
      <div className="min-h-screen bg-ono-gray-light flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 max-w-md text-center">
          <CheckCircle className="w-12 h-12 text-ono-green mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ono-gray-dark mb-2">ההעלאה הושלמה!</h1>
          <p className="text-ono-gray mb-4">
            {uploadResult?.uploaded} קבצים הועלו בהצלחה
            {uploadResult?.errors ? ` · ${uploadResult.errors} נכשלו` : ''}
          </p>
          {uploadResult?.errorDetails && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-right">
              <p className="text-sm font-medium text-red-700 mb-1">קבצים שנכשלו:</p>
              {uploadResult.errorDetails.map((detail, i) => (
                <p key={i} className="text-xs text-red-600">{detail}</p>
              ))}
            </div>
          )}
          <Button
            onClick={() => {
              setFiles([]);
              setUploadDone(false);
              setUploadResult(null);
              setUploadProgress({});
            }}
            className="bg-ono-green hover:bg-ono-green-dark text-white"
          >
            העלה קבצים נוספים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ono-gray-light" dir="rtl">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-ono-green rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">AH</span>
          </div>
          <h1 className="text-2xl font-bold text-ono-gray-dark">העלאה חיצונית</h1>
          <p className="text-sm text-ono-gray mt-2">
            {tokenInfo.workspace_name} · {tokenInfo.slug_name}
            {tokenInfo.initiative_name && ` · ${tokenInfo.initiative_name}`}
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('ext-file-input')?.click()}
          className="bg-white border-2 border-dashed border-ono-green/40 rounded-lg p-12 text-center hover:border-ono-green hover:bg-ono-green-light/30 transition-colors cursor-pointer mb-6"
        >
          <FileUp className="w-16 h-16 text-ono-green mx-auto mb-4" />
          <p className="text-ono-gray-dark font-medium mb-1">
            גררו קבצים לכאן או לחצו לבחירה
          </p>
          <p className="text-sm text-ono-gray">
            תמונות, וידאו, PDF, ZIP — עד 50MB לקובץ
          </p>
          <input
            id="ext-file-input"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif,.heic,.heif,.avif,.mp4,.mov,.webm,.avi,.mpeg,.mpg,.mkv,.3gp,.pdf,.zip"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] mb-6">
            <div className="p-4 border-b border-[#E8E8E8] flex items-center justify-between">
              <p className="font-medium text-ono-gray-dark">{files.length} קבצים נבחרו</p>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-ono-gray text-xs">נקה הכל</Button>
            </div>
            <div className="divide-y divide-[#E8E8E8] max-h-60 overflow-auto">
              {files.map((f, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${f.error ? 'bg-red-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-ono-gray-dark truncate block">{f.name}</span>
                    <span className="text-ono-gray text-xs">{computeFileSizeLabel(f.size)}</span>
                    {f.error && <p className="text-xs text-red-600 mt-0.5">{f.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {uploadProgress[i] === 'done' && <CheckCircle className="w-4 h-4 text-ono-green" />}
                    {uploadProgress[i] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {uploadProgress[i] === 'uploading' && <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" />}
                    {!uploading && (
                      <button onClick={() => removeFile(i)} className="text-ono-gray hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content expiry */}
        {files.length > 0 && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] mb-6 p-4 space-y-2">
            <label className="text-sm font-medium text-ono-gray-dark">תוקף תוכן</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noExpiry}
                onChange={(e) => { setNoExpiry(e.target.checked); if (e.target.checked) setExpiresAt(''); }}
                className="h-4 w-4"
              />
              <span className="text-sm text-ono-gray">ללא הגבלת תוקף</span>
            </div>
            {!noExpiry && (
              <input
                type="date"
                className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm"
                dir="ltr"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploading || files.every(f => !!f.error)}
            className="w-full bg-ono-green hover:bg-ono-green-dark text-white py-3 text-base"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                מעלה...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                העלה {files.filter(f => !f.error).length} קבצים
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
