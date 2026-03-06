'use client';

import { useState } from 'react';
import { ChevronDown, ChevronLeft, FolderOpen, Megaphone } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/provider';
import type { Slug, Initiative, Asset } from '@/lib/types';

interface TreeViewProps {
  slugs: Slug[];
  initiatives: Initiative[];
  assets: Asset[];
  onFilterBySlug: (slugId: string) => void;
  onFilterByInitiative: (initId: string) => void;
  onSelectAsset?: (asset: Asset) => void;
}

function TreeNode({
  label,
  icon,
  count,
  children,
  onClick,
  defaultOpen = false,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  children?: React.ReactNode;
  onClick?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setOpen(!open);
          if (onClick) onClick();
        }}
        className="flex items-center gap-2 w-full text-right px-2 py-1.5 hover:bg-ono-gray-light rounded-md transition-colors group"
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3.5 h-3.5 text-ono-gray" /> : <ChevronLeft className="w-3.5 h-3.5 text-ono-gray" />
        ) : (
          <span className="w-3.5" />
        )}
        {icon}
        <span className="flex-1 text-xs text-ono-gray-dark truncate">{label}</span>
        {count !== undefined && (
          <span className="text-[10px] text-ono-gray bg-ono-gray-light px-1.5 py-0.5 rounded-full group-hover:bg-white">
            {count}
          </span>
        )}
      </button>
      {open && hasChildren && (
        <div className="mr-4 border-r border-[#E8E8E8]">
          {children}
        </div>
      )}
    </div>
  );
}

export function TreeView({ slugs, initiatives, assets, onFilterBySlug, onFilterByInitiative }: TreeViewProps) {
  const { t } = useTranslation();

  // Group initiatives by slug
  const initsBySlug = new Map<string, Initiative[]>();
  initiatives.forEach(init => {
    const key = init.slug_id || '__no_slug__';
    if (!initsBySlug.has(key)) initsBySlug.set(key, []);
    initsBySlug.get(key)!.push(init);
  });

  // Count assets by slug
  const assetsBySlug = new Map<string, number>();
  assets.forEach(a => {
    const key = a.slug_id || '__no_slug__';
    assetsBySlug.set(key, (assetsBySlug.get(key) || 0) + 1);
  });

  return (
    <div className="space-y-1">
      {slugs.map(slug => {
        const slugInits = initsBySlug.get(slug.id) || [];
        const assetCount = assetsBySlug.get(slug.id) || 0;

        return (
          <TreeNode
            key={slug.id}
            label={slug.display_name}
            icon={<FolderOpen className="w-4 h-4 text-ono-green" />}
            count={assetCount}
            onClick={() => onFilterBySlug(slug.id)}
          >
            {slugInits.map(init => (
              <TreeNode
                key={init.id}
                label={init.name}
                icon={<Megaphone className="w-3.5 h-3.5 text-ono-orange" />}
                onClick={() => onFilterByInitiative(init.id)}
              />
            ))}
          </TreeNode>
        );
      })}

      {/* Cross-slug initiatives */}
      {(initsBySlug.get('__no_slug__') || []).length > 0 && (
        <TreeNode
          label={t('dashboard.general')}
          icon={<FolderOpen className="w-4 h-4 text-ono-orange" />}
          count={assetsBySlug.get('__no_slug__') || 0}
        >
          {(initsBySlug.get('__no_slug__') || []).map(init => (
            <TreeNode
              key={init.id}
              label={init.name}
              icon={<Megaphone className="w-3.5 h-3.5 text-ono-orange" />}
              onClick={() => onFilterByInitiative(init.id)}
            />
          ))}
        </TreeNode>
      )}
    </div>
  );
}
