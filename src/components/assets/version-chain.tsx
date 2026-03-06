'use client';

import { useState, useEffect } from 'react';
import { Layers, Calendar, User, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/provider';
import type { Asset } from '@/lib/types';

interface VersionChainProps {
  asset: Asset;
  onSelectVersion: (asset: Asset) => void;
}

export function VersionChain({ asset, onSelectVersion }: VersionChainProps) {
  const [versions, setVersions] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const parentId = asset.parent_asset_id || asset.id;
    setLoading(true);
    fetch(`/api/assets?parent_asset_id=${parentId}&limit=50&sort_by=upload_date&sort_dir=asc`)
      .then(r => r.json())
      .then(data => {
        const allAssets: Asset[] = data.assets || [];
        const chain = allAssets.sort((a, b) => (a.version || 1) - (b.version || 1));
        setVersions(chain.length > 1 ? chain : []);
      })
      .catch((err) => console.warn('VersionChain fetch error:', err))
      .finally(() => setLoading(false));
  }, [asset.id, asset.parent_asset_id]);

  if (loading || versions.length === 0) return null;

  return (
    <div className="border border-[#E8E8E8] rounded-lg p-3 mt-3">
      <h4 className="text-xs font-bold text-ono-gray-dark flex items-center gap-1.5 mb-2">
        <Layers className="w-3.5 h-3.5 text-ono-green" />
        {t('assets.versionHistory')} ({versions.length})
      </h4>
      <div className="space-y-1.5">
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelectVersion(v)}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-right transition-colors ${
              v.id === asset.id
                ? 'bg-ono-green-light border border-ono-green'
                : 'hover:bg-ono-gray-light border border-transparent'
            }`}
          >
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              v.id === asset.id ? 'bg-ono-green text-white' : 'bg-ono-gray-light text-ono-gray-dark'
            }`}>
              v{v.version || 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ono-gray-dark truncate">
                {v.stored_filename || v.original_filename}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-ono-gray">
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(v.upload_date).toLocaleDateString('he-IL')}
                </span>
                {v.uploaded_by_name && (
                  <span className="flex items-center gap-0.5">
                    <User className="w-3 h-3" />
                    {v.uploaded_by_name}
                  </span>
                )}
                {v.file_size_label && (
                  <span className="flex items-center gap-0.5">
                    <FileText className="w-3 h-3" />
                    {v.file_size_label}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
