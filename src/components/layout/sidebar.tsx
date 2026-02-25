'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Settings,
  Tag,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/assets', label: 'ספריית חומרים', icon: FolderOpen },
  { href: '/upload', label: 'העלאת חומרים', icon: Upload },
  { href: '/initiatives', label: 'מהלכים שיווקיים', icon: Megaphone },
  { href: '/settings/slugs', label: 'ניהול סלאגים', icon: Tag },
  { href: '/settings', label: 'הגדרות', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-l border-[#E8E8E8] flex flex-col h-full shrink-0">
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
                    isActive
                      ? 'bg-ono-green-light border-r-0 border-l-[3px] border-l-ono-green text-ono-gray-dark font-bold'
                      : 'text-ono-gray hover:bg-ono-gray-light hover:text-ono-gray-dark'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
