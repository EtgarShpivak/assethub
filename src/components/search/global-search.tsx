'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Megaphone,
  Tag,
  FileText,
  Image as ImageIcon,
  Film,
  Clock,
  LayoutDashboard,
  Upload,
  HelpCircle,
  ScrollText,
  Search,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useTranslation } from '@/lib/i18n/provider';

interface SearchResult {
  id: string;
  type: 'asset' | 'initiative' | 'slug';
  name: string;
  subtitle?: string;
  file_type?: string;
}

const PAGES = [
  { name: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { name: 'nav.assets', href: '/assets', icon: FolderOpen },
  { name: 'nav.upload', href: '/upload', icon: Upload },
  { name: 'nav.campaigns', href: '/initiatives', icon: Megaphone },
  { name: 'nav.activityLog', href: '/activity', icon: ScrollText },
  { name: 'nav.help', href: '/help', icon: HelpCircle },
  { name: 'nav.reports', href: '/reports', icon: FileText },
];

function getFileIcon(type?: string) {
  switch (type) {
    case 'image': return <ImageIcon className="w-4 h-4 text-ono-green" />;
    case 'video': return <Film className="w-4 h-4 text-platform-meta" />;
    case 'pdf': return <FileText className="w-4 h-4 text-platform-google" />;
    default: return <FolderOpen className="w-4 h-4 text-ono-gray" />;
  }
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();
  const { t } = useTranslation();

  // Load recent searches
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('assethub-recent-searches') || '[]');
      setRecentSearches(saved);
    } catch { /* ignore */ }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search as user types
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [assetsRes, initsRes, slugsRes] = await Promise.all([
        fetch(`/api/assets?search=${encodeURIComponent(q)}&limit=5`).then(r => r.json()),
        fetch(`/api/initiatives`).then(r => r.json()),
        fetch(`/api/slugs`).then(r => r.json()),
      ]);

      const items: SearchResult[] = [];

      // Assets
      if (assetsRes.assets) {
        assetsRes.assets.slice(0, 5).forEach((a: { id: string; stored_filename: string; original_filename: string; file_type: string; dimensions_label?: string }) => {
          items.push({
            id: a.id,
            type: 'asset',
            name: a.stored_filename || a.original_filename,
            subtitle: a.dimensions_label || a.file_type,
            file_type: a.file_type,
          });
        });
      }

      // Initiatives — filter client-side
      const qLower = q.toLowerCase();
      if (Array.isArray(initsRes)) {
        initsRes
          .filter((i: { name: string; short_code: string }) =>
            i.name.toLowerCase().includes(qLower) || i.short_code.toLowerCase().includes(qLower)
          )
          .slice(0, 3)
          .forEach((i: { id: string; name: string; short_code: string }) => {
            items.push({ id: i.id, type: 'initiative', name: i.name, subtitle: i.short_code });
          });
      }

      // Slugs — filter client-side
      if (Array.isArray(slugsRes)) {
        slugsRes
          .filter((s: { display_name: string; slug: string }) =>
            s.display_name.toLowerCase().includes(qLower) || s.slug.toLowerCase().includes(qLower)
          )
          .slice(0, 3)
          .forEach((s: { id: string; display_name: string; slug: string }) => {
            items.push({ id: s.id, type: 'slug', name: s.display_name, subtitle: s.slug });
          });
      }

      setResults(items);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('assethub-recent-searches', JSON.stringify(updated));

    setOpen(false);
    setQuery('');

    switch (result.type) {
      case 'asset':
        router.push(`/assets?id=${result.id}`);
        break;
      case 'initiative':
        router.push(`/initiatives/${result.id}`);
        break;
      case 'slug':
        router.push(`/assets?slug_id=${result.id}`);
        break;
    }
  };

  const handlePageSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('assethub-recent-searches');
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t('search.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-ono-green border-t-transparent rounded-full animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : (
            t('search.noResults')
          )}
        </CommandEmpty>

        {/* Recent searches */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading={
            <span className="flex items-center justify-between">
              <span>{t('search.recentSearches')}</span>
              <button onClick={clearRecent} className="text-xs text-ono-gray hover:text-ono-green">
                {t('search.clearRecent')}
              </button>
            </span>
          }>
            {recentSearches.map((s, i) => (
              <CommandItem key={i} onSelect={() => { setQuery(s); }}>
                <Clock className="w-4 h-4 text-ono-gray" />
                <span>{s}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search results */}
        {query && results.filter(r => r.type === 'asset').length > 0 && (
          <CommandGroup heading={t('search.assets')}>
            {results.filter(r => r.type === 'asset').map(r => (
              <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                {getFileIcon(r.file_type)}
                <span className="flex-1 truncate">{r.name}</span>
                {r.subtitle && <span className="text-xs text-ono-gray">{r.subtitle}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query && results.filter(r => r.type === 'initiative').length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('search.campaigns')}>
              {results.filter(r => r.type === 'initiative').map(r => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                  <Megaphone className="w-4 h-4 text-ono-orange" />
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.subtitle && <span className="text-xs text-ono-gray">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {query && results.filter(r => r.type === 'slug').length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('search.slugs')}>
              {results.filter(r => r.type === 'slug').map(r => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                  <Tag className="w-4 h-4 text-ono-green" />
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.subtitle && <span className="text-xs text-ono-gray">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Pages — always show */}
        {!query && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('search.pages')}>
              {PAGES.map(p => {
                const Icon = p.icon;
                return (
                  <CommandItem key={p.href} onSelect={() => handlePageSelect(p.href)}>
                    <Icon className="w-4 h-4" />
                    <span>{t(p.name)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// Trigger button for top nav
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-ono-gray bg-ono-gray-light rounded-lg hover:bg-[#E8E8E8] transition-colors"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">{t('topnav.search')}</span>
      <kbd className="hidden sm:inline text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E8E8E8]">
        {t('topnav.searchHint')}
      </kbd>
    </button>
  );
}
