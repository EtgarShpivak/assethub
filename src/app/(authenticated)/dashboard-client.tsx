'use client';

import Link from 'next/link';
import {
  FolderOpen,
  Megaphone,
  Download,
  AlertCircle,
  Image as ImageIcon,
  Film,
  FileText,
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
}

const statCards = (totalAssets: number, activeInitiatives: number, unclassifiedCount: number) => [
  {
    label: 'סה"כ חומרים',
    value: totalAssets,
    icon: FolderOpen,
    color: 'text-ono-green',
    bgColor: 'bg-ono-green-light',
  },
  {
    label: 'מהלכים פעילים',
    value: activeInitiatives,
    icon: Megaphone,
    color: 'text-ono-orange',
    bgColor: 'bg-ono-orange-light',
  },
  {
    label: 'ייצואים השבוע',
    value: 0,
    icon: Download,
    color: 'text-platform-linkedin',
    bgColor: 'bg-blue-50',
  },
  {
    label: 'ממתינים לסיווג',
    value: unclassifiedCount,
    icon: AlertCircle,
    color: 'text-ono-orange',
    bgColor: 'bg-ono-orange-light',
    href: '/assets?unclassified=true',
  },
];

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
}: DashboardClientProps) {
  const cards = statCards(totalAssets, activeInitiatives, unclassifiedCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ono-gray-dark">דשבורד</h1>
        <InfoTooltip text="סקירה כללית של המערכת: חומרים, מהלכים פעילים, העלאות אחרונות וחומרים שממתינים לסיווג." size="md" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ono-gray mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-ono-gray-dark">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );

          if ('href' in card && card.href) {
            return (
              <Link key={card.label} href={card.href} className="block hover:opacity-90 transition-opacity">
                {content}
              </Link>
            );
          }
          return <div key={card.label}>{content}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent uploads */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ono-gray-dark">העלאות אחרונות</h2>
            <Link href="/assets" className="text-sm text-ono-green hover:text-ono-green-dark">
              הצג הכל
            </Link>
          </div>
          {recentAssets.length === 0 ? (
            <p className="text-ono-gray text-sm text-center py-8">אין העלאות אחרונות</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentAssets.map((asset) => (
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
            <h2 className="text-lg font-bold text-ono-gray-dark">מהלכים פעילים</h2>
            <Link href="/initiatives" className="text-sm text-ono-green hover:text-ono-green-dark">
              הצג הכל
            </Link>
          </div>
          {initiatives.length === 0 ? (
            <p className="text-ono-gray text-sm text-center py-8">אין מהלכים פעילים</p>
          ) : (
            <div className="space-y-3">
              {initiatives.map((initiative) => {
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
                        {initiative.slugs?.display_name} · {initiative.short_code}
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
