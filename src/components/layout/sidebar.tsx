'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/assets', label: 'ספריית חומרים', icon: FolderOpen },
  { href: '/upload', label: 'העלאת חומרים', icon: Upload },
  { href: '/initiatives', label: 'קמפיינים', icon: Megaphone },
  { href: '/archive', label: 'ארכיון', icon: Archive },
  { href: '/settings/tags', label: 'ניהול תגיות', icon: Tag },
  { href: '/settings/slugs', label: 'ניהול סלאגים', icon: Tag },
  { href: '/collections', label: 'אוספים', icon: Bookmark },
  { href: '/activity', label: 'יומן פעילות', icon: ScrollText },
  { href: '/admin/system-log', label: 'לוג מערכת', icon: ShieldAlert, adminOnly: true },
  { href: '/settings', label: 'הגדרות', icon: Settings },
  { href: '/help', label: 'עזרה ותמיכה', icon: HelpCircle },
];

export function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const isAdmin = userRole === 'admin';

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

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

      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
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
                    'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    item.adminOnly ? 'border-r-2 border-r-red-200' : '',
                    isActive
                      ? 'bg-ono-green-light border-r-0 border-l-[3px] border-l-ono-green text-ono-gray-dark font-bold'
                      : 'text-ono-gray hover:bg-ono-gray-light hover:text-ono-gray-dark'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', item.adminOnly && !isActive ? 'text-red-400' : '')} />
                  <span>{item.label}</span>
                  {item.adminOnly && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded mr-auto">אדמין</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
