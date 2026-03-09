'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Accessibility,
  X,
  ZoomIn,
  ZoomOut,
  Contrast,
  Link2,
  Type,
  MonitorOff,
  RotateCcw,
  Pause,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/provider';

interface A11ySettings {
  fontSize: number; // 0 = default, 1-5 = increase levels
  highContrast: boolean;
  grayscale: boolean;
  linkHighlight: boolean;
  readableFont: boolean;
  pauseAnimations: boolean;
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontSize: 0,
  highContrast: false,
  grayscale: false,
  linkHighlight: false,
  readableFont: false,
  pauseAnimations: false,
};

const STORAGE_KEY = 'assethub-a11y';

export function AccessibilityToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_SETTINGS);
  const { t } = useTranslation();

  // Load persisted settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as A11ySettings;
        setSettings(parsed);
        applySettings(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const persistAndApply = useCallback((newSettings: A11ySettings) => {
    setSettings(newSettings);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings)); } catch { /* ignore */ }
    applySettings(newSettings);
  }, []);

  const resetAll = () => {
    persistAndApply(DEFAULT_SETTINGS);
  };

  const toggleSetting = (key: keyof Omit<A11ySettings, 'fontSize'>) => {
    persistAndApply({ ...settings, [key]: !settings[key] });
  };

  const adjustFontSize = (delta: number) => {
    const newSize = Math.max(0, Math.min(5, settings.fontSize + delta));
    persistAndApply({ ...settings, fontSize: newSize });
  };

  const hasActiveSettings = Object.entries(settings).some(([key, val]) => {
    if (key === 'fontSize') return val !== 0;
    return val === true;
  });

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-[90] w-12 h-12 bg-ono-green text-white rounded-full shadow-lg hover:bg-ono-green-dark transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green focus-visible:ring-offset-2"
        aria-label={t('a11y.toolbar.toggle')}
        aria-expanded={isOpen}
        aria-controls="a11y-toolbar-panel"
      >
        <Accessibility className="w-6 h-6" />
        {hasActiveSettings && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-ono-orange rounded-full" aria-hidden="true" />
        )}
      </button>

      {/* Toolbar panel */}
      {isOpen && (
        <div
          id="a11y-toolbar-panel"
          role="region"
          aria-label={t('a11y.toolbar.title')}
          className="fixed bottom-20 left-6 z-[91] w-72 bg-white rounded-xl shadow-2xl border border-[#E8E8E8] overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-ono-green-light border-b border-[#E8E8E8]">
            <div className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-ono-green-dark" />
              <h2 className="text-sm font-bold text-ono-gray-dark">{t('a11y.toolbar.title')}</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-black/5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4 text-ono-gray" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-3 space-y-2">
            {/* Font size */}
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-ono-gray-light transition-colors">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-ono-gray-dark" aria-hidden="true" />
                <span className="text-sm text-ono-gray-dark">{t('a11y.toolbar.fontSize')}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustFontSize(-1)}
                  disabled={settings.fontSize === 0}
                  className="p-1 rounded hover:bg-ono-gray-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green"
                  aria-label={t('a11y.toolbar.decreaseFont')}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs w-6 text-center font-medium" aria-live="polite" aria-atomic="true">
                  {settings.fontSize > 0 ? `+${settings.fontSize}` : '0'}
                </span>
                <button
                  onClick={() => adjustFontSize(1)}
                  disabled={settings.fontSize === 5}
                  className="p-1 rounded hover:bg-ono-gray-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green"
                  aria-label={t('a11y.toolbar.increaseFont')}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Toggle buttons */}
            <ToggleButton
              icon={Contrast}
              label={t('a11y.toolbar.highContrast')}
              active={settings.highContrast}
              onClick={() => toggleSetting('highContrast')}
            />
            <ToggleButton
              icon={MonitorOff}
              label={t('a11y.toolbar.grayscale')}
              active={settings.grayscale}
              onClick={() => toggleSetting('grayscale')}
            />
            <ToggleButton
              icon={Link2}
              label={t('a11y.toolbar.linkHighlight')}
              active={settings.linkHighlight}
              onClick={() => toggleSetting('linkHighlight')}
            />
            <ToggleButton
              icon={Type}
              label={t('a11y.toolbar.readableFont')}
              active={settings.readableFont}
              onClick={() => toggleSetting('readableFont')}
            />
            <ToggleButton
              icon={Pause}
              label={t('a11y.toolbar.pauseAnimations')}
              active={settings.pauseAnimations}
              onClick={() => toggleSetting('pauseAnimations')}
            />

            {/* Reset */}
            {hasActiveSettings && (
              <button
                onClick={resetAll}
                className="flex items-center gap-2 w-full p-2 text-sm text-ono-orange hover:bg-ono-orange-light rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{t('a11y.toolbar.reset')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ToggleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Contrast;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full p-2 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ono-green ${
        active
          ? 'bg-ono-green-light text-ono-green-dark font-medium'
          : 'text-ono-gray-dark hover:bg-ono-gray-light'
      }`}
      role="switch"
      aria-checked={active}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="flex-1 text-right">{label}</span>
      <span
        className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-ono-green' : 'bg-ono-gray/30'}`}
        aria-hidden="true"
      >
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${active ? 'right-0.5' : 'right-[18px]'}`} />
      </span>
    </button>
  );
}

/** Apply CSS classes/variables to document root */
function applySettings(s: A11ySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Font size: each level adds 2px to base 14px
  root.style.fontSize = s.fontSize > 0 ? `${14 + s.fontSize * 2}px` : '';

  // High contrast
  root.classList.toggle('a11y-high-contrast', s.highContrast);

  // Grayscale
  root.classList.toggle('a11y-grayscale', s.grayscale);

  // Link highlighting
  root.classList.toggle('a11y-link-highlight', s.linkHighlight);

  // Readable font
  root.classList.toggle('a11y-readable-font', s.readableFont);

  // Pause animations
  root.classList.toggle('a11y-pause-animations', s.pauseAnimations);
}
