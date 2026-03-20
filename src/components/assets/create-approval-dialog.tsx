'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import {
  ClipboardCheck, Plus, Trash2, Image as ImageIcon, X
} from 'lucide-react';

interface CreateApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  preSelectedAssetIds?: string[];
  onCreated?: () => void;
}

export function CreateApprovalDialog({ open, onClose, preSelectedAssetIds = [], onCreated }: CreateApprovalDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reviewerEmails, setReviewerEmails] = useState<string[]>(['']);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(preSelectedAssetIds);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [reviewLinks, setReviewLinks] = useState<{ email: string; url: string }[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedAssetIds(preSelectedAssetIds);
      fetch('/api/users/me')
        .then(r => r.json())
        .then(data => {
          if (data.workspace_ids?.length) setWorkspaceId(data.workspace_ids[0]);
        });
    }
  }, [open, preSelectedAssetIds]);

  const handleSubmit = async () => {
    if (!title || !selectedAssetIds.length || !reviewerEmails.filter(e => e.trim()).length) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          workspace_id: workspaceId,
          asset_ids: selectedAssetIds,
          reviewers: reviewerEmails.filter(e => e.trim()).map(email => ({ email: email.trim() })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviewLinks(data.review_links || []);
        setSuccess(true);
        onCreated?.();
      }
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
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto mx-4">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ono-gray-dark flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-ono-green" />
              {t('approval.create')}
            </h2>
            <button onClick={handleClose} className="text-ono-gray hover:text-ono-gray-dark">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <ClipboardCheck className="w-12 h-12 text-ono-green mx-auto mb-2" />
                <p className="font-bold text-ono-gray-dark">נשלח בהצלחה!</p>
                <p className="text-sm text-ono-gray mt-1">העתיקו את הקישורים ושלחו למאשרים</p>
              </div>
              <div className="space-y-2">
                {reviewLinks.map((link, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#FAFAFA] rounded-lg p-3 text-sm">
                    <span className="text-ono-gray-dark">{link.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(link.url)}
                      className="text-ono-green hover:underline text-xs"
                    >
                      {t('approval.copyLink')}
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2 bg-ono-green text-white rounded-lg font-medium hover:bg-ono-green-dark transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-ono-gray-dark mb-1">{t('approval.title')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('approval.titlePlaceholder')}
                  className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ono-gray-dark mb-1">{t('approval.description')}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-ono-gray">
                <ImageIcon className="w-4 h-4" />
                {selectedAssetIds.length} {t('approval.assets')} {t('approval.status.pending').toLowerCase()}
              </div>

              <div>
                <label className="block text-sm font-medium text-ono-gray-dark mb-1">{t('approval.reviewers')}</label>
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
                      className="flex-1 border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
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

              <div className="flex items-center gap-3 justify-end pt-2 border-t border-[#E8E8E8]">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-ono-gray hover:text-ono-gray-dark">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !title || !selectedAssetIds.length || !reviewerEmails.some(e => e.trim())}
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
