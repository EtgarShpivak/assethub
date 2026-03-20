'use client';

import { TopNav } from './top-nav';
import { Sidebar } from './sidebar';
import { ToastProvider } from '@/components/ui/global-toast';
import { I18nProvider } from '@/lib/i18n/provider';
import { GlobalSearch } from '@/components/search/global-search';
import { AccessibilityToolbar } from '@/components/accessibility/accessibility-toolbar';
import { SkipNavigation } from '@/components/accessibility/skip-navigation';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { MobileBottomNav } from './mobile-bottom-nav';
import { DragDropOverlay } from '@/components/drag-drop-overlay';

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
        <SkipNavigation />
        <div className="h-screen flex flex-col">
          <TopNav userName={userName} userEmail={userEmail} />
          <div className="flex flex-1 overflow-hidden dark:bg-gray-900">
            {/* RTL: sidebar on the right, main content on the left. Hidden on mobile (bottom nav used instead) */}
            <div className="hidden md:block">
              <Sidebar userRole={userRole} />
            </div>
            <main id="main-content" role="main" className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 dark:bg-gray-900" tabIndex={-1}>
              {children}
            </main>
          </div>
          <GlobalSearch />
          <KeyboardShortcuts />
          <MobileBottomNav />
          <DragDropOverlay />
          <AccessibilityToolbar />
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
