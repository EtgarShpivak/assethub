import type { Metadata } from 'next';
import './globals.css';

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
      <body className="font-heebo antialiased">
        {children}
      </body>
    </html>
  );
}
