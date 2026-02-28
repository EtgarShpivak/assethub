'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
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
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  asset: 'חומר',
  collection: 'אוסף',
  initiative: 'קמפיין',
  user: 'משתמש',
  system: 'מערכת',
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
  { value: 'error', label: 'שגיאה' },
];

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'הכל' },
  { value: 'asset', label: 'חומר' },
  { value: 'collection', label: 'אוסף' },
  { value: 'initiative', label: 'קמפיין' },
  { value: 'user', label: 'משתמש' },
  { value: 'system', label: 'מערכת' },
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
    default:
      return <Activity className={`${cls} text-ono-gray`} />;
  }
}

// ---------------------------------------------------------------------------
// Helper: Relative time in Hebrew
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

// ---------------------------------------------------------------------------
// Helper: Full timestamp for expanded details
// ---------------------------------------------------------------------------

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

interface SystemLogUser {
  id: string;
  name: string;
}

interface SystemLogStats {
  totalEvents: number;
  errorCount: number;
  todayCount: number;
}

interface SystemLogResponse {
  entries: ActivityLogEntry[];
  total: number;
  users: SystemLogUser[];
  stats: SystemLogStats;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function SystemLogPage() {
  // Auth state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Data state
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<SystemLogUser[]>([]);
  const [stats, setStats] = useState<SystemLogStats>({
    totalEvents: 0,
    errorCount: 0,
    todayCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'errors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Expanded row state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ------------------------------------------------------------------
  // Admin role check
  // ------------------------------------------------------------------
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await res.json();
        setIsAdmin(data.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  // ------------------------------------------------------------------
  // Debounce search input (400ms)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Fetch log entries
  // ------------------------------------------------------------------
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((currentPage - 1) * PAGE_SIZE));

      if (activeTab === 'errors') {
        params.set('errors_only', 'true');
      }
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      if (filterAction) {
        params.set('action', filterAction);
      }
      if (filterEntityType) {
        params.set('entity_type', filterEntityType);
      }
      if (filterUserId) {
        params.set('user_id', filterUserId);
      }
      if (dateFrom) {
        params.set('date_from', dateFrom);
      }
      if (dateTo) {
        params.set('date_to', dateTo);
      }

      const res = await fetch(`/api/system-log?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: SystemLogResponse = await res.json();

      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setUsers(data.users || []);
      setStats(
        data.stats || { totalEvents: 0, errorCount: 0, todayCount: 0 }
      );
    } catch {
      setEntries([]);
      setTotal(0);
    }
    setLoading(false);
  }, [
    currentPage,
    activeTab,
    debouncedSearch,
    filterAction,
    filterEntityType,
    filterUserId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (isAdmin) {
      fetchEntries();
    }
  }, [isAdmin, fetchEntries]);

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ------------------------------------------------------------------
  // Render: checking admin
  // ------------------------------------------------------------------
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ono-gray text-sm">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: access denied
  // ------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-ono-gray-dark">
            אין גישה
          </h2>
          <p className="text-ono-gray text-sm max-w-md">
            דף זה מיועד למנהלי מערכת בלבד. אם אתה סבור שמדובר בטעות, פנה
            למנהל המערכת.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: main page
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ============================================================= */}
      {/* Header                                                        */}
      {/* ============================================================= */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">
          לוג מערכת (אדמין)
        </h1>
      </div>

      {/* ============================================================= */}
      {/* Stats bar                                                     */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total events */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ono-green-light flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-ono-green" />
          </div>
          <div>
            <p className="text-xs text-ono-gray">סה&quot;כ אירועים</p>
            <p className="text-xl font-bold text-ono-gray-dark">
              {stats.totalEvents.toLocaleString('he-IL')}
            </p>
          </div>
        </div>

        {/* Errors */}
        <div className="bg-white border border-red-200 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-ono-gray">שגיאות</p>
            <p className="text-xl font-bold text-red-600">
              {stats.errorCount.toLocaleString('he-IL')}
            </p>
          </div>
        </div>

        {/* Today */}
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-ono-gray">אירועים היום</p>
            <p className="text-xl font-bold text-ono-gray-dark">
              {stats.todayCount.toLocaleString('he-IL')}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Tabs                                                          */}
      {/* ============================================================= */}
      <div className="flex gap-2 border-b border-[#E8E8E8]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-ono-green text-ono-green'
              : 'border-transparent text-ono-gray hover:text-ono-gray-dark'
          }`}
        >
          כל הפעילות
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'errors'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-ono-gray hover:text-ono-gray-dark'
          }`}
        >
          שגיאות בלבד
          {stats.errorCount > 0 && (
            <Badge
              variant="destructive"
              className="text-[10px] px-1.5 py-0 min-w-[20px] justify-center"
            >
              {stats.errorCount}
            </Badge>
          )}
        </button>
      </div>

      {/* ============================================================= */}
      {/* Filter bar                                                    */}
      {/* ============================================================= */}
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
          <div className="relative min-w-[140px]">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="מתאריך"
            />
          </div>

          {/* Date to */}
          <div className="relative min-w-[140px]">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="עד תאריך"
            />
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Log table                                                     */}
      {/* ============================================================= */}
      {loading ? (
        <div className="text-center py-16 text-ono-gray">
          <div className="w-8 h-8 border-2 border-ono-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          טוען לוג מערכת...
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
                    <div className="text-xs text-ono-gray" title={fullTimestamp(entry.created_at)}>
                      <span className="md:hidden font-semibold text-ono-gray-dark ml-1">
                        זמן:{' '}
                      </span>
                      {relativeTime(entry.created_at)}
                    </div>

                    {/* User */}
                    <div className="text-sm text-ono-gray-dark truncate">
                      <span className="md:hidden font-semibold ml-1">
                        משתמש:{' '}
                      </span>
                      {entry.user_name || 'מערכת'}
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-1.5">
                      <span className="md:hidden font-semibold text-sm text-ono-gray-dark ml-1">
                        פעולה:{' '}
                      </span>
                      <ActionIcon action={entry.action} />
                      <span
                        className={`text-sm ${
                          isError ? 'text-red-600 font-medium' : 'text-ono-gray-dark'
                        }`}
                      >
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </div>

                    {/* Entity type */}
                    <div>
                      <span className="md:hidden font-semibold text-sm text-ono-gray-dark ml-1">
                        סוג:{' '}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-ono-gray"
                      >
                        {ENTITY_TYPE_LABELS[entry.entity_type] ||
                          entry.entity_type}
                      </Badge>
                    </div>

                    {/* Entity name */}
                    <div className="text-sm text-ono-gray-dark truncate">
                      <span className="md:hidden font-semibold ml-1">
                        פריט:{' '}
                      </span>
                      {entry.entity_name || '-'}
                      {errorMessage && (
                        <span className="block text-xs text-red-500 mt-0.5 truncate">
                          {errorMessage}
                        </span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                        <div>
                          <span className="text-xs text-ono-gray font-medium">
                            מזהה רשומה
                          </span>
                          <p className="text-ono-gray-dark font-mono text-xs mt-0.5">
                            {entry.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-ono-gray font-medium">
                            זמן מדויק
                          </span>
                          <p className="text-ono-gray-dark text-xs mt-0.5">
                            {fullTimestamp(entry.created_at)}
                          </p>
                        </div>
                        {entry.user_id && (
                          <div>
                            <span className="text-xs text-ono-gray font-medium">
                              מזהה משתמש
                            </span>
                            <p className="text-ono-gray-dark font-mono text-xs mt-0.5">
                              {entry.user_id}
                            </p>
                          </div>
                        )}
                        {entry.entity_id && (
                          <div>
                            <span className="text-xs text-ono-gray font-medium">
                              מזהה פריט
                            </span>
                            <p className="text-ono-gray-dark font-mono text-xs mt-0.5">
                              {entry.entity_id}
                            </p>
                          </div>
                        )}
                        {entry.workspace_id && (
                          <div>
                            <span className="text-xs text-ono-gray font-medium">
                              Workspace
                            </span>
                            <p className="text-ono-gray-dark font-mono text-xs mt-0.5">
                              {entry.workspace_id}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 && (
                          <div className="mt-4">
                            <span className="text-xs text-ono-gray font-medium">
                              מטא-דאטה
                            </span>
                            <div className="mt-1.5 space-y-1">
                              {Object.entries(entry.metadata).map(
                                ([key, value]) => (
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
                                )
                              )}
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

      {/* ============================================================= */}
      {/* Pagination                                                    */}
      {/* ============================================================= */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Total count */}
          <p className="text-sm text-ono-gray">
            {total.toLocaleString('he-IL')} רשומות
          </p>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {/* Previous page */}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-ono-gray"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {/* Page numbers */}
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

            {/* Next page */}
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

            {/* Page indicator */}
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

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push(null); // ellipsis
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null); // ellipsis
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
