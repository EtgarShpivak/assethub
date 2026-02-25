'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function TopNav({ userName, userEmail }: TopNavProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-14 bg-white border-b border-[#E8E8E8] flex items-center justify-between px-6 shrink-0">
      {/* Logo on the right (RTL) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ono-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="font-bold text-lg text-ono-gray-dark">AssetHub</span>
        </div>
        <span className="text-xs text-ono-gray border border-[#E8E8E8] rounded px-2 py-0.5">
          הקריה האקדמית אונו
        </span>
      </div>

      {/* User menu on the left (RTL) */}
      <div className="flex items-center gap-3">
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-ono-green-light rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-ono-green-dark" />
              </div>
              <span className="text-ono-gray-dark">
                {userName || userEmail || 'משתמש'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span>התנתק</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
