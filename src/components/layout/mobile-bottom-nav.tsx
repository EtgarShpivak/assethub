'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  ClipboardCheck,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'דשבורד' },
  { href: '/assets', icon: FolderOpen, label: 'ספרייה' },
  { href: '/upload', icon: Upload, label: 'העלאה' },
  { href: '/approvals', icon: ClipboardCheck, label: 'אישורים' },
  { href: '/assets?search=true', icon: Search, label: 'חיפוש' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-[#E8E8E8] dark:border-gray-700 safe-bottom" dir="rtl">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href.split('?')[0]);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-colors min-w-[56px]',
                isActive
                  ? 'text-ono-green'
                  : 'text-ono-gray hover:text-ono-gray-dark dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
