'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function InfoTooltip({ text, size = 'sm', className = '' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, position: 'above' as 'above' | 'below' });
  const iconRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const updateCoords = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const tooltipWidth = 224; // w-56 = 14rem = 224px
    const showBelow = rect.top < 130;

    // Center tooltip horizontally on the icon
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;

    setCoords({
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      left,
      position: showBelow ? 'below' : 'above',
    });
  }, []);

  useEffect(() => {
    if (!show) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  const handleShow = () => {
    updateCoords();
    setShow(true);
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const tooltipId = `tooltip-${text.slice(0, 10).replace(/\s/g, '')}`;

  const tooltip = show && mounted ? createPortal(
    <div
      id={tooltipId}
      role="tooltip"
      className="fixed z-[9999] w-56 bg-ono-gray-dark text-white text-xs rounded-lg p-3 shadow-xl leading-relaxed pointer-events-none"
      style={{
        direction: 'rtl',
        top: coords.position === 'below' ? `${coords.top}px` : undefined,
        bottom: coords.position === 'above' ? `${window.innerHeight - coords.top}px` : undefined,
        left: `${coords.left}px`,
      }}
    >
      {text}
    </div>,
    document.body
  ) : null;

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (show) setShow(false); else handleShow(); }}
        onMouseEnter={handleShow}
        onMouseLeave={() => setShow(false)}
        className="text-ono-gray/60 hover:text-ono-green transition-colors cursor-help"
        aria-label="עזרה"
        aria-describedby={show ? tooltipId : undefined}
      >
        <HelpCircle className={iconSize} />
      </button>
      {tooltip}
    </span>
  );
}
