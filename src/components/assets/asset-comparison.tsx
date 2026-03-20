'use client';

import { useState, useMemo } from 'react';
import { ArrowLeftRight, Image as ImageIcon, FileText, Film, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PLATFORMS } from '@/lib/platform-specs';

interface ComparisonAsset {
  id: string;
  original_filename: string;
  stored_filename: string;
  width?: number;
  height?: number;
  file_size: number;
  mime_type: string;
  platforms?: string[];
  drive_view_url?: string;
}

export interface AssetComparisonProps {
  open: boolean;
  onClose: () => void;
  assets: ComparisonAsset[];
  initialLeftId?: string;
  initialRightId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-12 h-12 text-ono-green" />;
  if (mimeType.startsWith('video/')) return <Film className="w-12 h-12 text-platform-meta" />;
  if (mimeType === 'application/pdf') return <FileText className="w-12 h-12 text-platform-google" />;
  return <File className="w-12 h-12 text-ono-gray" />;
}

function AssetPanel({
  asset,
  assets,
  onSelect,
  label,
}: {
  asset: ComparisonAsset | undefined;
  assets: ComparisonAsset[];
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Selector */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-ono-gray dark:text-ono-gray-light mb-1">
          {label}
        </label>
        <Select value={asset?.id ?? ''} onValueChange={onSelect}>
          <SelectTrigger className="w-full text-sm bg-white dark:bg-gray-800 border-[#E8E8E8] dark:border-gray-600">
            <SelectValue placeholder="בחר חומר..." />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.stored_filename || a.original_filename}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="aspect-video bg-ono-gray-light dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden border border-[#E8E8E8] dark:border-gray-600">
        {asset ? (
          asset.drive_view_url && asset.mime_type.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.drive_view_url}
              alt={asset.original_filename}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <AssetTypeIcon mimeType={asset.mime_type} />
          )
        ) : (
          <p className="text-sm text-ono-gray dark:text-gray-500">בחר חומר להשוואה</p>
        )}
      </div>

      {/* Metadata */}
      {asset && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-ono-gray-dark dark:text-gray-200 truncate" title={asset.original_filename}>
            {asset.stored_filename || asset.original_filename}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ono-gray dark:text-gray-400">
            {asset.width && asset.height && (
              <span>{asset.width} x {asset.height} px</span>
            )}
            <span>{formatFileSize(asset.file_size)}</span>
            <span className="uppercase">{asset.mime_type.split('/').pop()}</span>
          </div>
          {asset.platforms && asset.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {asset.platforms.map((p) => {
                const plat = PLATFORMS.find((pl) => pl.value === p);
                return plat ? (
                  <Badge
                    key={p}
                    style={{ backgroundColor: `${plat.color}15`, color: plat.color }}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {plat.label}
                  </Badge>
                ) : (
                  <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                    {p}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AssetComparison({
  open,
  onClose,
  assets,
  initialLeftId,
  initialRightId,
}: AssetComparisonProps) {
  const [leftId, setLeftId] = useState<string>(initialLeftId ?? assets[0]?.id ?? '');
  const [rightId, setRightId] = useState<string>(initialRightId ?? assets[1]?.id ?? '');

  const leftAsset = useMemo(() => assets.find((a) => a.id === leftId), [assets, leftId]);
  const rightAsset = useMemo(() => assets.find((a) => a.id === rightId), [assets, rightId]);

  const handleSwap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-[#E8E8E8] dark:border-gray-700 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.07)]"
      >
        <DialogHeader>
          <DialogTitle className="text-ono-gray-dark dark:text-gray-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-ono-green" />
            השוואת חומרים
          </DialogTitle>
        </DialogHeader>

        {assets.length < 2 ? (
          <p className="text-center text-ono-gray dark:text-gray-400 py-8 text-sm">
            נדרשים לפחות 2 חומרים כדי להשוות
          </p>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {/* Left panel */}
            <AssetPanel
              asset={leftAsset}
              assets={assets}
              onSelect={setLeftId}
              label="חומר א׳"
            />

            {/* Swap button */}
            <div className="flex md:flex-col items-center justify-center shrink-0">
              <button
                onClick={handleSwap}
                className="p-2 rounded-full border border-[#E8E8E8] dark:border-gray-600 hover:border-ono-green hover:bg-ono-green/5 transition-colors"
                title="החלף צדדים"
              >
                <ArrowLeftRight className="w-4 h-4 text-ono-gray dark:text-gray-400" />
              </button>
            </div>

            {/* Right panel */}
            <AssetPanel
              asset={rightAsset}
              assets={assets}
              onSelect={setRightId}
              label="חומר ב׳"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
