'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/provider';
import type { Asset } from '@/lib/types';

interface SimilarAssetsProps {
  assetId: string;
  onSelect: (asset: Asset) => void;
}

export function SimilarAssets({ assetId, onSelect }: SimilarAssetsProps) {
  const [similar, setSimilar] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    fetch(`/api/assets?similar_to=${assetId}&limit=6`)
      .then(r => r.json())
      .then(data => setSimilar(data.assets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading || similar.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-ono-gray-dark flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-ono-green" aria-hidden="true" />
        {t('assets.similarAssets')}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {similar.map(asset => (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className="shrink-0 w-28 border border-[#E8E8E8] rounded-lg p-2 hover:border-ono-green transition-colors"
          >
            <div className="aspect-square bg-ono-gray-light rounded-md flex items-center justify-center overflow-hidden mb-1">
              {asset.drive_view_url && asset.file_type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.drive_view_url} alt={asset.original_filename || asset.stored_filename || 'asset thumbnail'} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xs text-ono-gray">{asset.file_type}</span>
              )}
            </div>
            <p className="text-[10px] text-ono-gray-dark truncate">
              {asset.stored_filename || asset.original_filename}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
