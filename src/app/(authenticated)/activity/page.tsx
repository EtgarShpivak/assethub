'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Upload,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Share2,
  PlusCircle,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActivityLogEntry } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  upload: 'העלאה',
  edit: 'עריכה',
  archive: 'ארכיון',
  restore: 'שחזור',
  delete: 'מחיקה',
  share: 'שיתוף',
  create: 'יצירה',
  comment: 'הערה',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  asset: 'חומר',
  collection: 'אוסף',
  initiative: 'קמפיין',
  user: 'משתמש',
};

const FILTER_TABS: { value: string; label: string }[] = [
  { value: '', label: 'הכל' },
  { value: 'asset', label: 'חומרים' },
  { value: 'collection', label: 'אוספים' },
  { value: 'initiative', label: 'קמפיינים' },
  { value: 'user', label: 'משתמשים' },
];

function ActionIcon({ action }: { action: string }) {
  const cls = 'w-4 h-4';
  switch (action) {
    case 'upload': return <Upload className={`${cls} text-ono-green`} />;
    case 'edit': return <Pencil className={`${cls} text-blue-500`} />;
    case 'archive': return <Archive className={`${cls} text-ono-orange`} />;
    case 'restore': return <RotateCcw className={`${cls} text-ono-green`} />;
    case 'delete': return <Trash2 className={`${cls} text-red-500`} />;
    case 'share': return <Share2 className={`${cls} text-purple-500`} />;
    case 'create': return <PlusCircle className={`${cls} text-ono-green`} />;
    case 'comment': return <MessageSquare className={`${cls} text-blue-400`} />;
    default: return <Activity className={`${cls} text-ono-gray`} />;
  }
}

function actionBgColor(action: string): string {
  switch (action) {
    case 'upload': return 'bg-ono-green-light';
    case 'edit': return 'bg-blue-50';
    case 'archive': return 'bg-orange-50';
    case 'restore': return 'bg-ono-green-light';
    case 'delete': return 'bg-red-50';
    case 'share': return 'bg-purple-50';
    case 'create': return 'bg-ono-green-light';
    case 'comment': return 'bg-blue-50';
    default: return 'bg-ono-gray-light';
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'הרגע';
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  if (diffHour < 24) return `לפני ${diffHour} שעות`;
  if (diffDay < 7) return `לפני ${diffDay} ימים`;
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 20;

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterEntityType, setFilterEntityType] = useState('');

  const fetchEntries = useCallback(async (entityType: string, append = false, offset = 0) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE + 1));
      if (offset > 0) params.set('offset', String(offset));
      if (entityType) params.set('entity_type', entityType);

      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      const items: ActivityLogEntry[] = Array.isArray(data) ? data : data.entries || [];

      if (items.length > PAGE_SIZE) {
        setHasMore(true);
        items.pop();
      } else {
        setHasMore(false);
      }

      if (append) {
        setEntries(prev => [...prev, ...items]);
      } else {
        setEntries(items);
      }
    } catch {
      // silent
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchEntries(filterEntityType);
  }, [filterEntityType, fetchEntries]);

  const handleLoadMore = () => {
    fetchEntries(filterEntityType, true, entries.length);
  };

  const handleFilterChange = (entityType: string) => {
    setFilterEntityType(entityType);
    setHasMore(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">יומן פעילות</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={filterEntityType === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(tab.value)}
            className={filterEntityType === tab.value ? 'bg-ono-green hover:bg-ono-green-dark text-white' : ''}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען פעילות...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-ono-gray">
          <Activity className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p>אין פעילות להצגה</p>
          <p className="text-sm mt-1">פעילויות שיבוצעו במערכת יופיעו כאן</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] divide-y divide-[#E8E8E8]">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 hover:bg-ono-gray-light/30 transition-colors"
            >
              {/* Action icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${actionBgColor(entry.action)}`}>
                <ActionIcon action={entry.action} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-ono-gray-dark">
                    {entry.user_name || 'מערכת'}
                  </span>
                  <span className="text-sm text-ono-gray">
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                  {entry.entity_name && (
                    <span className="text-sm font-medium text-ono-gray-dark truncate max-w-[250px]">
                      {entry.entity_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {entry.entity_type && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-ono-gray">
                      {ENTITY_TYPE_LABELS[entry.entity_type] || entry.entity_type}
                    </Badge>
                  )}
                  <span className="text-xs text-ono-gray">
                    {relativeTime(entry.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && entries.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-ono-gray hover:text-ono-gray-dark"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" />
                טוען...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 ml-1" />
                טען עוד
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
