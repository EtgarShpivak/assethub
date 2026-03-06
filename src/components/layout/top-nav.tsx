'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Search, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n/provider';

interface TopNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function TopNav({ userName, userEmail }: TopNavProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale, setLocale, dir } = useTranslation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    router.push('/login');
    router.refresh();
  };

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
  };

  return (
    <header className="h-14 bg-white border-b border-[#E8E8E8] flex items-center justify-between px-6 shrink-0">
      {/* Logo on the right (RTL) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ono-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="font-bold text-lg text-ono-gray-dark">{t('nav.mediaManagement')}</span>
        </div>
      </div>

      {/* Center: search trigger */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-ono-gray bg-ono-gray-light rounded-lg hover:bg-[#E8E8E8] transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">{t('topnav.search')}</span>
        <kbd className="hidden sm:inline text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E8E8E8]">
          {t('topnav.searchHint')}
        </kbd>
      </button>

      {/* User menu + language toggle on the left (RTL) */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocale(locale === 'he' ? 'en' : 'he')}
          className="text-xs gap-1"
        >
          <Globe className="w-4 h-4" />
          {t('topnav.language')}
        </Button>

        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-ono-green-light rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-ono-green-dark" />
              </div>
              <span className="text-ono-gray-dark">
                {userName || userEmail || t('topnav.user')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>{t('topnav.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
