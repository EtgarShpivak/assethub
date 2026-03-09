'use client';

import { useTranslation } from '@/lib/i18n/provider';

export function SkipNavigation() {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-1/2 focus:translate-x-1/2 focus:z-[200] focus:bg-ono-green focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
    >
      {t('a11y.skipToContent')}
    </a>
  );
}
