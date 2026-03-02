'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Share2,
  PlusCircle,
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
  ScrollText,
  Download,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ActivityLogEntry } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  upload: 'העלאה',
  edit: 'עריכה',
  archive: 'ארכיון',
  restore: 'שחזור',
  delete: 'מחיקה',
  share: 'שיתוף',
  create: 'יצירה',
  comment: 'הערה',
  error: 'שגיאה',
  search: 'חיפוש',
  download: 'הורדה',
  auto_delete_expired: 'מחיקה אוטומטית',
  activate: 'הפעלה',
  deactivate: 'השבתה',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  asset: 'חומר',
  collection: 'אוסף',
  initiative: 'קמפיין',
  user: 'משתמש',
  system: 'מערכת',
  search: 'חיפוש',
  slug: 'סלאג',
  tag: 'תגית',
};

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'הכל' },
  { value: 'upload', label: 'העלאה' },
  { value: 'edit', label: 'עריכה' },
  { value: 'archive', label: 'ארכיון' },
  { value: 'restore', label: 'שחזור' },
  { value: 'delete', label: 'מחיקה' },
  { value: 'share', label: 'שיתוף' },
  { value: 'create', label: 'יצירה' },
  { value: 'comment', label: 'הערה' },
  { value: 'search', label: 'חיפוש' },
  { value: 'download', label: 'הורדה' },
  { value: 'error', label: 'שגיאה' },
];

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'הכל' },
  { value: 'asset', label: 'חומר' },
  { value: 'collection', label: 'אוסף' },
  { value: 'initiative', label: 'קמפיין' },
  { value: 'slug', label: 'סלאג' },
  { value: 'tag', label: 'תגית' },
  { value: 'search', label: 'חיפוש' },
  { value: 'system', label: 'מערכת' },
];

const LOGIN_METHOD_LABELS: Record<string, string> = {
  google: 'Google',
  email: 'אימייל',
  github: 'GitHub',
  azure: 'Azure AD',
  magic_link: 'קישור קסם',
};

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabId = 'all' | 'uploads' | 'searches' | 'management' | 'errors';

const TABS: { id: TabId; label: string; color: string; activeColor: string }[] = [
  { id: 'all', label: 'הכל', color: 'text-ono-gray', activeColor: 'border-ono-green text-ono-green' },
  { id: 'uploads', label: 'העלאות', color: 'text-ono-gray', activeColor: 'border-ono-green text-ono-green' },
  { id: 'searches', label: 'חיפושים', color: 'text-ono-gray', activeColor: 'border-blue-500 text-blue-600' },
  { id: 'management', label: 'ניהול', color: 'text-ono-gray', activeColor: 'border-purple-500 text-purple-600' },
  { id: 'errors', label: 'שגיאות', color: 'text-ono-gray', activeColor: 'border-red-500 text-red-600' },
];

// ---------------------------------------------------------------------------
// Helper: Action icon
// ---------------------------------------------------------------------------

function ActionIcon({ action }: { action: string }) {
  const cls = 'w-4 h-4';
  switch (action) {
    case 'upload':
      return <Upload className={`${cls} text-ono-green`} />;
    case 'edit':
      return <Pencil className={`${cls} text-blue-500`} />;
    case 'archive':
      return <Archive className={`${cls} text-ono-orange`} />;
    case 'restore':
      return <RotateCcw className={`${cls} text-ono-green`} />;
    case 'delete':
      return <Trash2 className={`${cls} text-red-500`} />;
    case 'share':
      return <Share2 className={`${cls} text-purple-500`} />;
    case 'create':
      return <PlusCircle className={`${cls} text-ono-green`} />;
    case 'comment':
      return <MessageSquare className={`${cls} text-blue-400`} />;
    case 'error':
      return <AlertCircle className={`${cls} text-red-500`} />;
    case 'search':
      return <Search className={`${cls} text-blue-500`} />;
    case 'download':
      return <Download className={`${cls} text-ono-green`} />;
    case 'auto_delete_expired':
      return <Zap className={`${cls} text-orange-500`} />;
    default:
      return <Activity className={`${cls} text-ono-gray`} />;
  }
}

// ---------------------------------------------------------------------------
// Helper: Content description — shows meaningful inline details
// ---------------------------------------------------------------------------

function getContentDescription(entry: ActivityLogEntry): string | null {
  const m = entry.metadata || {};
  const parts: string[] = [];

  switch (entry.action) {
    case 'upload': {
      if (m.file_type) parts.push(String(m.file_type));
      if (m.file_size_bytes) {
        const bytes = Number(m.file_size_bytes);
        if (bytes > 1024 * 1024) parts.push(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);
        else if (bytes > 1024) parts.push(`${(bytes / 1024).toFixed(0)} KB`);
      }
      if (m.upload_method) parts.push(String(m.upload_method) === 'direct' ? 'העלאה ישירה' : String(m.upload_method));
      break;
    }
    case 'download': {
      if (m.file_type) parts.push(String(m.file_type));
      if (m.file_size) parts.push(String(m.file_size));
      if (m.original_filename && entry.entity_name !== m.original_filename) {
        parts.push(`מקור: ${String(m.original_filename)}`);
      }
      if (m.via_share) parts.push('דרך קישור שיתוף');
      break;
    }
    case 'search': {
      if (m.result_count !== undefined) parts.push(`${m.result_count} תוצאות`);
      const filters = m.filters as Record<string, unknown> | undefined;
      if (filters) {
        const activeFilters: string[] = [];
        if (filters.slug_id) activeFilters.push('סלאג');
        if (filters.initiative_id) activeFilters.push('קמפיין');
        if (filters.file_type) activeFilters.push('סוג');
        if (filters.platform) activeFilters.push('פלטפורמה');
        if (filters.tag) activeFilters.push('תגית');
        if (filters.search) activeFilters.push(`"${filters.search}"`);
        if (activeFilters.length > 0) parts.push(`סינון: ${activeFilters.join(', ')}`);
      }
      break;
    }
    case 'error': {
      if (m.context) parts.push(String(m.context));
      break;
    }
    case 'edit': {
      if (m.changed_fields) parts.push(`שדות: ${String(m.changed_fields)}`);
      break;
    }
    case 'share': {
      if (m.expires_in_days) parts.push(`${m.expires_in_days} ימים`);
      if (m.asset_count) parts.push(`${m.asset_count} חומרים`);
      break;
    }
    case 'auto_delete_expired': {
      if (m.deleted_count) parts.push(`${m.deleted_count} חומרים נמחקו`);
      break;
    }
    default:
      break;
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

// ---------------------------------------------------------------------------
// Helper: Time formatting
// ---------------------------------------------------------------------------

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

function fullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Types for API response
// ---------------------------------------------------------------------------

interface LogUser {
  id: string;
  name: string;
}

interface LogStats {
  totalEvents: number;
  errorCount: number;
  todayCount: number;
  uploadCount: number;
  searchCount: number;
}

interface LogResponse {
  entries: ActivityLogEntry[];
  total: number;
  users: LogUser[];
  stats: LogStats;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function UnifiedActivityLogPage() {
  const searchParams = useSearchParams();

  // Data state
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<LogUser[]>([]);
  const [stats, setStats] = useState<LogStats>({
    totalEvents: 0,
    errorCount: 0,
    todayCount: 0,
    uploadCount: 0,
    searchCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter state — initialize user filter from URL ?user= param
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterUserId, setFilterUserId] = useState(searchParams.get('user') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded row state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, filterAction, filterEntityType, filterUserId, dateFrom, dateTo]);

  // Fetch log entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((currentPage - 1) * PAGE_SIZE));
      params.set('tab', activeTab);

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterAction) params.set('action', filterAction);
      if (filterEntityType) params.set('entity_type', filterEntityType);
      if (filterUserId) params.set('user_id', filterUserId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: LogResponse = await res.json();

      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setUsers(data.users || []);
      setStats(
        data.stats || { totalEvents: 0, errorCount: 0, todayCount: 0, uploadCount: 0, searchCount: 0 }
      );
    } catch {
      setEntries([]);
      setTotal(0);
    }
    setLoading(false);
  }, [currentPage, activeTab, debouncedSearch, filterAction, filterEntityType, filterUserId, dateFrom, dateTo]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Derived values
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">יומן פעילות</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-ono-green" />}
          label='סה"כ'
          value={stats.totalEvents}
          bgColor="bg-ono-green-light"
          borderColor="border-[#E8E8E8]"
        />
        <StatCard
          icon={<Upload className="w-5 h-5 text-ono-green" />}
          label="העלאות"
          value={stats.uploadCount}
          bgColor="bg-ono-green-light"
          borderColor="border-[#E8E8E8]"
        />
        <StatCard
          icon={<Search className="w-5 h-5 text-blue-500" />}
          label="חיפושים"
          value={stats.searchCount}
          bgColor="bg-blue-50"
          borderColor="border-[#E8E8E8]"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          label="שגיאות"
          value={stats.errorCount}
          bgColor="bg-red-50"
          borderColor="border-red-200"
          textColor="text-red-600"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          label="היום"
          value={stats.todayCount}
          bgColor="bg-blue-50"
          borderColor="border-[#E8E8E8]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E8E8E8]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? tab.activeColor
                : `border-transparent ${tab.color} hover:text-ono-gray-dark`
            }`}
          >
            {tab.label}
            {tab.id === 'errors' && stats.errorCount > 0 && (
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 min-w-[20px] justify-center"
              >
                {stats.errorCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ono-gray pointer-events-none" />
            <Input
              placeholder="חיפוש לפי שם או פריט..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-right"
            />
          </div>

          {/* Action filter */}
          <div className="relative min-w-[130px]">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm appearance-none pr-3 pl-8 text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ono-gray pointer-events-none" />
          </div>

          {/* Entity type filter */}
          <div className="relative min-w-[130px]">
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm appearance-none pr-3 pl-8 text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ono-gray pointer-events-none" />
          </div>

          {/* User filter */}
          <div className="relative min-w-[150px]">
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm appearance-none pr-3 pl-8 text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">כל המשתמשים</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ono-gray pointer-events-none" />
          </div>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[140px]"
            title="מתאריך"
          />

          {/* Date to */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[140px]"
            title="עד תאריך"
          />
        </div>
      </div>

      {/* Log table */}
      {loading ? (
        <div className="text-center py-16 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען יומן פעילות...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-ono-gray">
          <Activity className="w-12 h-12 mx-auto mb-3 text-ono-gray/50" />
          <p className="font-medium">אין רשומות להצגה</p>
          <p className="text-sm mt-1">
            נסה לשנות את הפילטרים או טווח התאריכים
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[140px_120px_100px_100px_1fr_60px] gap-2 px-4 py-3 bg-ono-gray-light text-xs font-semibold text-ono-gray-dark border-b border-[#E8E8E8]">
            <span>זמן</span>
            <span>משתמש</span>
            <span>פעולה</span>
            <span>סוג</span>
            <span>פריט</span>
            <span>פרטים</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-[#E8E8E8]">
            {entries.map((entry) => {
              const isError = entry.action === 'error';
              const isExpanded = expandedRow === entry.id;
              const errorMessage =
                isError && entry.metadata?.error_message
                  ? String(entry.metadata.error_message)
                  : null;
              const loginMethod: string | null = entry.metadata?.login_method
                ? String(entry.metadata.login_method)
                : null;
              const contentDesc = getContentDescription(entry);

              return (
                <div key={entry.id}>
                  {/* Main row */}
                  <div
                    onClick={() =>
                      setExpandedRow(isExpanded ? null : entry.id)
                    }
                    className={`grid grid-cols-1 md:grid-cols-[140px_120px_100px_100px_1fr_60px] gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-ono-gray-light/40 ${
                      isError
                        ? 'border-r-4 border-red-500 bg-red-50'
                        : ''
                    }`}
                  >
                    {/* Time */}
                    <div
                      className="text-xs text-ono-gray"
                      title={fullTimestamp(entry.created_at)}
                    >
                      {relativeTime(entry.created_at)}
                    </div>

                    {/* User + login method */}
                    <div className="text-sm text-ono-gray-dark truncate flex items-center gap-1">
                      {entry.user_name || 'מערכת'}
                      {loginMethod && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 text-ono-gray font-normal"
                        >
                          {LOGIN_METHOD_LABELS[loginMethod] || loginMethod}
                        </Badge>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-1.5">
                      <ActionIcon action={entry.action} />
                      <span
                        className={`text-sm ${
                          isError
                            ? 'text-red-600 font-medium'
                            : 'text-ono-gray-dark'
                        }`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </div>

                    {/* Entity type */}
                    <div>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-ono-gray"
                      >
                        {ENTITY_TYPE_LABELS[entry.entity_type] ||
                          entry.entity_type}
                      </Badge>
                    </div>

                    {/* Entity name + content description */}
                    <div className="min-w-0">
                      <div className="text-sm text-ono-gray-dark truncate">
                        {entry.entity_name || '-'}
                      </div>
                      {contentDesc && (
                        <div className="text-[11px] text-ono-gray mt-0.5 truncate">
                          {contentDesc}
                        </div>
                      )}
                      {errorMessage && (
                        <div className="text-xs text-red-500 mt-0.5 truncate">
                          {errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <div className="flex justify-center">
                      <ChevronDown
                        className={`w-4 h-4 text-ono-gray transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className={`px-6 py-4 text-sm border-t border-dashed border-[#E8E8E8] ${
                        isError ? 'bg-red-50/60' : 'bg-ono-gray-light/30'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                        <DetailField label="מזהה רשומה" value={entry.id} mono />
                        <DetailField
                          label="זמן מדויק"
                          value={fullTimestamp(entry.created_at)}
                        />
                        {entry.user_id && (
                          <DetailField
                            label="מזהה משתמש"
                            value={entry.user_id}
                            mono
                          />
                        )}
                        {entry.entity_id && (
                          <DetailField
                            label="מזהה פריט"
                            value={entry.entity_id}
                            mono
                          />
                        )}

                        {/* IP Address */}
                        {Boolean(entry.metadata?.ip) && (
                          <DetailField
                            label="כתובת IP"
                            value={String(entry.metadata.ip)}
                            mono
                          />
                        )}

                        {/* Login Method */}
                        {Boolean(entry.metadata?.login_method) && (
                          <DetailField
                            label="שיטת התחברות"
                            value={
                              LOGIN_METHOD_LABELS[
                                String(entry.metadata.login_method)
                              ] || String(entry.metadata.login_method)
                            }
                          />
                        )}

                        {/* User Agent - full width */}
                        {Boolean(entry.metadata?.user_agent) &&
                          entry.metadata?.user_agent !== 'system' && (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <DetailField
                              label="דפדפן (User Agent)"
                              value={String(entry.metadata.user_agent)}
                              mono
                              truncate
                            />
                          </div>
                        )}
                      </div>

                      {/* Full Metadata */}
                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 && (
                          <div className="mt-4">
                            <span className="text-xs text-ono-gray font-medium">
                              מטא-דאטה
                            </span>
                            <div className="mt-1.5 space-y-1">
                              {Object.entries(entry.metadata)
                                .filter(
                                  ([key]) =>
                                    !['ip', 'user_agent', 'login_method', 'timestamp'].includes(key)
                                )
                                .map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-start gap-2 text-xs"
                                  >
                                    <span className="font-medium text-ono-gray-dark min-w-[100px]">
                                      {key}:
                                    </span>
                                    <span
                                      className={`break-all ${
                                        key === 'error_message'
                                          ? 'text-red-600 font-medium'
                                          : 'text-ono-gray'
                                      }`}
                                    >
                                      {typeof value === 'object'
                                        ? JSON.stringify(value, null, 2)
                                        : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-ono-gray">
            {total.toLocaleString('he-IL')} רשומות
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-ono-gray"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {generatePageNumbers(currentPage, totalPages).map(
              (page, idx) =>
                page === null ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-ono-gray text-sm"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={
                      page === currentPage
                        ? 'bg-ono-green hover:bg-ono-green-dark text-white min-w-[32px]'
                        : 'text-ono-gray min-w-[32px]'
                    }
                  >
                    {page}
                  </Button>
                )
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="text-ono-gray"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm text-ono-gray mr-2">
              עמוד {currentPage} מתוך {totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  bgColor,
  borderColor,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
  borderColor: string;
  textColor?: string;
}) {
  return (
    <div
      className={`bg-white border ${borderColor} rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-3 flex items-center gap-3`}
    >
      <div
        className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-ono-gray">{label}</p>
        <p className={`text-lg font-bold ${textColor || 'text-ono-gray-dark'}`}>
          {value.toLocaleString('he-IL')}
        </p>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-ono-gray font-medium">{label}</span>
      <p
        className={`text-ono-gray-dark text-xs mt-0.5 ${
          mono ? 'font-mono' : ''
        } ${truncate ? 'truncate' : ''}`}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: generate page number array with ellipsis
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];

  pages.push(1);

  if (current > 3) {
    pages.push(null);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
