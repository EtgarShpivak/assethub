'use client';

import { useTranslation } from '@/lib/i18n/provider';

interface HeatmapData {
  [day: number]: { [hour: number]: number };
}

interface ActivityHeatmapProps {
  data: HeatmapData;
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { t } = useTranslation();

  const dayNames = [
    t('reports.sunday'),
    t('reports.monday'),
    t('reports.tuesday'),
    t('reports.wednesday'),
    t('reports.thursday'),
    t('reports.friday'),
    t('reports.saturday'),
  ];

  // Find max value for color scaling
  let maxVal = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const val = data[d]?.[h] || 0;
      if (val > maxVal) maxVal = val;
    }
  }

  const getColor = (val: number) => {
    if (val === 0) return 'bg-ono-gray-light';
    const intensity = val / Math.max(maxVal, 1);
    if (intensity < 0.25) return 'bg-green-100';
    if (intensity < 0.5) return 'bg-green-200';
    if (intensity < 0.75) return 'bg-green-400';
    return 'bg-ono-green';
  };

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)] p-5">
      <h3 className="text-sm font-bold text-ono-gray-dark mb-4">{t('reports.heatmapTitle')}</h3>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour headers */}
          <div className="flex gap-[2px] mb-1 mr-20">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-ono-gray">
                {h}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {dayNames.map((dayName, d) => (
            <div key={d} className="flex items-center gap-[2px] mb-[2px]">
              <span className="w-20 text-xs text-ono-gray-dark text-left shrink-0">{dayName}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const val = data[d]?.[h] || 0;
                return (
                  <div
                    key={h}
                    className={`flex-1 h-5 rounded-sm ${getColor(val)} transition-colors`}
                    title={`${dayName} ${h}:00 — ${val} ${t('reports.actions')}`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-center">
            <span className="text-[10px] text-ono-gray">{t('reports.less')}</span>
            <div className="w-4 h-3 rounded-sm bg-ono-gray-light" />
            <div className="w-4 h-3 rounded-sm bg-green-100" />
            <div className="w-4 h-3 rounded-sm bg-green-200" />
            <div className="w-4 h-3 rounded-sm bg-green-400" />
            <div className="w-4 h-3 rounded-sm bg-ono-green" />
            <span className="text-[10px] text-ono-gray">{t('reports.more')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
