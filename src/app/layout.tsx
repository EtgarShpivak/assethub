import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/dark-mode';

export const metadata: Metadata = {
  title: 'AssetHub — ניהול חומרים שיווקיים',
  description: 'מערכת ניהול נכסים דיגיטליים למחלקת השיווק של הקריה האקדמית אונו',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-heebo antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
