'use client';

import { TopNav } from './top-nav';
import { Sidebar } from './sidebar';
import { ToastProvider } from '@/components/ui/global-toast';
import { I18nProvider } from '@/lib/i18n/provider';
import { GlobalSearch } from '@/components/search/global-search';

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
}

export function AppLayout({ children, userName, userEmail, userRole }: AppLayoutProps) {
  return (
    <I18nProvider>
      <ToastProvider>
        <div className="h-screen flex flex-col">
          <TopNav userName={userName} userEmail={userEmail} />
          <div className="flex flex-1 overflow-hidden">
            {/* RTL: sidebar on the right, main content on the left */}
            <Sidebar userRole={userRole} />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
          <GlobalSearch />
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
