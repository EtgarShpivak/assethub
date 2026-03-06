'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { PLATFORM_SPECS, PLATFORM_LABELS } from '@/lib/platform-specs';
import { useTranslation } from '@/lib/i18n/provider';
import type { Asset } from '@/lib/types';

interface PlatformSuggestionProps {
  asset: Asset;
  onDismiss: () => void;
}

interface Match {
  platform: string;
  format: string;
  dims: string;
  exact: boolean;
}

function findPlatformMatches(width: number | null, height: number | null): Match[] {
  if (!width || !height) return [];
  const dims = `${width}×${height}`;
  const matches: Match[] = [];

  for (const [platform, formats] of Object.entries(PLATFORM_SPECS)) {
    for (const format of formats) {
      if (format.dims === dims) {
        matches.push({
          platform,
          format: format.name,
          dims: format.dims,
          exact: true,
        });
      }
    }
  }

  // If no exact matches, find closest aspect ratio matches
  if (matches.length === 0 && width > 0 && height > 0) {
    const ratio = width / height;
    for (const [platform, formats] of Object.entries(PLATFORM_SPECS)) {
      for (const format of formats) {
        const [fw, fh] = format.dims.split('×').map(Number);
        if (fw && fh) {
          const formatRatio = fw / fh;
          if (Math.abs(ratio - formatRatio) < 0.05) {
            matches.push({
              platform,
              format: format.name,
              dims: format.dims,
              exact: false,
            });
          }
        }
      }
    }
  }

  return matches;
}

export function PlatformSuggestion({ asset, onDismiss }: PlatformSuggestionProps) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();
  const matches = findPlatformMatches(asset.width_px, asset.height_px);

  if (dismissed || matches.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="bg-gradient-to-l from-blue-50 to-white border border-blue-200 rounded-lg p-3 mt-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-blue-700">{t('assets.platformSuggestion')}</span>
        </div>
        <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {matches.slice(0, 3).map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              m.exact ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {m.exact ? t('assets.bestFit') : '~'}
            </span>
            <span className="text-ono-gray-dark font-medium">
              {PLATFORM_LABELS[m.platform] || m.platform}
            </span>
            <span className="text-ono-gray">
              {m.format} ({m.dims})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Auto-classify suggestion shown after upload
export function ClassifySuggestion({
  asset,
  onAccept,
  onDismiss,
}: {
  asset: Asset;
  onAccept: (platforms: string[]) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const matches = findPlatformMatches(asset.width_px, asset.height_px);
  const exactMatches = matches.filter(m => m.exact);

  if (exactMatches.length === 0) return null;

  const platforms = Array.from(new Set(exactMatches.map(m => m.platform)));

  return (
    <div className="bg-gradient-to-l from-ono-green-light to-white border border-ono-green rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-ono-green" />
            <span className="text-xs font-bold text-ono-gray-dark">{t('assets.classifySuggestion')}</span>
          </div>
          <p className="text-xs text-ono-gray">
            {asset.dimensions_label} — {t('assets.addPlatformTag')}
          </p>
          <div className="flex gap-1 mt-1">
            {platforms.map(p => (
              <span key={p} className="text-[10px] bg-white border border-ono-green px-1.5 py-0.5 rounded">
                {PLATFORM_LABELS[p] || p}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onAccept(platforms)}
            className="text-xs bg-ono-green text-white px-2 py-1 rounded hover:bg-ono-green-dark"
          >
            {t('assets.accept')}
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-ono-gray hover:text-ono-gray-dark px-2 py-1"
          >
            {t('assets.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
