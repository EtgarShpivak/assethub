'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'חיפוש מהיר' },
  { keys: ['Shift', '?'], description: 'קיצורי מקשים' },
  { keys: ['G', 'D'], description: 'דשבורד' },
  { keys: ['G', 'A'], description: 'ספריית חומרים' },
  { keys: ['G', 'U'], description: 'העלאת חומרים' },
  { keys: ['G', 'P'], description: 'אישורים' },
  { keys: ['Esc'], description: 'סגור חלון / ביטול' },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);

      // Navigation shortcuts
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        const waitForNext = (callback: (key: string) => void) => {
          const next = (e2: KeyboardEvent) => {
            callback(e2.key);
            window.removeEventListener('keydown', next);
          };
          window.addEventListener('keydown', next, { once: true });
          setTimeout(() => window.removeEventListener('keydown', next), 1000);
        };
        waitForNext((key) => {
          const routes: Record<string, string> = { d: '/', a: '/assets', u: '/upload', p: '/approvals' };
          if (routes[key]) window.location.href = routes[key];
        });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8] dark:border-gray-700">
          <h2 className="text-lg font-bold text-ono-gray-dark dark:text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-ono-green" />
            קיצורי מקשים
          </h2>
          <button onClick={() => setOpen(false)} className="text-ono-gray hover:text-ono-gray-dark dark:text-gray-400 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-ono-gray-dark dark:text-gray-300">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, j) => (
                  <span key={j}>
                    <kbd className="px-2 py-1 text-xs font-mono bg-[#F5F5F5] dark:bg-gray-700 border border-[#E8E8E8] dark:border-gray-600 rounded-md text-ono-gray-dark dark:text-gray-300 shadow-sm">
                      {key}
                    </kbd>
                    {j < s.keys.length - 1 && <span className="text-xs text-ono-gray mx-0.5">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-[#FAFAFA] dark:bg-gray-750 border-t border-[#E8E8E8] dark:border-gray-700 text-center">
          <p className="text-xs text-ono-gray dark:text-gray-400">לחצו <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-gray-700 border rounded">Esc</kbd> לסגירה</p>
        </div>
      </div>
    </div>
  );
}
