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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'דשבורד', icon: LayoutDashboard },
  { href: '/assets', label: 'ספריית חומרים', icon: FolderOpen },
  { href: '/upload', label: 'העלאת חומרים', icon: Upload },
  { href: '/initiatives', label: 'קמפיינים', icon: Megaphone },
  { href: '/archive', label: 'ארכיון', icon: Archive },
  { href: '/settings/slugs', label: 'ניהול סלאגים', icon: Tag },
  { href: '/settings', label: 'הגדרות', icon: Settings },
  { href: '/help', label: 'עזרה ותמיכה', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-l border-[#E8E8E8] flex flex-col h-full shrink-0">
      {/* Ono Logo + Title */}
      <div className="px-4 pt-5 pb-4 border-b border-[#E8E8E8]">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/ono-logo.svg"
            alt="הקריה האקדמית אונו"
            width={140}
            height={84}
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
