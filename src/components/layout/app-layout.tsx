'use client';

import { TopNav } from './top-nav';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}

export function AppLayout({ children, userName, userEmail }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      <TopNav userName={userName} userEmail={userEmail} />
      <div className="flex flex-1 overflow-hidden">
        {/* RTL: sidebar on the right, main content on the left */}
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
