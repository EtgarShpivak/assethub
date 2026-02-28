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
  ShieldAlert,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  children: NavLink[];
  adminOnly?: boolean;
}

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const navEntries: NavEntry[] = [
  { href: '/', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/assets', label: 'ספריית חומרים', icon: FolderOpen },
  { href: '/upload', label: 'העלאת חומרים', icon: Upload },
  {
    label: 'ניהול מערכת',
    icon: Wrench,
    children: [
      { href: '/initiatives', label: 'קמפיינים', icon: Megaphone },
      { href: '/archive', label: 'ארכיון', icon: Archive },
      { href: '/settings/tags', label: 'ניהול תגיות', icon: Tag },
      { href: '/settings/slugs', label: 'ניהול סלאגים', icon: Tag },
      { href: '/collections', label: 'אוספים', icon: Bookmark },
    ],
  },
  {
    label: 'הגדרות',
    icon: Settings,
    children: [
      { href: '/settings', label: 'משתמשים והרשאות', icon: Settings },
      { href: '/activity', label: 'יומן פעילות', icon: ScrollText },
      { href: '/admin/system-log', label: 'לוג מערכת', icon: ShieldAlert, adminOnly: true },
    ],
  },
  { href: '/help', label: 'עזרה ותמיכה', icon: HelpCircle },
];

export function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const isAdmin = userRole === 'admin';

  // Determine which groups should be open by default (based on current path)
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    navEntries.forEach(entry => {
      if (isGroup(entry)) {
        const childActive = entry.children.some(child =>
          child.href === '/' ? pathname === '/' : pathname.startsWith(child.href)
        );
        open[entry.label] = childActive;
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
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
          <span>{item.label}</span>
          {item.adminOnly && (
            <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded mr-auto">אדמין</span>
          )}
        </Link>
      </li>
    );
  };

  const renderGroup = (group: NavGroup) => {
    // Filter out admin-only children if not admin
    const visibleChildren = group.children.filter(c => !c.adminOnly || isAdmin);
    if (visibleChildren.length === 0) return null;

    const isOpen = openGroups[group.label] ?? false;
    const hasActiveChild = visibleChildren.some(child =>
      child.href === '/' ? pathname === '/' : pathname.startsWith(child.href)
    );
    const Icon = group.icon;

    return (
      <li key={group.label}>
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-right',
            hasActiveChild
              ? 'text-ono-gray-dark font-bold'
              : 'text-ono-gray hover:bg-ono-gray-light hover:text-ono-gray-dark'
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{group.label}</span>
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
            alt="הקריה האקדמית אונו"
            width={160}
            height={79}
            priority
          />
          <h2 className="text-sm font-bold text-ono-gray-dark text-center leading-tight">
            ניהול מדיה
          </h2>
          <span className="text-[10px] text-ono-gray text-center">
            הקריה האקדמית אונו
          </span>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-auto">
        <ul className="space-y-0.5">
          {navEntries.map(entry =>
            isGroup(entry) ? renderGroup(entry) : renderLink(entry)
          )}
        </ul>
      </nav>
    </aside>
  );
}
