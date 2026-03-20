'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Settings,
  Tag,
  Megaphone,
  HelpCircle,
  Archive,
  Bookmark,
  ScrollText,
  ChevronDown,
  Wrench,
  Star,
  UserCircle,
  BarChart3,
  Accessibility,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/provider';

interface NavLink {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavGroup {
  labelKey: string;
  icon: typeof LayoutDashboard;
  children: NavLink[];
  adminOnly?: boolean;
}

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const navEntries: NavEntry[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/assets', labelKey: 'nav.assets', icon: FolderOpen },
  { href: '/assets?favorites=true', labelKey: 'nav.favorites', icon: Star },
  { href: '/assets?my=true', labelKey: 'nav.myAssets', icon: UserCircle },
  { href: '/upload', labelKey: 'nav.upload', icon: Upload },
  {
    labelKey: 'nav.approvals',
    icon: ClipboardCheck,
    children: [
      { href: '/approvals', labelKey: 'nav.myApprovals', icon: ClipboardCheck },
      { href: '/approvals/pending', labelKey: 'nav.pendingMyApproval', icon: ClipboardCheck },
    ],
  },
  {
    labelKey: 'nav.systemManagement',
    icon: Wrench,
    children: [
      { href: '/initiatives', labelKey: 'nav.campaigns', icon: Megaphone },
      { href: '/archive', labelKey: 'nav.archive', icon: Archive },
      { href: '/settings/tags', labelKey: 'nav.tagManagement', icon: Tag },
      { href: '/settings/slugs', labelKey: 'nav.slugManagement', icon: Tag },
      { href: '/collections', labelKey: 'nav.collections', icon: Bookmark },
    ],
  },
  {
    labelKey: 'nav.settings',
    icon: Settings,
    children: [
      { href: '/settings', labelKey: 'nav.usersPermissions', icon: Settings },
      { href: '/activity', labelKey: 'nav.activityLog', icon: ScrollText },
      { href: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
    ],
  },
  { href: '/help', labelKey: 'nav.help', icon: HelpCircle },
  { href: '/accessibility', labelKey: 'nav.accessibility', icon: Accessibility },
];

export function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const isAdmin = userRole === 'admin';
  const { t } = useTranslation();

  // Determine which groups should be open by default (based on current path)
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    navEntries.forEach(entry => {
      if (isGroup(entry)) {
        const childActive = entry.children.some(child =>
          child.href === '/' ? pathname === '/' : pathname.startsWith(child.href)
        );
        open[entry.labelKey] = childActive;
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderLink = (item: NavLink, isChild = false) => {
    if (item.adminOnly && !isAdmin) return null;

    const isActive =
      item.href === '/'
        ? pathname === '/'
        : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 text-sm transition-colors',
            isChild ? 'px-5 py-2 pr-10' : 'px-4 py-2.5',
            item.adminOnly ? 'border-r-2 border-r-red-200' : '',
            isActive
              ? 'bg-ono-green-light border-l-[3px] border-l-ono-green text-ono-gray-dark font-bold'
              : 'text-ono-gray hover:bg-ono-gray-light hover:text-ono-gray-dark'
          )}
        >
          <Icon className={cn('w-4 h-4 shrink-0', item.adminOnly && !isActive ? 'text-red-400' : '', isChild ? 'w-4 h-4' : 'w-5 h-5')} />
          <span>{t(item.labelKey)}</span>
          {item.adminOnly && (
            <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded mr-auto">{t('common.admin')}</span>
          )}
        </Link>
      </li>
    );
  };

  const renderGroup = (group: NavGroup) => {
    // Filter out admin-only children if not admin
    const visibleChildren = group.children.filter(c => !c.adminOnly || isAdmin);
    if (visibleChildren.length === 0) return null;

    const isOpen = openGroups[group.labelKey] ?? false;
    const hasActiveChild = visibleChildren.some(child =>
      child.href === '/' ? pathname === '/' : pathname.startsWith(child.href)
    );
    const Icon = group.icon;

    return (
      <li key={group.labelKey}>
        <button
          onClick={() => toggleGroup(group.labelKey)}
          aria-expanded={isOpen}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-right',
            hasActiveChild
              ? 'text-ono-gray-dark font-bold'
              : 'text-ono-gray hover:bg-ono-gray-light hover:text-ono-gray-dark'
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{t(group.labelKey)}</span>
          <ChevronDown className={cn(
            'w-4 h-4 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )} />
        </button>
        {isOpen && (
          <ul className="bg-[#FAFAFA]">
            {visibleChildren.map(child => renderLink(child, true))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside className="w-60 bg-white border-l border-[#E8E8E8] flex flex-col h-full shrink-0">
      {/* Ono Logo + Title */}
      <div className="px-4 pt-5 pb-4 border-b border-[#E8E8E8]">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/ono-logo.png"
            alt={t('sidebar.onoAcademic')}
            width={160}
            height={79}
            priority
          />
          <h2 className="text-sm font-bold text-ono-gray-dark text-center leading-tight">
            {t('sidebar.mediaManagement')}
          </h2>
          <span className="text-[10px] text-ono-gray text-center">
            {t('sidebar.onoAcademic')}
          </span>
        </div>
      </div>

      <nav aria-label={t('a11y.sidebarNav')} className="flex-1 py-4 overflow-auto">
        <ul className="space-y-0.5">
          {navEntries.map(entry =>
            isGroup(entry) ? renderGroup(entry) : renderLink(entry)
          )}
        </ul>
      </nav>
    </aside>
  );
}
