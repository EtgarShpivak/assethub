'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Users,
  Link as LinkIcon,
  Copy,
  Plus,
  Trash2,
  Shield,
  UserPlus,
  Eye,
  Upload,
  Megaphone,
  CheckCircle,
  XCircle,
  Mail,
  AlertTriangle,
  UserMinus,
  ScrollText,
  Clock,
  UserCheck,
  ArrowUpDown,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useGlobalToast } from '@/components/ui/global-toast';
import { logClientError } from '@/lib/error-logger';
import { PERMISSION_DEFS, DEFAULT_PERMISSIONS } from '@/lib/types';
import type { Slug, Initiative, UserProfile, UserPermissions } from '@/lib/types';

interface UploadTokenEntry {
  id: string;
  token: string;
  workspace_id: string;
  slug_id: string;
  initiative_id: string | null;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  slugs?: { slug: string; display_name: string };
  initiatives?: { name: string; short_code: string } | null;
}

// Permission icons mapping
const PERM_ICONS: Record<string, typeof Eye> = {
  can_view: Eye,
  can_upload: Upload,
  can_delete_assets: Trash2,
  can_manage_campaigns: Megaphone,
  can_manage_users: Users,
  can_view_activity_log: ScrollText,
};

type UserFilter = 'all' | 'active' | 'inactive' | 'deleted';
type UserSort = 'display_name' | 'last_login' | 'created_at' | 'email';

export default function SettingsPage() {
  const { showError, showSuccess } = useGlobalToast();
  const [tokens, setTokens] = useState<UploadTokenEntry[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Current user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isAdmin = currentUser?.permissions?.can_manage_users === true || currentUser?.role === 'admin';

  // Users management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userFilter, setUserFilter] = useState<UserFilter>('active');
  const [userSort, setUserSort] = useState<UserSort>('display_name');
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('asc');
  const [userSearch, setUserSearch] = useState('');

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<UserPermissions>({ ...DEFAULT_PERMISSIONS });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  const [editSaving, setEditSaving] = useState(false);

  // Delete user confirmation
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Re-invite
  const [reinviting, setReinviting] = useState<string | null>(null);

  // Token form
  const [tokenWorkspace, setTokenWorkspace] = useState('');
  const [tokenSlug, setTokenSlug] = useState('');
  const [tokenInitiative, setTokenInitiative] = useState('');
  const [tokenExpiresDays, setTokenExpiresDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const fetchMyProfile = async () => {
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const profile = await res.json();
        setCurrentUser(profile);
      } else if (res.status === 401) {
        showError('פג תוקף ההתחברות', 'יש להתחבר מחדש למערכת.', 'רענן את הדף והתחבר מחדש.');
      }
    } catch {
      logClientError('settings-fetch-profile', 'Failed to fetch user profile');
    }
  };

  const fetchUsers = async (filter?: UserFilter, sort?: UserSort, dir?: 'asc' | 'desc') => {
    const f = filter || userFilter;
    const s = sort || userSort;
    const d = dir || userSortDir;
    try {
      const params = new URLSearchParams({ filter: f, sort: s, dir: d });
      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data as UserProfile[]);
          return data as UserProfile[];
        }
      } else if (res.status === 403) {
        // Not admin — skip
      } else {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody?.error || `שגיאה ${res.status}`;
        showError('שגיאה בטעינת משתמשים', errMsg);
        logClientError('settings-fetch-users', `API ${res.status}: ${errMsg}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      showError('שגיאה בטעינת משתמשים', 'בדוק את החיבור לאינטרנט ורענן את הדף.');
      logClientError('settings-fetch-users', `Network: ${errMsg}`);
    }
    return [] as UserProfile[];
  };

  const fetchData = () => {
    const promises: Promise<unknown>[] = [
      fetch('/api/upload-tokens').then((r) => r.json()),
      fetch('/api/slugs').then((r) => r.json()),
      fetch('/api/initiatives').then((r) => r.json()),
      fetch('/api/workspaces').then((r) => r.json()),
    ];

    Promise.all(promises).then(([tk, sl, ini, ws]) => {
      setTokens(tk as UploadTokenEntry[]);
      setSlugs(sl as Slug[]);
      setInitiatives(ini as Initiative[]);
      setWorkspaces(ws as { id: string; name: string }[]);
      if ((ws as { id: string }[]).length > 0 && !tokenWorkspace) setTokenWorkspace((ws as { id: string }[])[0].id);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (currentUserId) {
      fetchMyProfile().then(() => fetchUsers());
      fetchData();
    }
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin && users.length === 0 && !loading) {
      fetchUsers();
    }
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filter/sort changes
  const handleFilterChange = (f: UserFilter) => {
    setUserFilter(f);
    fetchUsers(f, userSort, userSortDir);
  };

  const handleSortChange = (s: UserSort) => {
    const newDir = s === userSort ? (userSortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setUserSort(s);
    setUserSortDir(newDir);
    fetchUsers(userFilter, s, newDir);
  };

  const handleCreateToken = async () => {
    if (!tokenWorkspace || !tokenSlug) return;
    setSaving(true);
    const res = await fetch('/api/upload-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: tokenWorkspace,
        slug_id: tokenSlug,
        initiative_id: tokenInitiative || null,
        expires_days: parseInt(tokenExpiresDays),
      }),
    });
    if (res.ok) {
      setShowTokenModal(false);
      setTokenSlug('');
      setTokenInitiative('');
      fetchData();
    }
    setSaving(false);
  };

  const handleRevokeToken = async (id: string) => {
    await fetch(`/api/upload-tokens`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_revoked: true }),
    });
    fetchData();
  };

  const copyTokenLink = (token: string) => {
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    setInviteLink('');
    setCopiedInviteLink(false);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          permissions: invitePermissions,
          invited_by: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'שגיאה בהזמנה');
      } else {
        setInviteSuccess(`המשתמש ${inviteEmail} ${data.updated ? 'עודכן' : 'הוזמן'} בהצלחה!`);
        if (data.invite_link) {
          setInviteLink(data.invite_link);
        }
        setInviteEmail('');
        fetchUsers();
      }
    } catch {
      setInviteError('שגיאה בהזמנת המשתמש');
    }
    setInviting(false);
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 3000);
    }
  };

  const handleReInvite = async (user: UserProfile) => {
    setReinviting(user.id);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          permissions: user.permissions,
          invited_by: currentUserId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.invite_link) {
        await navigator.clipboard.writeText(data.invite_link);
        showSuccess('הזמנה חוזרת נשלחה', `קישור ההזמנה הועתק ללוח. שלח אותו ל-${user.email}`);
      } else {
        showError('שגיאה בשליחת הזמנה חוזרת', data.error || 'נסה שוב');
      }
    } catch {
      showError('שגיאה בשליחת הזמנה חוזרת', 'בדוק חיבור לאינטרנט');
    }
    setReinviting(null);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditUser(user);
    const p = user.permissions || {};
    setEditPermissions({
      can_view: p.can_view !== false,
      can_upload: p.can_upload || p.can_manage_campaigns || false,
      can_delete_assets: p.can_delete_assets || false,
      can_manage_campaigns: p.can_manage_campaigns || p.can_manage_initiatives || false,
      can_manage_users: p.can_manage_users || false,
      can_view_activity_log: p.can_view_activity_log || false,
    });
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setEditSaving(true);
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: editUser.id,
        permissions: editPermissions,
      }),
    });
    setEditSaving(false);
    setEditUser(null);
    showSuccess('ההרשאות עודכנו בהצלחה');
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_active: !isActive }),
    });
    showSuccess(isActive ? 'המשתמש הושבת' : 'המשתמש הופעל');
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/users?user_id=${deleteUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'שגיאה במחיקת המשתמש');
        setDeleting(false);
        return;
      }
      setDeleteUser(null);
      showSuccess('המשתמש נמחק', 'ההיסטוריה נשמרה. ניתן להזמין מחדש בעתיד.');
      fetchUsers();
    } catch {
      setDeleteError('שגיאה במחיקת המשתמש');
    }
    setDeleting(false);
  };

  const filteredInitiatives = tokenSlug
    ? initiatives.filter((i) => i.slug_id === tokenSlug)
    : initiatives;

  // Client-side search filter for users
  const displayedUsers = userSearch
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  // Get user status
  const getUserStatus = (user: UserProfile): { label: string; color: string } => {
    if (user.is_deleted) return { label: 'נמחק', color: 'bg-red-50 text-red-600' };
    if (user.is_active === false) return { label: 'לא פעיל', color: 'bg-ono-orange-light text-ono-orange' };
    return { label: 'פעיל', color: 'bg-ono-green-light text-ono-green-dark' };
  };

  // Count active permissions for a user
  const getActivePermCount = (p: UserPermissions | undefined) => {
    if (!p) return 0;
    return PERMISSION_DEFS.filter(d => p[d.key] === true).length;
  };

  const hasNeverLoggedIn = (user: UserProfile) => !user.last_sign_in_at && !user.is_deleted;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">הגדרות</h1>
        <InfoTooltip text="ניהול משתמשים, הרשאות וקישורי העלאה חיצוניים." size="md" />
      </div>

      {/* Users Management Section */}
      {isAdmin && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-ono-green" />
              <h2 className="text-lg font-bold text-ono-gray-dark">ניהול משתמשים</h2>
              <Badge variant="outline" className="text-xs">{users.length}</Badge>
              <InfoTooltip text="הזמינו משתמשים חדשים, הגדירו הרשאות, והשביתו גישה למשתמשים שאינם פעילים. משתמשים שנמחקו נשמרים להיסטוריה." />
            </div>
            <Button onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(''); setInviteLink(''); setCopiedInviteLink(false); setInvitePermissions({ ...DEFAULT_PERMISSIONS }); }} className="bg-ono-green hover:bg-ono-green-dark text-white" size="sm">
              <UserPlus className="w-4 h-4 ml-1" />
              הזמן משתמש
            </Button>
          </div>

          {/* Filter tabs + sort + search */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-ono-gray-light rounded-lg p-0.5">
              {([
                { value: 'all', label: 'הכל' },
                { value: 'active', label: 'פעילים' },
                { value: 'inactive', label: 'לא פעילים' },
                { value: 'deleted', label: 'נמחקו' },
              ] as { value: UserFilter; label: string }[]).map(f => (
                <button
                  key={f.value}
                  onClick={() => handleFilterChange(f.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    userFilter === f.value
                      ? 'bg-white text-ono-gray-dark shadow-sm'
                      : 'text-ono-gray hover:text-ono-gray-dark'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <select
              value={userSort}
              onChange={e => handleSortChange(e.target.value as UserSort)}
              className="border border-[#E8E8E8] rounded-md px-2 py-1 text-xs"
            >
              <option value="display_name">מיון: שם</option>
              <option value="email">מיון: אימייל</option>
              <option value="last_login">מיון: כניסה אחרונה</option>
              <option value="created_at">מיון: תאריך הצטרפות</option>
            </select>
            <button
              onClick={() => handleSortChange(userSort)}
              className="p-1 rounded hover:bg-ono-gray-light"
              title={userSortDir === 'asc' ? 'סדר עולה' : 'סדר יורד'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-ono-gray" />
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ono-gray" />
              <Input
                placeholder="חיפוש משתמש..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="h-7 pr-7 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-ono-gray text-sm">טוען...</p>
            ) : displayedUsers.length === 0 ? (
              <p className="text-ono-gray text-sm text-center py-4">
                {userSearch ? 'לא נמצאו תוצאות' : userFilter === 'deleted' ? 'אין משתמשים שנמחקו' : userFilter === 'inactive' ? 'אין משתמשים לא פעילים' : 'אין משתמשים'}
              </p>
            ) : (
              displayedUsers.map(user => {
                const status = getUserStatus(user);
                const isDeleted = user.is_deleted === true;
                return (
                  <div key={user.id} className={`flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg ${isDeleted ? 'opacity-40 bg-red-50/30' : user.is_active === false ? 'opacity-60 bg-ono-orange-light/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDeleted ? 'bg-red-100' : 'bg-ono-green-light'}`}>
                        <span className={`text-xs font-bold ${isDeleted ? 'text-red-400' : 'text-ono-green-dark'}`}>
                          {(user.display_name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ono-gray-dark">{user.display_name || user.email}</span>
                          {user.id === currentUserId && <Badge className="bg-ono-orange-light text-ono-orange text-[10px] px-1.5">אתה</Badge>}
                          <Badge className={`${status.color} text-[10px] px-1.5`}>{status.label}</Badge>
                        </div>
                        {/* Permissions badges */}
                        <div className="flex items-center gap-1.5 text-[10px] text-ono-gray mt-0.5 flex-wrap">
                          {user.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{user.email}</span>}
                          <span className="text-ono-gray-light">|</span>
                          {PERMISSION_DEFS.filter(d => user.permissions?.[d.key] === true).map(d => {
                            const Icon = PERM_ICONS[d.key] || Eye;
                            return (
                              <span key={d.key} className="flex items-center gap-0.5" title={d.description}>
                                <Icon className="w-2.5 h-2.5" />
                                {d.label.split(' ')[0]}
                              </span>
                            );
                          })}
                          {getActivePermCount(user.permissions) === 0 && <span className="text-ono-gray">ללא הרשאות מיוחדות</span>}
                        </div>
                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[10px] text-ono-gray mt-0.5">
                          {user.invited_by_name && (
                            <span className="flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" />
                              הוזמן ע&quot;י {user.invited_by_name}
                            </span>
                          )}
                          {user.created_at && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(user.created_at).toLocaleDateString('he-IL')}
                            </span>
                          )}
                          {user.last_sign_in_at ? (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-ono-green" />
                              כניסה אחרונה {new Date(user.last_sign_in_at).toLocaleDateString('he-IL')}
                            </span>
                          ) : !isDeleted && (
                            <span className="flex items-center gap-0.5 text-ono-orange">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              טרם התחבר
                            </span>
                          )}
                          {isDeleted && user.deleted_at && (
                            <span className="flex items-center gap-0.5 text-red-500">
                              <Trash2 className="w-2.5 h-2.5" />
                              נמחק {new Date(user.deleted_at).toLocaleDateString('he-IL')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Re-invite button for users who never logged in */}
                      {hasNeverLoggedIn(user) && user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReInvite(user)}
                          disabled={reinviting === user.id}
                          title="שלח הזמנה חוזרת"
                        >
                          <RefreshCw className={`w-4 h-4 text-blue-500 ${reinviting === user.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      {/* Activity log link */}
                      <Link href={`/activity?user=${user.id}`} title="צפה בפעילות המשתמש" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground">
                        <ScrollText className="w-4 h-4 text-ono-gray" />
                      </Link>
                      {!isDeleted && user.id !== currentUserId && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} title="ערוך הרשאות">
                            <Shield className="w-4 h-4 text-ono-gray" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id, user.is_active !== false)} title={user.is_active !== false ? 'השבת' : 'הפעל'}>
                            {user.is_active !== false ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-ono-green" />}
                          </Button>
                          {/* Only users without can_manage_users can be deleted */}
                          {!user.permissions?.can_manage_users && user.role !== 'admin' && (
                            <Button variant="ghost" size="sm" onClick={() => { setDeleteUser(user); setDeleteError(''); }} title="מחק משתמש">
                              <UserMinus className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </>
                      )}
                      {/* Deleted users can be re-invited */}
                      {isDeleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInviteEmail(user.email || '');
                            setInvitePermissions(user.permissions || { ...DEFAULT_PERMISSIONS });
                            setShowInviteModal(true);
                            setInviteError('');
                            setInviteSuccess('');
                            setInviteLink('');
                          }}
                          title="הזמן מחדש"
                          className="text-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5 ml-1" />
                          הזמן מחדש
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Upload Tokens Section */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-ono-green" />
            <h2 className="text-lg font-bold text-ono-gray-dark">קישורי העלאה חיצוניים</h2>
            <InfoTooltip text="צרו קישורים שמאפשרים לגורמים חיצוניים (מעצבים, פרילנסרים) להעלות חומרים ישירות למערכת ללא צורך בחשבון." />
          </div>
          <Button onClick={() => setShowTokenModal(true)} className="bg-ono-green hover:bg-ono-green-dark text-white" size="sm">
            <Plus className="w-4 h-4 ml-1" />
            צור קישור
          </Button>
        </div>
        <p className="text-sm text-ono-gray mb-4">
          קישורים אלו מאפשרים לגורמים חיצוניים (מעצבים, פרילנסרים) להעלות חומרים ללא כניסה למערכת.
        </p>
        {loading ? (
          <p className="text-ono-gray text-sm">טוען...</p>
        ) : tokens.length === 0 ? (
          <p className="text-ono-gray text-sm text-center py-4">אין קישורי העלאה פעילים</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((tk) => {
              const isExpired = new Date(tk.expires_at) < new Date();
              const isActive = !tk.is_revoked && !isExpired;
              return (
                <div key={tk.id} className={`flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg ${!isActive ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ono-gray-dark">{tk.slugs?.display_name}</span>
                      {tk.initiatives && <span className="text-xs text-ono-gray">· {tk.initiatives.name}</span>}
                    </div>
                    <p className="text-xs text-ono-gray">תוקף: {new Date(tk.expires_at).toLocaleDateString('he-IL')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Badge className="bg-ono-green-light text-ono-green-dark text-xs">פעיל</Badge>
                    ) : tk.is_revoked ? (
                      <Badge className="bg-ono-gray-light text-ono-gray text-xs">בוטל</Badge>
                    ) : (
                      <Badge className="bg-ono-orange-light text-ono-orange text-xs">פג תוקף</Badge>
                    )}
                    {isActive && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => copyTokenLink(tk.token)}>
                          <Copy className="w-4 h-4" />
                          {copiedToken === tk.token && <span className="text-xs text-ono-green mr-1">הועתק!</span>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRevokeToken(tk.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-ono-green" /> הזמן משתמש חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="flex items-center gap-1">כתובת מייל * <InfoTooltip text="כתובת המייל שתשמש לכניסה למערכת. המשתמש יקבל קישור לקביעת סיסמה." /></Label>
              <Input dir="ltr" className="mt-1 text-left" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 flex items-center gap-1">הרשאות <InfoTooltip text="הגדירו מה המשתמש יוכל לעשות במערכת." /></Label>
              <div className="space-y-2">
                {PERMISSION_DEFS.map(perm => {
                  const Icon = PERM_ICONS[perm.key] || Eye;
                  return (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={invitePermissions[perm.key] === true}
                        onCheckedChange={v => setInvitePermissions(p => ({ ...p, [perm.key]: !!v }))}
                      />
                      <Icon className="w-4 h-4 text-ono-gray" />
                      <div>
                        <span className="text-sm">{perm.label}</span>
                        <span className="text-[10px] text-ono-gray mr-1">— {perm.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            {inviteError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inviteError}</p>}
            {inviteSuccess && (
              <div className="space-y-2">
                <p className="text-sm text-ono-green-dark bg-ono-green-light p-2 rounded">{inviteSuccess}</p>
                {inviteLink && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-medium mb-2">שלח את הקישור הבא למשתמש:</p>
                    <div className="flex items-center gap-2">
                      <Input dir="ltr" readOnly value={inviteLink} className="text-xs text-left bg-white flex-1" onClick={copyInviteLink} />
                      <Button size="sm" variant="outline" onClick={copyInviteLink} className="shrink-0">
                        <Copy className="w-3.5 h-3.5 ml-1" />
                        {copiedInviteLink ? 'הועתק!' : 'העתק'}
                      </Button>
                    </div>
                    <p className="text-[10px] text-blue-600 mt-1.5">הקישור הזה חד-פעמי. המשתמש ילחץ עליו ויגדיר סיסמה.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteModal(false); setInviteLink(''); setInviteSuccess(''); }}>
              {inviteLink ? 'סגור' : 'ביטול'}
            </Button>
            {!inviteLink && (
              <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail} className="bg-ono-green hover:bg-ono-green-dark text-white">
                {inviting ? 'שולח...' : 'הזמן משתמש'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-ono-green" /> עריכת הרשאות — {editUser?.display_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">הרשאות</Label>
              <div className="space-y-2">
                {PERMISSION_DEFS.map(perm => {
                  const Icon = PERM_ICONS[perm.key] || Eye;
                  return (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editPermissions[perm.key] === true}
                        onCheckedChange={v => setEditPermissions(p => ({ ...p, [perm.key]: !!v }))}
                      />
                      <Icon className="w-4 h-4 text-ono-gray" />
                      <div>
                        <span className="text-sm">{perm.label}</span>
                        <span className="text-[10px] text-ono-gray mr-1">— {perm.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>ביטול</Button>
            <Button onClick={handleSaveUser} disabled={editSaving} className="bg-ono-green hover:bg-ono-green-dark text-white">
              {editSaving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Token Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>צור קישור העלאה חיצוני</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {workspaces.length > 1 && (
              <div>
                <Label>סביבת עבודה</Label>
                <select value={tokenWorkspace} onChange={(e) => setTokenWorkspace(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label>סלאג *</Label>
              <select value={tokenSlug} onChange={(e) => { setTokenSlug(e.target.value); setTokenInitiative(''); }} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="">בחר סלאג...</option>
                {slugs.filter((s) => !s.is_archived).map((s) => <option key={s.id} value={s.id}>{s.display_name} ({s.slug})</option>)}
              </select>
            </div>
            <div>
              <Label>מהלך (אופציונלי)</Label>
              <select value={tokenInitiative} onChange={(e) => setTokenInitiative(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1" disabled={!tokenSlug}>
                <option value="">ללא מהלך</option>
                {filteredInitiatives.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.short_code})</option>)}
              </select>
            </div>
            <div>
              <Label>תוקף (ימים)</Label>
              <Input type="number" className="mt-1" value={tokenExpiresDays} onChange={(e) => setTokenExpiresDays(e.target.value)} min="1" max="365" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenModal(false)}>ביטול</Button>
            <Button onClick={handleCreateToken} disabled={saving || !tokenSlug} className="bg-ono-green hover:bg-ono-green-dark text-white">
              {saving ? 'יוצר...' : 'צור קישור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת משתמש
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-ono-gray-dark">
              האם אתה בטוח שברצונך למחוק את <strong>{deleteUser?.display_name || deleteUser?.email}</strong>?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium mb-1">מה יקרה:</p>
              <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>המשתמש לא יוכל להתחבר למערכת</li>
                <li>ההיסטוריה שלו תישמר ביומן הפעילות</li>
                <li>ניתן יהיה להזמין אותו מחדש בעתיד</li>
                <li>חומרים שהועלו על ידו יישארו במערכת</li>
              </ul>
            </div>
            {deleteError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>ביטול</Button>
            <Button onClick={handleDeleteUser} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'מוחק...' : 'מחק משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
