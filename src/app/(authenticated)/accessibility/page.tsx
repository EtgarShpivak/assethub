'use client';

import { useTranslation } from '@/lib/i18n/provider';
import { Accessibility, Mail, Phone, Keyboard } from 'lucide-react';

export default function AccessibilityStatementPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Accessibility className="w-6 h-6 text-ono-green" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-ono-gray-dark">{t('a11y.statement.title')}</h1>
      </div>

      <div className="space-y-6 bg-white rounded-xl border border-[#E8E8E8] p-6">
        {/* Compliance declaration */}
        <section>
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">{t('a11y.statement.complianceTitle')}</h2>
          <p className="text-sm text-ono-gray-dark leading-relaxed">{t('a11y.statement.complianceText')}</p>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">{t('a11y.statement.featuresTitle')}</h2>
          <ul className="text-sm text-ono-gray-dark space-y-1.5 list-disc list-inside">
            <li>{t('a11y.statement.feature1')}</li>
            <li>{t('a11y.statement.feature2')}</li>
            <li>{t('a11y.statement.feature3')}</li>
            <li>{t('a11y.statement.feature4')}</li>
            <li>{t('a11y.statement.feature5')}</li>
            <li>{t('a11y.statement.feature6')}</li>
            <li>{t('a11y.statement.feature7')}</li>
            <li>{t('a11y.statement.feature8')}</li>
          </ul>
        </section>

        {/* Keyboard navigation */}
        <section>
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">
            <Keyboard className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
            {t('a11y.statement.keyboardTitle')}
          </h2>
          <div className="text-sm text-ono-gray-dark space-y-1">
            <p><kbd className="px-1.5 py-0.5 bg-ono-gray-light rounded text-xs font-mono">Tab</kbd> — {t('a11y.statement.keyTab')}</p>
            <p><kbd className="px-1.5 py-0.5 bg-ono-gray-light rounded text-xs font-mono">Shift+Tab</kbd> — {t('a11y.statement.keyShiftTab')}</p>
            <p><kbd className="px-1.5 py-0.5 bg-ono-gray-light rounded text-xs font-mono">Enter</kbd> — {t('a11y.statement.keyEnter')}</p>
            <p><kbd className="px-1.5 py-0.5 bg-ono-gray-light rounded text-xs font-mono">Esc</kbd> — {t('a11y.statement.keyEsc')}</p>
            <p><kbd className="px-1.5 py-0.5 bg-ono-gray-light rounded text-xs font-mono">Ctrl+K</kbd> — {t('a11y.statement.keySearch')}</p>
          </div>
        </section>

        {/* Known limitations */}
        <section>
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">{t('a11y.statement.limitationsTitle')}</h2>
          <p className="text-sm text-ono-gray-dark leading-relaxed">{t('a11y.statement.limitationsText')}</p>
        </section>

        {/* Assistive technology compatibility */}
        <section>
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">{t('a11y.statement.compatibilityTitle')}</h2>
          <p className="text-sm text-ono-gray-dark leading-relaxed">{t('a11y.statement.compatibilityText')}</p>
        </section>

        {/* Contact */}
        <section className="bg-ono-green-light rounded-lg p-4">
          <h2 className="text-lg font-bold text-ono-gray-dark mb-2">{t('a11y.statement.contactTitle')}</h2>
          <p className="text-sm text-ono-gray-dark mb-3">{t('a11y.statement.contactText')}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-ono-green-dark" aria-hidden="true" />
              <span className="text-ono-gray-dark">{t('a11y.statement.contactName')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-ono-green-dark" aria-hidden="true" />
              <a href="mailto:negishut@ono.ac.il" className="text-ono-green-dark underline hover:text-ono-green">
                negishut@ono.ac.il
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-ono-green-dark" aria-hidden="true" />
              <a href="tel:+97235311888" className="text-ono-green-dark underline hover:text-ono-green" dir="ltr">
                03-531-1888
              </a>
            </div>
          </div>
        </section>

        {/* Last updated */}
        <p className="text-xs text-ono-gray text-center">
          {t('a11y.statement.lastUpdated')}: {new Date().toLocaleDateString('he-IL')}
        </p>
      </div>
    </div>
  );
}
