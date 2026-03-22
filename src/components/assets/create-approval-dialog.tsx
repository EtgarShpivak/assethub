'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import {
  ClipboardCheck, Plus, Trash2, Image as ImageIcon, X, Check, Film, FileText, File as FileIcon
} from 'lucide-react';

interface AssetPreview {
  id: string;
  original_filename: string;
  stored_filename?: string | null;
  file_type: string;
  drive_view_url?: string | null;
  mime_type?: string | null;
}

interface CreateApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedAssetIds?: string[];
  assetData?: AssetPreview[];
  onCreated?: () => void;
}

function AssetThumbnail({ asset }: { asset: AssetPreview }) {
  const name = asset.stored_filename || asset.original_filename;
  if (asset.drive_view_url && asset.file_type === 'image') {
    return (
      <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-gray-600 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.drive_view_url} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  if (asset.drive_view_url && asset.file_type === 'video') {
    return (
      <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-gray-600 shrink-0 relative bg-gray-900">
        <video src={asset.drive_view_url} className="w-full h-full object-cover" muted preload="metadata" />
        <Film className="w-4 h-4 text-white absolute bottom-1 right-1 drop-shadow" />
      </div>
    );
  }
  const Icon = asset.file_type === 'pdf' || asset.file_type === 'newsletter' || asset.file_type === 'brief' ? FileText : FileIcon;
  return (
    <div className="w-16 h-16 rounded-lg border border-[#E8E8E8] dark:border-gray-600 shrink-0 flex items-center justify-center bg-[#FAFAFA] dark:bg-gray-700">
      <Icon className="w-6 h-6 text-ono-gray" />
    </div>
  );
}

export function CreateApprovalDialog({ open, onClose, preSelectedAssetIds = [], assetData, onCreated }: CreateApprovalDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reviewerEmails, setReviewerEmails] = useState<string[]>(['']);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(preSelectedAssetIds);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reviewLinks, setReviewLinks] = useState<{ email: string; url: string }[]>([]);
  const [openLink, setOpenLink] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isOpenLink, setIsOpenLink] = useState(false);
  // User search
  const [userSearch, setUserSearch] = useState('');
  const [systemUsers, setSystemUsers] = useState<{ id: string; email: string; display_name: string | null }[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const { signal } = controller;
    setSelectedAssetIds(preSelectedAssetIds);
    setSuccess(false);
    setReviewLinks([]);
    setOpenLink('');
    setWorkspaceLoading(true);
    fetch('/api/users/me', { signal })
      .then(r => r.json())
      .then(data => { if (!signal.aborted && data.workspace_ids?.length) setWorkspaceId(data.workspace_ids[0]); })
      .catch(() => {})
      .finally(() => { if (!signal.aborted) setWorkspaceLoading(false); });
    fetch('/api/users/search', { signal })
      .then(r => r.json())
      .then(data => { if (!signal.aborted) setSystemUsers(data.users || []); })
      .catch(() => {});
    return () => controller.abort();
  }, [open, preSelectedAssetIds]);

  const handleSubmit = async () => {
    if (!title || !selectedAssetIds.length) return;
    if (!isOpenLink && !reviewerEmails.filter(e => e.trim()).length) return;
    if (!workspaceId) { setErrorMsg('טוען נתוני חשבון — נסה שוב בעוד שנייה'); return; }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          workspace_id: workspaceId,
          asset_ids: selectedAssetIds,
          reviewers: isOpenLink ? [] : reviewerEmails.filter(e => e.trim()).map(email => ({ email: email.trim() })),
          open_link: isOpenLink,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviewLinks(data.review_links || []);
        setOpenLink(data.open_review_url || '');
        setSuccess(true);
        setErrorMsg('');
        onCreated?.();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'שגיאה ביצירת סבב אישור');
      }
    } catch {
      setErrorMsg('שגיאת רשת — נסה שוב');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTitle('');
    setDescription('');
    setReviewerEmails(['']);
    setSelectedAssetIds([]);
    setSuccess(false);
    setReviewLinks([]);
    setOpenLink('');
    setIsOpenLink(false);
    setUserSearch('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const filteredUsers = systemUsers.filter(u =>
    userSearch.length >= 2 && (
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  const addUserAsReviewer = (email: string) => {
    if (!reviewerEmails.includes(email)) {
      const lastEmpty = reviewerEmails.findIndex(e => !e.trim());
      if (lastEmpty >= 0) {
        const updated = [...reviewerEmails];
        updated[lastEmpty] = email;
        setReviewerEmails(updated);
      } else {
        setReviewerEmails(prev => [...prev, email]);
      }
    }
    setUserSearch('');
    setShowUserDropdown(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto mx-4">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ono-gray-dark dark:text-gray-100 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-ono-green" />
              {t('approval.create')}
            </h2>
            <button onClick={handleClose} className="text-ono-gray hover:text-ono-gray-dark dark:text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <ClipboardCheck className="w-12 h-12 text-ono-green mx-auto mb-2" />
                <p className="font-bold text-ono-gray-dark dark:text-gray-100">נשלח בהצלחה!</p>
                <p className="text-sm text-ono-gray dark:text-gray-400 mt-1">העתיקו את הקישורים ושלחו למאשרים</p>
              </div>

              {openLink && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">קישור פתוח:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-800 dark:text-green-300 truncate flex-1 font-mono">{openLink}</span>
                    <button onClick={() => copyToClipboard(openLink)} className="text-ono-green hover:underline text-xs shrink-0">
                      {copiedLink === openLink ? <><Check className="w-3 h-3 inline" /> הועתק!</> : 'העתק'}
                    </button>
                  </div>
                </div>
              )}

              {reviewLinks.length > 0 && (
                <div className="space-y-2">
                  {reviewLinks.map((link, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAFAFA] dark:bg-gray-700 rounded-lg p-3 text-sm">
                      <span className="text-ono-gray-dark dark:text-gray-200">{link.email}</span>
                      <button onClick={() => copyToClipboard(link.url)} className="text-ono-green hover:underline text-xs">
                        {copiedLink === link.url ? '✓ הועתק!' : t('approval.copyLink')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleClose} className="w-full py-2 bg-ono-green text-white rounded-lg font-medium hover:bg-ono-green-dark transition-colors">
                {t('common.close')}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-ono-gray-dark dark:text-gray-200 mb-1">{t('approval.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('approval.titlePlaceholder')}
                  className="w-full border border-[#E8E8E8] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ono-gray-dark dark:text-gray-200 mb-1">{t('approval.description')}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-[#E8E8E8] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none resize-none"
                />
              </div>

              {/* Asset previews */}
              <div>
                <label className="block text-sm font-medium text-ono-gray-dark dark:text-gray-200 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {selectedAssetIds.length} {t('approval.assets')}
                </label>
                {assetData && assetData.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-auto p-2 bg-[#FAFAFA] dark:bg-gray-700/50 rounded-lg border border-[#E8E8E8] dark:border-gray-600">
                    {assetData.filter(a => selectedAssetIds.includes(a.id)).map(asset => (
                      <div key={asset.id} className="flex flex-col items-center gap-1" title={asset.stored_filename || asset.original_filename}>
                        <AssetThumbnail asset={asset} />
                        <span className="text-[10px] text-ono-gray truncate max-w-[64px]">{asset.stored_filename || asset.original_filename}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-ono-gray dark:text-gray-500 bg-[#FAFAFA] dark:bg-gray-700/50 rounded-lg p-3 border border-[#E8E8E8] dark:border-gray-600">
                    {selectedAssetIds.length} חומרים נבחרו
                  </div>
                )}
              </div>

              {/* Open Link Toggle */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOpenLink}
                    onChange={e => setIsOpenLink(e.target.checked)}
                    className="rounded border-gray-300 text-ono-green focus:ring-ono-green"
                  />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">קישור פתוח</span>
                </label>
                <span className="text-xs text-blue-600 dark:text-blue-400">— ללא מאשרים ספציפיים</span>
              </div>

              {!isOpenLink && (
                <div>
                  <label className="block text-sm font-medium text-ono-gray-dark dark:text-gray-200 mb-1">{t('approval.reviewers')}</label>

                  {/* User search */}
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="חפש משתמש..."
                      className="w-full border border-[#E8E8E8] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-[#E8E8E8] dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-auto">
                        {filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => addUserAsReviewer(u.email)}
                            className="w-full text-right px-3 py-2 hover:bg-ono-gray-light dark:hover:bg-gray-600 text-sm border-b border-[#F5F5F5] dark:border-gray-600 last:border-0"
                          >
                            <span className="font-medium text-ono-gray-dark dark:text-gray-200">{u.display_name || u.email.split('@')[0]}</span>
                            <span className="text-xs text-ono-gray mr-2">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {reviewerEmails.map((email, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={e => {
                          const updated = [...reviewerEmails];
                          updated[i] = e.target.value;
                          setReviewerEmails(updated);
                        }}
                        placeholder={t('approval.reviewerEmail')}
                        className="flex-1 border border-[#E8E8E8] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
                      />
                      {reviewerEmails.length > 1 && (
                        <button
                          onClick={() => setReviewerEmails(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setReviewerEmails(prev => [...prev, ''])}
                    className="text-ono-green text-sm hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('approval.addReviewer')}
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3 justify-end pt-2 border-t border-[#E8E8E8] dark:border-gray-600">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-ono-gray hover:text-ono-gray-dark dark:text-gray-400">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || workspaceLoading || !workspaceId || !title || !selectedAssetIds.length || (!isOpenLink && !reviewerEmails.some(e => e.trim()))}
                  className="px-5 py-2 bg-ono-green text-white text-sm font-medium rounded-lg hover:bg-ono-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? t('common.loading') : t('approval.create')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
