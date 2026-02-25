'use client';

import { useEffect, useState } from 'react';
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
  Filter,
  CheckCircle,
  XCircle,
  Mail,
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
import type { Slug, Initiative, UserProfile } from '@/lib/types';

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

const ROLE_LABELS: Record<string, string> = {
  admin: 'מנהל מערכת',
  initiative_manager: 'מנהל מהלכים',
  media_buyer: 'קונה מדיה',
  viewer: 'צופה',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-ono-green-light text-ono-green-dark',
  initiative_manager: 'bg-blue-50 text-blue-700',
  media_buyer: 'bg-purple-50 text-purple-700',
  viewer: 'bg-ono-gray-light text-ono-gray',
};

export default function SettingsPage() {
  const [tokens, setTokens] = useState<UploadTokenEntry[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Current user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  // Users management
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [invitePermissions, setInvitePermissions] = useState({
    can_upload: false,
    can_view: true,
    can_manage_initiatives: false,
    can_view_filtered: false,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Edit user modal
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editPermissions, setEditPermissions] = useState({
    can_upload: false,
    can_view: true,
    can_manage_initiatives: false,
    can_view_filtered: false,
  });
  const [editSaving, setEditSaving] = useState(false);

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

  const fetchData = () => {
    const promises: Promise<unknown>[] = [
      fetch('/api/upload-tokens').then((r) => r.json()),
      fetch('/api/slugs').then((r) => r.json()),
      fetch('/api/initiatives').then((r) => r.json()),
      fetch('/api/workspaces').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ];

    Promise.all(promises).then(([tk, sl, ini, ws, usr]) => {
      setTokens(tk as UploadTokenEntry[]);
      setSlugs(sl as Slug[]);
      setInitiatives(ini as Initiative[]);
      setWorkspaces(ws as { id: string; name: string }[]);
      const usersList = Array.isArray(usr) ? (usr as UserProfile[]) : [];
      setUsers(usersList);
      if (currentUserId) {
        const me = usersList.find(u => u.id === currentUserId);
        if (me) setCurrentUser(me);
      }
      if ((ws as { id: string }[]).length > 0 && !tokenWorkspace) setTokenWorkspace((ws as { id: string }[])[0].id);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (currentUserId) fetchData();
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      method: 'POST',
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

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
          invited_by: currentUserId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'שגיאה בהזמנה');
      } else {
        setInviteSuccess(`המשתמש ${inviteEmail} ${data.updated ? 'עודכן' : 'הוזמן'} בהצלחה`);
        setInviteEmail('');
        fetchData();
      }
    } catch {
      setInviteError('שגיאה בהזמנת המשתמש');
    }
    setInviting(false);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditPermissions({
      can_upload: user.permissions?.can_upload || false,
      can_view: user.permissions?.can_view !== false,
      can_manage_initiatives: user.permissions?.can_manage_initiatives || false,
      can_view_filtered: user.permissions?.can_view_filtered || false,
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
        role: editRole,
        permissions: editPermissions,
      }),
    });
    setEditSaving(false);
    setEditUser(null);
    fetchData();
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_active: !isActive }),
    });
    fetchData();
  };

  const filteredInitiatives = tokenSlug
    ? initiatives.filter((i) => i.slug_id === tokenSlug)
    : initiatives;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">הגדרות</h1>
        {currentUser && (
          <Badge className={`${ROLE_COLORS[currentUser.role]} text-xs`}>
            {ROLE_LABELS[currentUser.role]}
          </Badge>
        )}
      </div>

      {/* Users Management Section (Admin only) */}
      {isAdmin && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-ono-green" />
              <h2 className="text-lg font-bold text-ono-gray-dark">ניהול משתמשים</h2>
              <Badge variant="outline" className="text-xs">{users.length}</Badge>
            </div>
            <Button onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(''); }} className="bg-ono-green hover:bg-ono-green-dark text-white" size="sm">
              <UserPlus className="w-4 h-4 ml-1" />
              הזמן משתמש
            </Button>
          </div>

          <p className="text-sm text-ono-gray mb-4">
            ניהול משתמשים, תפקידים והרשאות. אדמין יכול להזמין משתמשים חדשים, לנהל סלאגים ולבצע כל פעולה.
          </p>

          <div className="space-y-2">
            {loading ? (
              <p className="text-ono-gray text-sm">טוען...</p>
            ) : users.length === 0 ? (
              <p className="text-ono-gray text-sm text-center py-4">אין משתמשים</p>
            ) : (
              users.map(user => (
                <div key={user.id} className={`flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg ${user.is_active === false ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ono-green-light flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-ono-green-dark">
                        {(user.display_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ono-gray-dark">{user.display_name || user.email}</span>
                        <Badge className={`${ROLE_COLORS[user.role] || ROLE_COLORS.viewer} text-[10px] px-1.5`}>{ROLE_LABELS[user.role] || user.role}</Badge>
                        {user.id === currentUserId && <Badge className="bg-ono-orange-light text-ono-orange text-[10px] px-1.5">אתה</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ono-gray mt-0.5">
                        {user.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{user.email}</span>}
                        {user.permissions?.can_upload && <span className="flex items-center gap-0.5"><Upload className="w-2.5 h-2.5" />העלאה</span>}
                        {user.permissions?.can_view && <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />צפייה</span>}
                        {user.permissions?.can_manage_initiatives && <span className="flex items-center gap-0.5"><Megaphone className="w-2.5 h-2.5" />מהלכים</span>}
                        {user.permissions?.can_view_filtered && <span className="flex items-center gap-0.5"><Filter className="w-2.5 h-2.5" />מסונן</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user.is_active !== false ? (
                      <Badge className="bg-ono-green-light text-ono-green-dark text-[10px]">פעיל</Badge>
                    ) : (
                      <Badge className="bg-ono-gray-light text-ono-gray text-[10px]">מושבת</Badge>
                    )}
                    {user.id !== currentUserId && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} title="ערוך הרשאות">
                          <Shield className="w-4 h-4 text-ono-gray" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user.id, user.is_active !== false)} title={user.is_active !== false ? 'השבת' : 'הפעל'}>
                          {user.is_active !== false ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-ono-green" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
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
              <Label>כתובת מייל *</Label>
              <Input dir="ltr" className="mt-1 text-left" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label>תפקיד</Label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="viewer">צופה</option>
                <option value="media_buyer">קונה מדיה</option>
                <option value="initiative_manager">מנהל מהלכים</option>
                <option value="admin">מנהל מערכת</option>
              </select>
            </div>
            <div>
              <Label className="mb-2 block">הרשאות</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={invitePermissions.can_view} onCheckedChange={v => setInvitePermissions(p => ({ ...p, can_view: !!v }))} />
                  <Eye className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">צפייה בקבצים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={invitePermissions.can_upload} onCheckedChange={v => setInvitePermissions(p => ({ ...p, can_upload: !!v }))} />
                  <Upload className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">העלאת קבצים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={invitePermissions.can_manage_initiatives} onCheckedChange={v => setInvitePermissions(p => ({ ...p, can_manage_initiatives: !!v }))} />
                  <Megaphone className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">ניהול מהלכים שיווקיים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={invitePermissions.can_view_filtered} onCheckedChange={v => setInvitePermissions(p => ({ ...p, can_view_filtered: !!v }))} />
                  <Filter className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">צפייה מסוננת בלבד (לפי חיתוך מתקדם)</span>
                </label>
              </div>
            </div>
            {inviteError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{inviteError}</p>}
            {inviteSuccess && <p className="text-sm text-ono-green-dark bg-ono-green-light p-2 rounded">{inviteSuccess}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>ביטול</Button>
            <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail} className="bg-ono-green hover:bg-ono-green-dark text-white">
              {inviting ? 'שולח...' : 'הזמן משתמש'}
            </Button>
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
              <Label>תפקיד</Label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full border border-[#E8E8E8] rounded-md p-2 text-sm mt-1">
                <option value="viewer">צופה</option>
                <option value="media_buyer">קונה מדיה</option>
                <option value="initiative_manager">מנהל מהלכים</option>
                <option value="admin">מנהל מערכת</option>
              </select>
            </div>
            <div>
              <Label className="mb-2 block">הרשאות</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={editPermissions.can_view} onCheckedChange={v => setEditPermissions(p => ({ ...p, can_view: !!v }))} />
                  <Eye className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">צפייה בקבצים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={editPermissions.can_upload} onCheckedChange={v => setEditPermissions(p => ({ ...p, can_upload: !!v }))} />
                  <Upload className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">העלאת קבצים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={editPermissions.can_manage_initiatives} onCheckedChange={v => setEditPermissions(p => ({ ...p, can_manage_initiatives: !!v }))} />
                  <Megaphone className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">ניהול מהלכים שיווקיים</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={editPermissions.can_view_filtered} onCheckedChange={v => setEditPermissions(p => ({ ...p, can_view_filtered: !!v }))} />
                  <Filter className="w-4 h-4 text-ono-gray" />
                  <span className="text-sm">צפייה מסוננת בלבד</span>
                </label>
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
    </div>
  );
}
