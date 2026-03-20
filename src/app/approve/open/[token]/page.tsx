'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle2, AlertCircle, Clock, MessageSquare,
  ChevronLeft, ChevronRight, Users, ZoomIn, X, Download,
  Loader2
} from 'lucide-react';

interface OpenReviewData {
  round: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    current_round_number: number;
    creator_name: string;
    created_at: string;
    approval_round_assets: {
      id: string;
      asset_id: string;
      round_number: number;
      assets: {
        id: string;
        original_filename: string;
        stored_filename: string | null;
        file_type: string;
        mime_type: string | null;
        file_size_label: string | null;
        width_px: number | null;
        height_px: number | null;
        dimensions_label: string | null;
        drive_view_url: string | null;
      } | null;
    }[];
    approval_reviewers: {
      id: string;
      email: string;
      display_name: string | null;
      status: string;
      responded_at: string | null;
    }[];
    approval_comments: {
      id: string;
      author_name: string;
      content: string;
      round_number: number;
      created_at: string;
    }[];
  };
  is_open: boolean;
}

function ReviewerBadge({ reviewer }: { reviewer: OpenReviewData['round']['approval_reviewers'][0] }) {
  const config: Record<string, { bg: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
    approved: { bg: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    changes_requested: { bg: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = config[reviewer.status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg}`}>
      {c.icon}
      {reviewer.display_name || reviewer.email.split('@')[0]}
    </span>
  );
}

function AssetViewer({ assets, supabaseUrl }: {
  assets: OpenReviewData['round']['approval_round_assets'];
  supabaseUrl: string;
}) {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const validAssets = assets.filter(a => a.assets);
  if (!validAssets.length) return <div className="text-center py-12 text-gray-400">No assets</div>;

  const asset = validAssets[current]?.assets;
  if (!asset) return null;

  const isImage = asset.file_type === 'image';
  const isVideo = asset.file_type === 'video';
  const isPdf = asset.file_type === 'pdf';
  const fileUrl = asset.stored_filename
    ? `${supabaseUrl}/storage/v1/object/public/assets/${asset.stored_filename}`
    : asset.drive_view_url || '';

  return (
    <>
      <div className="relative bg-gray-100 rounded-xl overflow-hidden">
        <div className="relative aspect-square md:aspect-video flex items-center justify-center bg-[#F5F5F5]">
          {isImage && fileUrl && (
            <Image
              src={fileUrl}
              alt={asset.original_filename}
              fill
              className="object-contain cursor-zoom-in"
              onClick={() => setFullscreen(true)}
              unoptimized
            />
          )}
          {isVideo && fileUrl && (
            <video src={fileUrl} controls className="w-full h-full object-contain" playsInline />
          )}
          {isPdf && fileUrl && (
            <iframe src={fileUrl} className="w-full h-full" title={asset.original_filename} />
          )}
          {!isImage && !isVideo && !isPdf && (
            <div className="text-center p-8">
              <Download className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{asset.original_filename}</p>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-ono-green hover:underline">
                  הורד / Download
                </a>
              )}
            </div>
          )}
          {isImage && (
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-3 left-3 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </div>
        {validAssets.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(prev => (prev - 1 + validAssets.length) % validAssets.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent(prev => (prev + 1) % validAssets.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
        {validAssets.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {validAssets.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-ono-green' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-gray-700">{asset.stored_filename || asset.original_filename}</p>
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 mt-0.5">
          {asset.dimensions_label && <span>{asset.dimensions_label}</span>}
          {asset.file_size_label && <span>{asset.file_size_label}</span>}
          <span>{current + 1}/{validAssets.length}</span>
        </div>
      </div>
      {fullscreen && isImage && fileUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button className="absolute top-4 left-4 p-2 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <Image src={fileUrl} alt={asset.original_filename} fill className="object-contain" unoptimized />
        </div>
      )}
    </>
  );
}

export default function OpenApprovalReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<OpenReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/approvals/review/open/${token}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'קישור לא תקין' : 'שגיאה בטעינה');
        return;
      }
      const json = await res.json();
      setData(json);

      // Restore name/email from localStorage
      const storedName = localStorage.getItem(`open-review-name-${token}`);
      const storedEmail = localStorage.getItem(`open-review-email-${token}`);
      if (storedName) setDisplayName(storedName);
      if (storedEmail) setEmail(storedEmail);
    } catch {
      setError('שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (action: 'approved' | 'changes_requested') => {
    if (!displayName.trim()) return;
    setSubmitting(true);
    try {
      localStorage.setItem(`open-review-name-${token}`, displayName);
      if (email) localStorage.setItem(`open-review-email-${token}`, email);

      const res = await fetch(`/api/approvals/review/open/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
          display_name: displayName.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (res.ok) {
        setComment('');
        setSubmitted(true);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="w-8 h-8 text-ono-green animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700">{error || 'Error'}</p>
          <p className="text-sm text-gray-400 mt-1">Invalid or expired approval link</p>
        </div>
      </div>
    );
  }

  const { round } = data;
  const comments = round.approval_comments || [];
  const reviewers = round.approval_reviewers || [];

  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-800 truncate">{round.title}</h1>
              <p className="text-xs text-gray-500">
                {round.creator_name} · סבב {round.current_round_number}
                <span className="mr-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-medium">קישור פתוח</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 pb-32 md:pb-8">
        <div className="md:flex md:gap-6">
          {/* Assets */}
          <div className="md:flex-1">
            {round.description && (
              <p className="text-sm text-gray-600 mb-4 bg-white p-3 rounded-lg border border-[#E8E8E8]">
                {round.description}
              </p>
            )}
            <AssetViewer assets={round.approval_round_assets} supabaseUrl={supabaseUrl} />
          </div>

          {/* Sidebar */}
          <div className="md:w-80 md:shrink-0 mt-6 md:mt-0 space-y-4">
            {/* Reviewers */}
            {reviewers.length > 0 && (
              <div className="bg-white rounded-xl border border-[#E8E8E8] p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> מאשרים ({reviewers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {reviewers.map(r => (
                    <ReviewerBadge key={r.id} reviewer={r} />
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white rounded-xl border border-[#E8E8E8] p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> הערות ({comments.length})
              </h3>
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">אין הערות עדיין</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {comments
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map(c => (
                    <div key={c.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-700 text-xs">{c.author_name}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('he-IL')} {new Date(c.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed bg-[#F9F9F9] rounded-lg px-3 py-2">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E8E8] p-4 z-30 safe-bottom md:relative md:max-w-4xl md:mx-auto md:mt-4 md:rounded-xl md:border md:shadow-lg">
        {submitted ? (
          <div className="text-center py-2">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-green-700">תודה! התגובה נקלטה</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-xs text-ono-green hover:underline"
            >
              שנה תגובה
            </button>
          </div>
        ) : (
          <>
            {/* Name and email */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="השם שלך *"
                className="flex-1 border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
              />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="אימייל (אופציונלי)"
                className="flex-1 border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
              />
            </div>

            {/* Comment */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="הוסף הערה..."
                className="flex-1 border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit('changes_requested')}
                disabled={submitting || !displayName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-all disabled:opacity-50"
              >
                <AlertCircle className="w-5 h-5" />
                יש לי הערות
              </button>
              <button
                onClick={() => handleSubmit('approved')}
                disabled={submitting || !displayName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                מאושר
              </button>
            </div>

            {!displayName.trim() && (
              <p className="text-xs text-red-400 text-center mt-2">נא להזין שם לפני שליחת תגובה</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
