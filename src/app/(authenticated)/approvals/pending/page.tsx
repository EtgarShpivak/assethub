'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, Users,
  Image as ImageIcon, ExternalLink
} from 'lucide-react';
import type { ApprovalRound, ApprovalReviewer } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
    approved: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    changes_requested: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {t(`approval.status.${status}` as 'approval.status.pending')}
    </span>
  );
}

export default function PendingMyApprovalPage() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<ApprovalRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/approvals/pending')
      .then(r => r.json())
      .then(data => setRounds(data.rounds || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-6 h-6 text-ono-green" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">{t('nav.pendingMyApproval')}</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ono-gray">{t('common.loading')}</div>
      ) : rounds.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-ono-gray">{t('approval.noPending')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map(round => {
            const reviewers = (round.approval_reviewers || []) as ApprovalReviewer[];
            const assetCount = round.approval_round_assets?.length || 0;
            const approvedCount = reviewers.filter(r => r.status === 'approved').length;
            const myStatus = round.my_status || 'pending';
            const myToken = round.my_token;

            return (
              <div
                key={round.id}
                className="bg-white border border-[#E8E8E8] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-ono-gray-dark truncate">{round.title}</h3>
                      <StatusBadge status={round.status} />
                    </div>
                    {round.description && (
                      <p className="text-sm text-ono-gray truncate mb-2">{round.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-ono-gray mb-2">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {assetCount} {t('approval.assets')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {approvedCount}/{reviewers.length} {t('approval.approved')}
                      </span>
                      <span>{t('approval.round')} {round.current_round_number}</span>
                    </div>

                    {/* My status */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ono-gray">{t('approval.status.pending') === t('approval.status.pending') ? 'הסטטוס שלי:' : 'My status:'}</span>
                      <StatusBadge status={myStatus} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {myToken && (
                      <a
                        href={`/approve/${myToken}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-ono-green text-white text-sm font-medium rounded-lg hover:bg-ono-green-dark transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {myStatus === 'pending' ? t('approval.viewRound') : t('approval.changeResponse')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
