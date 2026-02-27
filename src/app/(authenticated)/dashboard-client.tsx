'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { Asset, Initiative } from '@/lib/types';

interface DashboardClientProps {
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

export function DashboardClient({
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
}: DashboardClientProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>('all');

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

  return (
    <div className="space-y-6">
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

      {/* Stats cards - 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
          <FolderOpen className="w-5 h-5 text-ono-green mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{totalAssets}</p>
          <p className="text-[10px] text-ono-gray">סה&quot;כ חומרים</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
          <Megaphone className="w-5 h-5 text-ono-orange mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{activeInitiatives}</p>
          <p className="text-[10px] text-ono-gray">קמפיינים פעילים</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{uploadsThisWeek}</p>
          <p className="text-[10px] text-ono-gray">העלאות השבוע</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
          <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{uploadsThisMonth}</p>
          <p className="text-[10px] text-ono-gray">העלאות החודש</p>
        </div>
        <Link href="/assets?unclassified=true" className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center hover:border-ono-orange transition-colors">
          <AlertCircle className="w-5 h-5 text-ono-orange mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{unclassifiedCount}</p>
          <p className="text-[10px] text-ono-gray">ממתינים לסיווג</p>
        </Link>
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 text-center">
          <BarChart3 className="w-5 h-5 text-ono-green mx-auto mb-1" />
          <p className="text-2xl font-bold text-ono-gray-dark">{slugs.length}</p>
          <p className="text-[10px] text-ono-gray">סלאגים פעילים</p>
        </div>
      </div>

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
                <div
                  key={asset.id}
                  className="border border-[#E8E8E8] rounded-lg p-3 hover:border-ono-green transition-colors"
                >
                  <div className="aspect-square bg-ono-gray-light rounded-md flex items-center justify-center mb-2">
                    <FileTypeIcon type={asset.file_type} />
                  </div>
                  <p className="text-xs text-ono-gray-dark font-medium truncate">
                    {asset.original_filename}
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
                </div>
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
    </div>
  );
}
