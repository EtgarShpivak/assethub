'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeFileSizeLabel } from '@/lib/aspect-ratio';

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

export default function ExternalUploadPage() {
  const params = useParams();
  const token = params.token as string;

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ uploaded: number; errors: number } | null>(null);

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
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpload = async () => {
    if (!tokenInfo || files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('workspace_id', tokenInfo.workspace_id);
    formData.append('slug_id', tokenInfo.slug_id);
    if (tokenInfo.initiative_id) {
      formData.append('initiative_id', tokenInfo.initiative_id);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      setUploadResult({
        uploaded: result.uploaded?.length || 0,
        errors: result.errors?.length || 0,
      });
      setUploadDone(true);
    } catch {
      setUploadResult({ uploaded: 0, errors: files.length });
      setUploadDone(true);
    }

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
          <Button
            onClick={() => {
              setFiles([]);
              setUploadDone(false);
              setUploadResult(null);
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
            תמונות, וידאו, PDF, ZIP — עד 2GB לקובץ
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
            <div className="p-4 border-b border-[#E8E8E8]">
              <p className="font-medium text-ono-gray-dark">{files.length} קבצים נבחרו</p>
            </div>
            <div className="divide-y divide-[#E8E8E8] max-h-60 overflow-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-ono-gray-dark truncate">{f.name}</span>
                  <span className="text-ono-gray text-xs">{computeFileSizeLabel(f.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
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
                העלה {files.length} קבצים
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
