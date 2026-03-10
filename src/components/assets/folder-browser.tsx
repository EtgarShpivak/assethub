'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, FolderOpen, FolderClosed, Home, Megaphone } from 'lucide-react';
import type { Slug, Initiative } from '@/lib/types';

interface SlugNode extends Slug {
  children: SlugNode[];
  total_asset_count: number; // includes children's counts
}

interface FolderBrowserProps {
  slugs: Slug[];
  initiatives: Initiative[];
  filterCounts?: Record<string, number>;
  initiativeCounts?: Record<string, number>;
  onNavigate: (slugId: string | null) => void;
  currentSlugId?: string | null;
  onFilterByInitiative?: (initId: string) => void;
}

function buildTree(slugs: Slug[], filterCounts?: Record<string, number>): SlugNode[] {
  const map = new Map<string, SlugNode>();
  const roots: SlugNode[] = [];

  // Initialize all with empty children
  slugs.forEach((s) => {
    map.set(s.slug, {
      ...s,
      children: [],
      total_asset_count: filterCounts?.[s.id] ?? s.asset_count ?? 0,
    });
  });

  slugs.forEach((s) => {
    const parts = s.slug.split('-');
    if (parts.length > 1) {
      const parentSlug = parts.slice(0, -1).join('-');
      const parent = map.get(parentSlug);
      if (parent) {
        parent.children.push(map.get(s.slug)!);
        return;
      }
    }
    roots.push(map.get(s.slug)!);
  });

  // Aggregate total counts (self + all descendants)
  function sumCounts(node: SlugNode): number {
    let total = filterCounts?.[node.id] ?? node.asset_count ?? 0;
    for (const child of node.children) {
      total += sumCounts(child);
    }
    node.total_asset_count = total;
    return total;
  }
  roots.forEach(sumCounts);

  return roots;
}

function findNodeById(nodes: SlugNode[], id: string): SlugNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

function buildBreadcrumb(tree: SlugNode[], targetId: string): SlugNode[] {
  const path: SlugNode[] = [];

  function walk(nodes: SlugNode[]): boolean {
    for (const node of nodes) {
      if (node.id === targetId) {
        path.push(node);
        return true;
      }
      if (walk(node.children)) {
        path.unshift(node);
        return true;
      }
    }
    return false;
  }

  walk(tree);
  return path;
}

function FolderRow({
  node,
  onClick,
  hasChildren,
}: {
  node: SlugNode;
  onClick: () => void;
  hasChildren: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-right px-4 py-3 bg-white border border-[#E8E8E8] rounded-lg hover:bg-ono-green-light/30 hover:border-ono-green/40 transition-all group"
    >
      {/* Folder icon */}
      <FolderClosed className="w-5 h-5 text-ono-green shrink-0 group-hover:hidden" />
      <FolderOpen className="w-5 h-5 text-ono-green shrink-0 hidden group-hover:block" />

      {/* Folder name */}
      <span className="flex-1 text-sm font-medium text-ono-gray-dark truncate">
        {node.display_name}
      </span>

      {/* Asset count */}
      <span className="text-xs text-ono-gray bg-ono-gray-light px-2 py-0.5 rounded-full shrink-0">
        {node.total_asset_count}
      </span>

      {/* Navigate arrow (only if has children) */}
      {hasChildren && (
        <ChevronLeft className="w-4 h-4 text-ono-gray group-hover:text-ono-green shrink-0" />
      )}
    </button>
  );
}

function InitiativeRow({
  initiative,
  count,
  onClick,
}: {
  initiative: Initiative;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-right px-4 py-2.5 bg-orange-50/50 border border-orange-200/50 rounded-lg hover:bg-orange-50 hover:border-orange-300/60 transition-all group"
    >
      <Megaphone className="w-4 h-4 text-ono-orange shrink-0" />
      <span className="flex-1 text-sm text-ono-gray-dark truncate">
        {initiative.name}
      </span>
      {count !== undefined && (
        <span className="text-xs text-ono-gray bg-white px-2 py-0.5 rounded-full shrink-0">
          {count}
        </span>
      )}
    </button>
  );
}

export function FolderBrowser({
  slugs,
  initiatives,
  filterCounts,
  initiativeCounts,
  onNavigate,
  currentSlugId,
  onFilterByInitiative,
}: FolderBrowserProps) {
  const [openFolderId, setOpenFolderId] = useState<string | null>(currentSlugId ?? null);

  // Sync with external filter changes (e.g. dropdown or URL)
  useEffect(() => {
    setOpenFolderId(currentSlugId ?? null);
  }, [currentSlugId]);

  const tree = useMemo(
    () => buildTree(slugs.filter((s) => !s.is_archived), filterCounts),
    [slugs, filterCounts],
  );

  const breadcrumb = useMemo(
    () => (openFolderId ? buildBreadcrumb(tree, openFolderId) : []),
    [tree, openFolderId],
  );

  const currentNode = useMemo(
    () => (openFolderId ? findNodeById(tree, openFolderId) : null),
    [tree, openFolderId],
  );

  // What folders to display
  const displayedFolders = currentNode ? currentNode.children : tree;

  // Initiatives for current folder
  const currentInitiatives = useMemo(() => {
    if (!openFolderId) return [];
    return initiatives.filter((i) => i.slug_id === openFolderId);
  }, [initiatives, openFolderId]);

  const handleFolderClick = (node: SlugNode) => {
    if (node.children.length > 0) {
      // Has children → navigate into folder
      setOpenFolderId(node.id);
      onNavigate(node.id);
    } else {
      // Leaf folder → filter by this slug
      setOpenFolderId(node.id);
      onNavigate(node.id);
    }
  };

  const handleBreadcrumbClick = (nodeId: string | null) => {
    setOpenFolderId(nodeId);
    onNavigate(nodeId);
  };

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 flex-wrap text-sm bg-white border border-[#E8E8E8] rounded-lg px-4 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => handleBreadcrumbClick(null)}
          className={`flex items-center gap-1.5 hover:text-ono-green transition-colors ${
            openFolderId ? 'text-ono-gray' : 'text-ono-green font-medium'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>ספריית חומרים</span>
        </button>

        {breadcrumb.map((node, i) => (
          <div key={node.id} className="flex items-center gap-1.5">
            <ChevronLeft className="w-3.5 h-3.5 text-ono-gray/50" />
            <button
              onClick={() => handleBreadcrumbClick(node.id)}
              className={`hover:text-ono-green transition-colors ${
                i === breadcrumb.length - 1
                  ? 'text-ono-green font-medium'
                  : 'text-ono-gray'
              }`}
            >
              {node.display_name}
            </button>
          </div>
        ))}
      </nav>

      {/* Folders grid */}
      <div className="space-y-2">
        {displayedFolders.length > 0 && (
          <div className="space-y-1.5">
            {displayedFolders.map((node) => (
              <FolderRow
                key={node.id}
                node={node}
                onClick={() => handleFolderClick(node)}
                hasChildren={node.children.length > 0}
              />
            ))}
          </div>
        )}

        {/* Initiatives for current folder */}
        {currentInitiatives.length > 0 && (
          <div className="space-y-1.5 mt-3">
            <p className="text-xs text-ono-gray font-medium px-1">קמפיינים</p>
            {currentInitiatives.map((init) => (
              <InitiativeRow
                key={init.id}
                initiative={init}
                count={initiativeCounts?.[init.id]}
                onClick={() => onFilterByInitiative?.(init.id)}
              />
            ))}
          </div>
        )}

        {/* Empty state for leaf folder */}
        {displayedFolders.length === 0 && currentInitiatives.length === 0 && openFolderId && (
          <div className="text-center py-6 text-ono-gray">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 text-ono-gray/40" />
            <p className="text-sm">תיקייה ריקה — אין תת-תיקיות</p>
            <p className="text-xs mt-1">החומרים מוצגים למטה</p>
          </div>
        )}
      </div>
    </div>
  );
}
