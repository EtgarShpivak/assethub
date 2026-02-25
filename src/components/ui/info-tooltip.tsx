'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function InfoTooltip({ text, size = 'sm', className = '' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!show) return;
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [show]);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-ono-gray/60 hover:text-ono-green transition-colors cursor-help"
        aria-label="עזרה"
      >
        <HelpCircle className={iconSize} />
      </button>
      {show && (
        <div
          ref={tooltipRef}
          className="absolute z-50 bottom-full right-1/2 translate-x-1/2 mb-2 w-56 bg-ono-gray-dark text-white text-xs rounded-lg p-3 shadow-lg leading-relaxed pointer-events-auto"
          style={{ direction: 'rtl' }}
        >
          {text}
          <div className="absolute top-full right-1/2 translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-ono-gray-dark rotate-45 -translate-y-1" />
          </div>
        </div>
      )}
    </span>
  );
}
