'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Megaphone,
  ArrowRight,
  Download,
  Calendar,
  Edit2,
  Image as ImageIcon,
  Film,
  FileText,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { INITIATIVE_STATUSES, PLATFORMS } from '@/lib/platform-specs';
import type { Initiative, Asset } from '@/lib/types';

const statusBadgeStyles: Record<string, string> = {
  active: 'bg-ono-green-light text-ono-green-dark',
  ongoing: 'bg-blue-50 text-blue-700',
  ended: 'bg-ono-gray-light text-ono-gray',
  archived: 'bg-ono-gray-light text-ono-gray',
};

function FileTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image': return <ImageIcon className="w-8 h-8 text-ono-green" />;
    case 'video': return <Film className="w-8 h-8 text-platform-meta" />;
    case 'pdf': return <FileText className="w-8 h-8 text-platform-google" />;
    default: return <File className="w-8 h-8 text-ono-gray" />;
  }
}

const statusOrder = ['active', 'ongoing', 'ended', 'archived'];

export default function InitiativeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [initiative, setInitiative] = useState<(Initiative & { slugs?: { slug: string; display_name: string }; assets?: Asset[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/initiatives/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setInitiative(data);
        setLoading(false);
      });
  }, [params.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!initiative) return;
    await fetch(`/api/initiatives/${initiative.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setInitiative({ ...initiative, status: newStatus as Initiative['status'] });
  };

  if (loading) {
    return <div className="text-center py-12 text-ono-gray">טוען...</div>;
  }

  if (!initiative) {
    return <div className="text-center py-12 text-ono-gray">מהלך לא נמצא</div>;
  }

  const currentStatusIdx = statusOrder.indexOf(initiative.status);
  const nextStatus = currentStatusIdx < statusOrder.length - 1 ? statusOrder[currentStatusIdx + 1] : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ono-gray">
        <Link href="/initiatives" className="hover:text-ono-green">מהלכים שיווקיים</Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-ono-gray-dark">{initiative.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Megaphone className="w-6 h-6 text-ono-green" />
              <h1 className="text-2xl font-bold text-ono-gray-dark">{initiative.name}</h1>
              <Badge className={`${statusBadgeStyles[initiative.status]} text-xs`}>
                {INITIATIVE_STATUSES.find((s) => s.value === initiative.status)?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-ono-gray">
              <span className="font-mono">{initiative.short_code}</span>
              <span>·</span>
              <span>{initiative.slugs?.display_name}</span>
              {initiative.start_date && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(initiative.start_date).toLocaleDateString('he-IL')}
                    {initiative.end_date && ` — ${new Date(initiative.end_date).toLocaleDateString('he-IL')}`}
                  </span>
                </>
              )}
            </div>
            {initiative.notes && (
              <p className="text-sm text-ono-gray mt-3">{initiative.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {nextStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(nextStatus)}
              >
                <Edit2 className="w-3.5 h-3.5 ml-1" />
                העבר ל{INITIATIVE_STATUSES.find((s) => s.value === nextStatus)?.label}
              </Button>
            )}
            <Button
              size="sm"
              className="bg-ono-green hover:bg-ono-green-dark text-white"
              onClick={() => router.push(`/export?initiative=${initiative.id}`)}
            >
              <Download className="w-3.5 h-3.5 ml-1" />
              ייצא חומרים
            </Button>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-ono-gray-dark">
            חומרים ({initiative.assets?.length || 0})
          </h2>
          <Link href={`/upload?initiative=${initiative.id}`}>
            <Button size="sm" variant="outline">העלה חומרים</Button>
          </Link>
        </div>

        {!initiative.assets || initiative.assets.length === 0 ? (
          <p className="text-ono-gray text-sm text-center py-8">אין חומרים במהלך זה</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {initiative.assets.map((asset) => (
              <div
                key={asset.id}
                className="border border-[#E8E8E8] rounded-lg p-3 hover:border-ono-green transition-colors"
              >
                <div className="aspect-square bg-ono-gray-light rounded-md flex items-center justify-center mb-2">
                  <FileTypeIcon type={asset.file_type} />
                </div>
                <p className="text-xs text-ono-gray-dark font-medium truncate">
                  {asset.stored_filename || asset.original_filename}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {asset.dimensions_label && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {asset.dimensions_label}
                    </Badge>
                  )}
                  {asset.platforms?.map((p) => {
                    const plat = PLATFORMS.find((pl) => pl.value === p);
                    return plat ? (
                      <Badge
                        key={p}
                        style={{ backgroundColor: `${plat.color}15`, color: plat.color }}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {plat.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
