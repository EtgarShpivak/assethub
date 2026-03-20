'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Megaphone,
  AlertCircle,
  Image as ImageIcon,
  Film,
  FileText,
  Globe,
  Upload,
  TrendingUp,
  Calendar,
  BarChart3,
  GraduationCap,
  Download,
  Tag as TagIcon,
  Eye,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { Asset, Initiative } from '@/lib/types';

interface AnalyticsData {
  topDownloadedAssets: { id: string; name: string; count: number }[];
  neverDownloadedCount: number;
  usageBySlugs: { slug_name: string; count: number }[];
  usageByInitiative: { initiative_name: string; count: number }[];
  uploadTrends: { date: string; count: number }[];
  fileTypeBreakdown: { type: string; count: number }[];
  platformBreakdown: { platform: string; count: number }[];
}

interface DashboardClientProps {
  userName?: string;
  totalAssets: number;
  activeInitiatives: number;
  unclassifiedCount: number;
  recentAssets: Asset[];
  initiatives: (Initiative & { slugs?: { display_name: string; slug: string } })[];
  slugs: { id: string; slug: string; display_name: string }[];
  uploadsThisWeek: number;
  uploadsThisMonth: number;
  imageCount: number;
  videoCount: number;
  pdfCount: number;
  expiringSoonCount: number;
}

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      return <ImageIcon className="w-8 h-8 text-ono-green" />;
    case 'video':
      return <Film className="w-8 h-8 text-platform-meta" />;
    case 'pdf':
      return <FileText className="w-8 h-8 text-platform-google" />;
    default:
      return <FolderOpen className="w-8 h-8 text-ono-gray" />;
  }
}

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: 'פעיל', className: 'bg-ono-green-light text-ono-green-dark' },
  ongoing: { label: 'מתמשך', className: 'bg-blue-50 text-blue-700' },
  ended: { label: 'הסתיים', className: 'bg-ono-gray-light text-ono-gray' },
  archived: { label: 'בארכיון', className: 'bg-ono-gray-light text-ono-gray' },
};

// Mini sparkline-style bar chart
function MiniBarChart({ data, color = 'bg-ono-green' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className={`${color} rounded-t-sm flex-1 min-w-[3px] transition-all`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn',
  twitter: 'Twitter/X', organic: 'אורגני', taboola: 'Taboola', outbrain: 'Outbrain',
};

const FILE_TYPE_LABELS: Record<string, string> = {
  image: 'תמונות', video: 'וידאו', pdf: 'PDF', newsletter: 'ידיעון', other: 'אחר',
};

function PendingApprovalsWidget() {
  const [pendingCount, setPendingCount] = useState(0);
  const [myPendingCount, setMyPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/approvals?status=pending').then(r => r.ok ? r.json() : { rounds: [] }),
      fetch('/api/approvals/pending').then(r => r.ok ? r.json() : { rounds: [] }),
    ]).then(([created, pending]) => {
      setPendingCount(created.rounds?.length || 0);
      setMyPendingCount(pending.rounds?.length || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading || (pendingCount === 0 && myPendingCount === 0)) return null;

  return (
    <div className="bg-gradient-to-l from-amber-50 to-white border border-amber-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-ono-gray-dark">אישורים ממתינים</p>
          <p className="text-xs text-ono-gray">
            {myPendingCount > 0 && `${myPendingCount} ממתינים לאישורך`}
            {myPendingCount > 0 && pendingCount > 0 && ' · '}
            {pendingCount > 0 && `${pendingCount} סבבים שיצרת ממתינים`}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {myPendingCount > 0 && (
          <Link href="/approvals/pending" className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
            אשר עכשיו
          </Link>
        )}
        <Link href="/approvals" className="px-3 py-1.5 bg-white text-amber-700 text-xs font-medium rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors">
          צפה בהכל
        </Link>
      </div>
    </div>
  );
}

export function DashboardClient({
  userName,
  totalAssets,
  activeInitiatives,
  unclassifiedCount,
  recentAssets,
  initiatives,
  slugs,
  uploadsThisWeek,
  uploadsThisMonth,
  imageCount,
  videoCount,
  pdfCount,
  expiringSoonCount,
}: DashboardClientProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [recentDownloads, setRecentDownloads] = useState<{ entity_name: string; entity_id: string; created_at: string }[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch { /* ignore */ }
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Fetch my recent downloads
  useEffect(() => {
    fetch('/api/activity?tab=all&action=download&limit=8&my_only=true')
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(data => setRecentDownloads(data.entries || []))
      .catch(() => {});
  }, []);

  // Filter assets and initiatives by selected slug
  const filteredAssets = selectedSlug === 'all'
    ? recentAssets
    : selectedSlug === 'cross'
      ? recentAssets.filter(a => !a.slug_id)
      : recentAssets.filter(a => a.slug_id === selectedSlug);

  const filteredInitiatives = selectedSlug === 'all'
    ? initiatives
    : selectedSlug === 'cross'
      ? initiatives.filter(i => !i.slug_id)
      : initiatives.filter(i => i.slug_id === selectedSlug);

  const otherCount = totalAssets - imageCount - videoCount - pdfCount;

  // Mobile recent assets (unfiltered, first 4)
  const mobileRecentAssets = recentAssets.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Mobile Dashboard */}
      <div className="md:hidden space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-ono-gray-dark dark:text-gray-100">
            {userName ? `שלום, ${userName}` : 'שלום'}
          </h1>
          <p className="text-sm text-ono-gray dark:text-gray-400 mt-1">סקירה מהירה של המערכת</p>
        </div>

        {/* 4 stat cards in 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/assets" className="border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center bg-white dark:bg-gray-800 dark:border-gray-700">
            <FolderOpen className="w-5 h-5 text-ono-green mx-auto mb-1" />
            <p className="text-2xl font-bold text-ono-gray-dark dark:text-gray-100">{totalAssets}</p>
            <p className="text-[10px] text-ono-gray dark:text-gray-400">סה&quot;כ חומרים</p>
          </Link>
          <Link href="/initiatives" className="border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center bg-white dark:bg-gray-800 dark:border-gray-700">
            <Megaphone className="w-5 h-5 text-ono-orange mx-auto mb-1" />
            <p className="text-2xl font-bold text-ono-gray-dark dark:text-gray-100">{activeInitiatives}</p>
            <p className="text-[10px] text-ono-gray dark:text-gray-400">קמפיינים פעילים</p>
          </Link>
          <Link href="/approvals" className="border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center bg-white dark:bg-gray-800 dark:border-gray-700">
            <ClipboardCheck className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-ono-gray-dark dark:text-gray-100">{unclassifiedCount}</p>
            <p className="text-[10px] text-ono-gray dark:text-gray-400">ממתינים לסיווג</p>
          </Link>
          <Link href="/assets?expiry=expiring_7days" className={`border rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center bg-white dark:bg-gray-800 dark:border-gray-700 ${expiringSoonCount > 0 ? 'border-red-200' : 'border-[#E8E8E8]'}`}>
            <Clock className={`w-5 h-5 mx-auto mb-1 ${expiringSoonCount > 0 ? 'text-red-500' : 'text-ono-gray'}`} />
            <p className={`text-2xl font-bold ${expiringSoonCount > 0 ? 'text-red-600' : 'text-ono-gray-dark dark:text-gray-100'}`}>{expiringSoonCount}</p>
            <p className="text-[10px] text-ono-gray dark:text-gray-400">פוקעים בקרוב</p>
          </Link>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/upload"
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-b from-ono-green to-ono-green-dark rounded-lg text-white"
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs font-bold">העלאה</span>
          </Link>
          <Link
            href="/assets"
            className="flex flex-col items-center gap-2 p-4 border border-[#E8E8E8] rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <FolderOpen className="w-6 h-6 text-ono-gray-dark dark:text-gray-100" />
            <span className="text-xs font-bold text-ono-gray-dark dark:text-gray-100">ספרייה</span>
          </Link>
          <Link
            href="/approvals"
            className="flex flex-col items-center gap-2 p-4 border border-[#E8E8E8] rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <ClipboardCheck className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-bold text-ono-gray-dark dark:text-gray-100">אישורים</span>
          </Link>
        </div>

        {/* Recent uploads - 2x2 grid */}
        {mobileRecentAssets.length > 0 && (
          <div className="border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ono-gray-dark dark:text-gray-100">העלאות אחרונות</h2>
              <Link href="/assets" className="text-xs text-ono-green hover:text-ono-green-dark">
                הצג הכל
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mobileRecentAssets.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets?id=${asset.id}`}
                  className="border border-[#E8E8E8] rounded-lg p-2 hover:border-ono-green transition-colors block dark:border-gray-700"
                >
                  <div className="aspect-square bg-ono-gray-light dark:bg-gray-700 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                    {asset.drive_view_url && asset.file_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.drive_view_url} alt={asset.original_filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileTypeIcon type={asset.file_type} />
                    )}
                  </div>
                  <p className="text-xs text-ono-gray-dark dark:text-gray-100 font-medium truncate">
                    {asset.stored_filename || asset.original_filename}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden md:block space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ono-gray-dark">דשבורד</h1>
        <InfoTooltip text="סקירה כללית של המערכת: חומרים, קמפיינים פעילים, העלאות אחרונות וחומרים שממתינים לסיווג." size="md" />
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/upload"
          className="flex items-center gap-4 p-6 bg-gradient-to-l from-ono-green to-ono-green-dark rounded-xl text-white hover:shadow-lg transition-shadow"
        >
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <p className="text-lg font-bold">העלאת חומרים</p>
            <p className="text-sm text-white/80">העלו תמונות, וידאו ומסמכים</p>
          </div>
        </Link>
        <Link
          href="/assets"
          className="flex items-center gap-4 p-6 bg-gradient-to-l from-[#4A4A4A] to-ono-gray-dark rounded-xl text-white hover:shadow-lg transition-shadow"
        >
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-lg font-bold">ספריית חומרים</p>
            <p className="text-sm text-white/80">{totalAssets} חומרים בספרייה</p>
          </div>
        </Link>
      </div>

      {/* Asset Expiry Warnings */}
      {expiringSoonCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">⚠️ {expiringSoonCount} חומרים פוקעים בקרוב!</p>
              <p className="text-xs text-red-500">חומרים שתוקפם פג תוך 7 ימים. בדקו ועדכנו תאריכי תפוגה.</p>
            </div>
          </div>
          <Link href="/assets?expiry=expiring_7days" className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shrink-0">
            צפה בחומרים
          </Link>
        </div>
      )}

      {/* Stats cards - 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/assets" className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-ono-green transition-colors">
          <FolderOpen className="w-5 h-5 text-ono-green mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{totalAssets}</p>
          <p className="text-[10px] text-ono-gray">סה&quot;כ חומרים</p>
        </Link>
        <Link href="/initiatives" className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-ono-orange transition-colors">
          <Megaphone className="w-5 h-5 text-ono-orange mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{activeInitiatives}</p>
          <p className="text-[10px] text-ono-gray">קמפיינים פעילים</p>
        </Link>
        <Link href={`/assets?date_from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`} className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-blue-400 transition-colors">
          <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{uploadsThisWeek}</p>
          <p className="text-[10px] text-ono-gray">העלאות השבוע</p>
        </Link>
        <Link href={`/assets?date_from=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&date_to=${new Date().toISOString().split('T')[0]}`} className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-purple-400 transition-colors">
          <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{uploadsThisMonth}</p>
          <p className="text-[10px] text-ono-gray">העלאות החודש</p>
        </Link>
        <Link href="/assets?unclassified=true" className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-ono-orange transition-colors">
          <AlertCircle className="w-5 h-5 text-ono-orange mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{unclassifiedCount}</p>
          <p className="text-[10px] text-ono-gray">ממתינים לסיווג</p>
        </Link>
        <Link href="/assets?expiry=expiring_7days" className={`bg-white border rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-red-400 transition-colors ${expiringSoonCount > 0 ? 'border-red-200' : 'border-[#E8E8E8]'}`}>
          <Clock className={`w-5 h-5 mx-auto mb-1 ${expiringSoonCount > 0 ? 'text-red-500' : 'text-ono-gray'}`} />
          <p className={`text-2xl font-bold ${expiringSoonCount > 0 ? 'text-red-600' : 'text-ono-gray-dark'}`}>{expiringSoonCount}</p>
          <p className="text-[10px] text-ono-gray">פוקעים ב-7 ימים</p>
        </Link>
      </div>

      {/* Pending Approvals Widget */}
      <PendingApprovalsWidget />

      {/* Content type breakdown */}
      {totalAssets > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <h2 className="text-sm font-bold text-ono-gray-dark mb-3">חלוקת חומרים לפי סוג</h2>
          <div className="flex gap-3 items-center">
            <div className="flex-1 h-4 bg-ono-gray-light rounded-full overflow-hidden flex">
              {imageCount > 0 && (
                <div className="bg-ono-green h-full transition-all" style={{ width: `${(imageCount / totalAssets) * 100}%` }} title={`תמונות: ${imageCount}`} />
              )}
              {videoCount > 0 && (
                <div className="bg-platform-meta h-full transition-all" style={{ width: `${(videoCount / totalAssets) * 100}%` }} title={`וידאו: ${videoCount}`} />
              )}
              {pdfCount > 0 && (
                <div className="bg-platform-google h-full transition-all" style={{ width: `${(pdfCount / totalAssets) * 100}%` }} title={`PDF: ${pdfCount}`} />
              )}
              {otherCount > 0 && (
                <div className="bg-ono-gray h-full transition-all" style={{ width: `${(otherCount / totalAssets) * 100}%` }} title={`אחר: ${otherCount}`} />
              )}
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ono-green" /> תמונות ({imageCount})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-platform-meta" /> וידאו ({videoCount})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-platform-google" /> PDF ({pdfCount})</span>
            {otherCount > 0 && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ono-gray" /> אחר ({otherCount})</span>}
          </div>
        </div>
      )}

      {/* Faculty tabs */}
      {slugs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSlug('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSlug === 'all'
                ? 'bg-ono-green text-white'
                : 'bg-ono-gray-light text-ono-gray-dark hover:bg-ono-gray-light/80'
            }`}
          >
            הכל
          </button>
          {slugs.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSlug(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedSlug === s.id
                  ? 'bg-ono-green text-white'
                  : 'bg-ono-gray-light text-ono-gray-dark hover:bg-ono-gray-light/80'
              }`}
            >
              {s.display_name}
            </button>
          ))}
          <button
            onClick={() => setSelectedSlug('cross')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              selectedSlug === 'cross'
                ? 'bg-ono-orange text-white'
                : 'bg-ono-gray-light text-ono-gray-dark hover:bg-ono-gray-light/80'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            כללי
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent uploads */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ono-gray-dark">העלאות אחרונות</h2>
            <Link href="/assets" className="text-sm text-ono-green hover:text-ono-green-dark">
              הצג הכל
            </Link>
          </div>
          {filteredAssets.length === 0 ? (
            <p className="text-ono-gray text-sm text-center py-8">אין העלאות אחרונות</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredAssets.slice(0, 9).map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets?id=${asset.id}`}
                  className="border border-[#E8E8E8] rounded-lg p-3 hover:border-ono-green transition-colors block"
                >
                  <div className="aspect-square bg-ono-gray-light rounded-md flex items-center justify-center mb-2 overflow-hidden">
                    {asset.drive_view_url && asset.file_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.drive_view_url} alt={asset.original_filename} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <FileTypeIcon type={asset.file_type} />
                    )}
                  </div>
                  <p className="text-xs text-ono-gray-dark font-medium truncate">
                    {asset.stored_filename || asset.original_filename}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {asset.dimensions_label && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {asset.dimensions_label}
                      </Badge>
                    )}
                    {asset.file_size_label && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {asset.file_size_label}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active initiatives */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ono-gray-dark">קמפיינים פעילים</h2>
            <Link href="/initiatives" className="text-sm text-ono-green hover:text-ono-green-dark">
              הצג הכל
            </Link>
          </div>
          {filteredInitiatives.length === 0 ? (
            <p className="text-ono-gray text-sm text-center py-8">אין קמפיינים פעילים</p>
          ) : (
            <div className="space-y-3">
              {filteredInitiatives.map((initiative) => {
                const status = statusLabels[initiative.status] || statusLabels.active;
                return (
                  <Link
                    key={initiative.id}
                    href={`/initiatives/${initiative.id}`}
                    className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg hover:border-ono-green transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-ono-gray-dark">{initiative.name}</p>
                      <p className="text-xs text-ono-gray">
                        {initiative.slug_id ? initiative.slugs?.display_name : (
                          <span className="flex items-center gap-1 text-ono-orange">
                            <Globe className="w-3 h-3" />
                            רוחבי
                          </span>
                        )}
                        {initiative.slugs?.display_name && ' · '}{initiative.short_code}
                      </p>
                    </div>
                    <Badge className={`${status.className} text-xs`}>
                      {status.label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* My Recent Downloads */}
      {recentDownloads.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ono-gray-dark flex items-center gap-2">
              <Download className="w-5 h-5 text-ono-green" />
              ההורדות האחרונות שלי
            </h2>
            <Link href="/activity" className="text-sm text-ono-green hover:text-ono-green-dark">
              יומן מלא
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentDownloads.map((dl, i) => (
              <Link
                key={i}
                href={dl.entity_id ? `/assets?id=${dl.entity_id}` : '#'}
                className="border border-[#E8E8E8] rounded-lg p-3 hover:border-ono-green transition-colors block"
              >
                <p className="text-xs text-ono-gray-dark font-medium truncate">{dl.entity_name || 'קובץ'}</p>
                <p className="text-[10px] text-ono-gray mt-1">
                  {new Date(dl.created_at).toLocaleDateString('he-IL')} {new Date(dl.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* User Guide Banner */}
      <Link
        href="/guide"
        className="flex items-center gap-4 p-5 bg-gradient-to-l from-ono-green to-ono-green-dark rounded-xl text-white hover:shadow-lg transition-shadow"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold">מדריך היכרות למשתמש</p>
          <p className="text-sm text-white/80">חדשים במערכת? 5 דקות קריאה ואתם מוכנים לעבוד</p>
        </div>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">קראו עכשיו →</span>
      </Link>

      {/* Usage Analytics Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-ono-green" />
          <h2 className="text-lg font-bold text-ono-gray-dark">אנליטיקות שימוש</h2>
          <InfoTooltip text="נתונים על השימוש במערכת: הורדות, חיפושים, ומגמות העלאה." />
        </div>

        {analyticsLoading ? (
          <div className="text-center py-8 text-ono-gray">
            <div className="w-6 h-6 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-sm">טוען נתוני אנליטיקה...</span>
          </div>
        ) : analytics ? (
          <div className="space-y-4">
            {/* Upload Trends */}
            {analytics.uploadTrends && analytics.uploadTrends.length > 0 && (
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-ono-green" />
                    מגמת העלאות (30 ימים אחרונים)
                  </h3>
                  <span className="text-xs text-ono-gray">
                    סה&quot;כ: {analytics.uploadTrends.reduce((s, d) => s + d.count, 0)} העלאות
                  </span>
                </div>
                <MiniBarChart data={analytics.uploadTrends.map(d => d.count)} />
                <div className="flex justify-between mt-1 text-[10px] text-ono-gray">
                  <span>{analytics.uploadTrends.length > 0 ? new Date(analytics.uploadTrends[0].date).toLocaleDateString('he-IL') : ''}</span>
                  <span>{analytics.uploadTrends.length > 0 ? new Date(analytics.uploadTrends[analytics.uploadTrends.length - 1].date).toLocaleDateString('he-IL') : ''}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Downloaded Assets */}
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
                <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2 mb-3">
                  <Download className="w-4 h-4 text-ono-green" />
                  חומרים מורדים ביותר
                </h3>
                {analytics.topDownloadedAssets && analytics.topDownloadedAssets.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.topDownloadedAssets.slice(0, 5).map((item, i) => (
                      <div key={item.id || i} className="flex items-center justify-between text-sm">
                        <span className="text-ono-gray-dark truncate max-w-[200px]">{item.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{item.count} הורדות</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ono-gray text-center py-4">עדיין אין נתוני הורדות</p>
                )}
              </div>

              {/* Usage by Slug */}
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
                <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2 mb-3">
                  <TagIcon className="w-4 h-4 text-ono-green" />
                  חומרים לפי סלאג
                </h3>
                {analytics.usageBySlugs && analytics.usageBySlugs.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.usageBySlugs.map((item, i) => {
                      const maxCount = Math.max(...analytics.usageBySlugs.map(s => s.count), 1);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ono-gray-dark font-medium">{item.slug_name}</span>
                            <span className="text-ono-gray">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-ono-gray-light rounded-full overflow-hidden">
                            <div className="h-full bg-ono-green rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-ono-gray text-center py-4">אין נתונים</p>
                )}
              </div>

              {/* Usage by Initiative */}
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
                <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4 text-ono-green" />
                  חומרים לפי קמפיין
                </h3>
                {analytics.usageByInitiative && analytics.usageByInitiative.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.usageByInitiative.slice(0, 8).map((item, i) => {
                      const maxCount = Math.max(...analytics.usageByInitiative.map(s => s.count), 1);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ono-gray-dark font-medium">{item.initiative_name}</span>
                            <span className="text-ono-gray">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-ono-gray-light rounded-full overflow-hidden">
                            <div className="h-full bg-ono-orange rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-ono-gray text-center py-4">אין נתונים</p>
                )}
              </div>

              {/* Platform Breakdown */}
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
                <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-ono-green" />
                  חומרים לפי פלטפורמה
                </h3>
                {analytics.platformBreakdown && analytics.platformBreakdown.filter(p => p.count > 0).length > 0 ? (
                  <div className="space-y-2">
                    {analytics.platformBreakdown.filter(p => p.count > 0).map((item, i) => {
                      const maxCount = Math.max(...analytics.platformBreakdown.map(p => p.count), 1);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ono-gray-dark font-medium">{PLATFORM_LABELS[item.platform] || item.platform}</span>
                            <span className="text-ono-gray">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-ono-gray-light rounded-full overflow-hidden">
                            <div className="h-full bg-platform-meta rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-ono-gray text-center py-4">אין נתוני פלטפורמות</p>
                )}
              </div>
            </div>

            {/* Summary stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
                <Download className="w-4 h-4 text-ono-gray mx-auto mb-1" />
                <p className="text-xl font-bold text-ono-gray-dark">{analytics.neverDownloadedCount ?? 0}</p>
                <p className="text-[10px] text-ono-gray">חומרים שלא הורדו אף פעם</p>
              </div>
              {analytics.fileTypeBreakdown && analytics.fileTypeBreakdown.map((ft, i) => (
                <div key={i} className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
                  {ft.type === 'image' ? <ImageIcon className="w-4 h-4 text-ono-green mx-auto mb-1" /> :
                   ft.type === 'video' ? <Film className="w-4 h-4 text-platform-meta mx-auto mb-1" /> :
                   <FileText className="w-4 h-4 text-platform-google mx-auto mb-1" />}
                  <p className="text-xl font-bold text-ono-gray-dark">{ft.count}</p>
                  <p className="text-[10px] text-ono-gray">{FILE_TYPE_LABELS[ft.type] || ft.type}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-8 text-center">
            <BarChart3 className="w-8 h-8 text-ono-gray/40 mx-auto mb-2" />
            <p className="text-sm text-ono-gray">נתוני אנליטיקה לא זמינים כרגע</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
