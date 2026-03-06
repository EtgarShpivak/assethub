'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, Users, Upload, Calendar, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityHeatmap } from '@/components/reports/activity-heatmap';
import { useTranslation } from '@/lib/i18n/provider';

interface MonthlyData {
  month: string;
  uploads: number;
  downloads: number;
  views: number;
  other: number;
}

interface ReportData {
  monthly: MonthlyData[];
  summary: { totalUploads: number; totalDownloads: number; activeUsers: number };
  topUsers: { name: string; count: number }[];
  topAssets: { name: string; count: number }[];
  heatmap: Record<number, Record<number, number>>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/reports/monthly')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (exportDateFrom) params.set('date_from', exportDateFrom);
    if (exportDateTo) params.set('date_to', exportDateTo);

    const res = await fetch(`/api/reports/export?${params}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-ono-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ono-gray-dark flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-ono-green" />
          {t('reports.title')}
        </h1>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5 text-center">
            <Upload className="w-6 h-6 text-ono-green mx-auto mb-2" />
            <p className="text-3xl font-bold text-ono-gray-dark">{data.summary.totalUploads}</p>
            <p className="text-xs text-ono-gray">{t('reports.totalUploads')}</p>
          </div>
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5 text-center">
            <Download className="w-6 h-6 text-platform-meta mx-auto mb-2" />
            <p className="text-3xl font-bold text-ono-gray-dark">{data.summary.totalDownloads}</p>
            <p className="text-xs text-ono-gray">{t('reports.totalDownloads')}</p>
          </div>
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5 text-center">
            <Users className="w-6 h-6 text-ono-orange mx-auto mb-2" />
            <p className="text-3xl font-bold text-ono-gray-dark">{data.summary.activeUsers}</p>
            <p className="text-xs text-ono-gray">{t('reports.activeUsers')}</p>
          </div>
        </div>
      )}

      {/* Monthly bar chart */}
      {data?.monthly && data.monthly.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
          <h3 className="text-sm font-bold text-ono-gray-dark mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ono-green" />
            {t('reports.byMonth')}
          </h3>
          <div className="space-y-3">
            {data.monthly.map(m => {
              const total = m.uploads + m.downloads + m.views + m.other;
              const maxTotal = Math.max(...data.monthly.map(d => d.uploads + d.downloads + d.views + d.other), 1);
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-ono-gray w-16 shrink-0">{m.month}</span>
                  <div className="flex-1 flex h-5 rounded overflow-hidden">
                    {m.uploads > 0 && (
                      <div
                        className="bg-ono-green h-full"
                        style={{ width: `${(m.uploads / maxTotal) * 100}%` }}
                        title={`${t('reports.totalUploads')}: ${m.uploads}`}
                      />
                    )}
                    {m.downloads > 0 && (
                      <div
                        className="bg-platform-meta h-full"
                        style={{ width: `${(m.downloads / maxTotal) * 100}%` }}
                        title={`${t('reports.totalDownloads')}: ${m.downloads}`}
                      />
                    )}
                    {(m.views + m.other) > 0 && (
                      <div
                        className="bg-ono-gray-light h-full"
                        style={{ width: `${((m.views + m.other) / maxTotal) * 100}%` }}
                        title={`Other: ${m.views + m.other}`}
                      />
                    )}
                  </div>
                  <span className="text-xs text-ono-gray w-10 text-left">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ono-green" /> {t('reports.totalUploads')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-platform-meta" /> {t('reports.totalDownloads')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ono-gray-light" /> {t('dashboard.other')}</span>
          </div>
        </div>
      )}

      {/* Heat map */}
      {data?.heatmap && <ActivityHeatmap data={data.heatmap} />}

      {/* Top users & assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data?.topUsers && data.topUsers.length > 0 && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
            <h3 className="text-sm font-bold text-ono-gray-dark mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-ono-green" />
              {t('reports.topUsers')}
            </h3>
            <div className="space-y-2">
              {data.topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ono-gray-dark">{u.name}</span>
                  <span className="text-ono-gray">{u.count} פעולות</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data?.topAssets && data.topAssets.length > 0 && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
            <h3 className="text-sm font-bold text-ono-gray-dark mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-ono-green" />
              {t('reports.topAssets')}
            </h3>
            <div className="space-y-2">
              {data.topAssets.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ono-gray-dark truncate max-w-[200px]">{a.name}</span>
                  <span className="text-ono-gray">{a.count} {t('dashboard.downloads')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export section */}
      <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
        <h3 className="text-sm font-bold text-ono-gray-dark mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-ono-green" />
          {t('reports.export')}
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-ono-gray">{t('reports.from')}</label>
            <input
              type="date"
              value={exportDateFrom}
              onChange={e => setExportDateFrom(e.target.value)}
              className="text-xs border border-[#E8E8E8] rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ono-gray">{t('reports.to')}</label>
            <input
              type="date"
              value={exportDateTo}
              onChange={e => setExportDateTo(e.target.value)}
              className="text-xs border border-[#E8E8E8] rounded px-2 py-1"
            />
          </div>
          <Button onClick={handleExport} size="sm" className="bg-ono-green hover:bg-ono-green-dark text-white">
            <Download className="w-4 h-4 ml-1" />
            {t('reports.export')}
          </Button>
        </div>
      </div>
    </div>
  );
}
