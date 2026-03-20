'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import {
  ClipboardCheck, Plus, Users, Image as ImageIcon, Clock,
  CheckCircle2, AlertCircle, XCircle, Copy, Check, Trash2, ExternalLink,
  ChevronDown, ChevronUp, MessageCircle
} from 'lucide-react';
import type { ApprovalRound, ApprovalReviewer } from '@/lib/types';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'changes_requested', 'cancelled'] as const;

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
    approved: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    changes_requested: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <XCircle className="w-3 h-3" /> },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {t(`approval.status.${status}` as 'approval.status.pending')}
    </span>
  );
}

function ReviewerChip({ reviewer }: { reviewer: ApprovalReviewer }) {
  const statusColor = reviewer.status === 'approved' ? 'border-green-400 bg-green-50' :
    reviewer.status === 'changes_requested' ? 'border-red-400 bg-red-50' :
    'border-gray-200 bg-gray-50';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusColor}`}>
      {reviewer.display_name || reviewer.email.split('@')[0]}
    </span>
  );
}

function CreateApprovalModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reviewerEmails, setReviewerEmails] = useState<string[]>(['']);
  const [assetSearch, setAssetSearch] = useState('');
  const [assets, setAssets] = useState<{ id: string; original_filename: string; stored_filename: string | null; file_type: string }[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    // Load assets for selection
    fetch('/api/assets?limit=100&sort=upload_date&order=desc')
      .then(r => r.json())
      .then(data => {
        setAssets(data.assets || []);
      });
    // Get workspace
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => {
        if (data.workspace_ids?.length) setWorkspaceId(data.workspace_ids[0]);
      });
  }, [open]);

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
        onCreated();
        onClose();
        setTitle('');
        setDescription('');
        setReviewerEmails(['']);
        setSelectedAssetIds([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const filteredAssets = assets.filter(a =>
    !assetSearch || a.original_filename.toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.stored_filename || '').toLowerCase().includes(assetSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto mx-4">
        <div className="p-6 space-y-5">
          <h2 className="text-lg font-bold text-ono-gray-dark flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-ono-green" />
            {t('approval.create')}
          </h2>

          {/* Title */}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ono-gray-dark mb-1">{t('approval.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none resize-none"
            />
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-ono-gray-dark mb-1">
              {t('approval.selectAssets')} ({selectedAssetIds.length})
            </label>
            <input
              type="text"
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              placeholder={t('assets.search')}
              className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm mb-2 focus:border-ono-green focus:ring-1 focus:ring-ono-green outline-none"
            />
            <div className="max-h-40 overflow-auto border border-[#E8E8E8] rounded-lg">
              {filteredAssets.map(asset => (
                <label key={asset.id} className="flex items-center gap-2 px-3 py-2 hover:bg-ono-gray-light cursor-pointer text-sm border-b border-[#F5F5F5] last:border-0">
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedAssetIds(prev => [...prev, asset.id]);
                      else setSelectedAssetIds(prev => prev.filter(id => id !== asset.id));
                    }}
                    className="rounded border-gray-300 text-ono-green focus:ring-ono-green"
                  />
                  <ImageIcon className="w-4 h-4 text-ono-gray shrink-0" />
                  <span className="truncate">{asset.stored_filename || asset.original_filename}</span>
                  <span className="text-xs text-ono-gray mr-auto">{asset.file_type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reviewers */}
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

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-2 border-t border-[#E8E8E8]">
            <button onClick={onClose} className="px-4 py-2 text-sm text-ono-gray hover:text-ono-gray-dark">
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
        </div>
      </div>
    </div>
  );
}

function RoundCard({ round, onDelete, onRefresh }: {
  round: ApprovalRound;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const reviewers = round.approval_reviewers || [];
  const assetCount = round.approval_round_assets?.length || 0;
  const approvedCount = reviewers.filter(r => r.status === 'approved').length;
  const pendingCount = reviewers.filter(r => r.status === 'pending').length;

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleFinalize = async () => {
    if (!confirm(t('approval.finalizeConfirm'))) return;
    setFinalizing(true);
    try {
      await fetch(`/api/approvals/${round.id}/finalize`, { method: 'POST' });
      onRefresh();
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-ono-gray-dark truncate">{round.title}</h3>
              <StatusBadge status={round.status} />
            </div>
            {round.description && (
              <p className="text-sm text-ono-gray truncate mb-2">{round.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-ono-gray">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> {assetCount} {t('approval.assets')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {approvedCount}/{reviewers.length} {t('approval.approved')}
              </span>
              {pendingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {pendingCount} {t('approval.pending')}
                </span>
              )}
              <span>{t('approval.round')} {round.current_round_number}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {round.status === 'approved' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleFinalize(); }}
                disabled={finalizing}
                className="px-3 py-1.5 bg-ono-green text-white text-xs font-medium rounded-lg hover:bg-ono-green-dark disabled:opacity-50 transition-colors"
              >
                {t('approval.finalize')}
              </button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-ono-gray" /> : <ChevronDown className="w-4 h-4 text-ono-gray" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#E8E8E8] p-4 space-y-3 bg-[#FAFAFA]">
          {/* Reviewers */}
          <div>
            <h4 className="text-xs font-bold text-ono-gray-dark mb-2">{t('approval.reviewers')}</h4>
            <div className="space-y-2">
              {reviewers.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ReviewerChip reviewer={r} />
                    <span className="text-xs text-ono-gray">{r.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyLink(r.token)}
                      className="flex items-center gap-1 text-xs text-ono-green hover:underline"
                    >
                      {copiedToken === r.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedToken === r.token ? t('approval.linkCopied') : t('approval.copyLink')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/approve/${r.token}`;
                        const text = `\u{1F4CB} ${round.title}\n\u05E0\u05D0 \u05DC\u05D1\u05D3\u05D5\u05E7 \u05D5\u05DC\u05D0\u05E9\u05E8:\n${url}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E8E8E8]">
            <a
              href={`/approvals/${round.id}`}
              className="flex items-center gap-1 text-xs text-ono-green hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> {t('approval.viewRound')}
            </a>
            <button
              onClick={() => { if (confirm(t('approval.deleteConfirm'))) onDelete(round.id); }}
              className="flex items-center gap-1 text-xs text-red-500 hover:underline mr-auto"
            >
              <Trash2 className="w-3 h-3" /> {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyApprovalsPage() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<ApprovalRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=${filter}`);
      const data = await res.json();
      setRounds(data.rounds || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/approvals/${id}`, { method: 'DELETE' });
    fetchRounds();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-ono-green" />
          <h1 className="text-2xl font-bold text-ono-gray-dark">{t('nav.myApprovals')}</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-ono-green hover:bg-ono-green-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('approval.create')}
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E8E8E8]">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === s
                ? 'border-ono-green text-ono-green'
                : 'border-transparent text-ono-gray hover:text-ono-gray-dark'
            }`}
          >
            {s === 'all' ? t('dashboard.all') : t(`approval.status.${s}` as 'approval.status.pending')}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-ono-gray">{t('common.loading')}</div>
      ) : rounds.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="w-12 h-12 text-ono-gray/30 mx-auto mb-3" />
          <p className="text-ono-gray">{t('approval.noApprovals')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-ono-green hover:underline text-sm"
          >
            {t('approval.create')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map(round => (
            <RoundCard
              key={round.id}
              round={round}
              onDelete={handleDelete}
              onRefresh={fetchRounds}
            />
          ))}
        </div>
      )}

      <CreateApprovalModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchRounds}
      />
    </div>
  );
}
