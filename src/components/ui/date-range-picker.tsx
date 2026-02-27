'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string, presetLabel?: string) => void;
}

const PRESETS = [
  { label: 'היום', getValue: () => { const d = today(); return { from: d, to: d }; } },
  { label: 'אתמול', getValue: () => { const d = addDays(today(), -1); return { from: d, to: d }; } },
  { label: 'שבוע אחרון', getValue: () => ({ from: addDays(today(), -7), to: today() }) },
  { label: '14 ימים אחרונים', getValue: () => ({ from: addDays(today(), -14), to: today() }) },
  { label: '30 ימים אחרונים', getValue: () => ({ from: addDays(today(), -30), to: today() }) },
  { label: 'השבוע', getValue: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = addDays(today(), -dayOfWeek);
    return { from: start, to: today() };
  }},
  { label: 'שבוע קודם', getValue: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const end = addDays(today(), -dayOfWeek - 1);
    const start = addDays(today(), -dayOfWeek - 7);
    return { from: start, to: end };
  }},
  { label: 'החודש', getValue: () => {
    const now = new Date();
    return { from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today() };
  }},
  { label: 'חודש קודם', getValue: () => {
    const now = new Date();
    return {
      from: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: formatDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }},
  { label: 'השנה', getValue: () => {
    const now = new Date();
    return { from: `${now.getFullYear()}-01-01`, to: today() };
  }},
];

function today(): string {
  return formatDate(new Date());
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  // Pad to complete weeks
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function MonthCalendar({
  year, month, rangeFrom, rangeTo, selecting,
  onDayClick, onDayHover,
}: {
  year: number; month: number;
  rangeFrom: string; rangeTo: string; selecting: string | null;
  onDayClick: (date: string) => void;
  onDayHover: (date: string) => void;
}) {
  const days = getMonthData(year, month);
  const todayStr = today();

  return (
    <div className="w-[240px]">
      <div className="text-center font-bold text-sm text-ono-gray-dark mb-2">
        {MONTHS_HE[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS_HE.map(d => (
          <div key={d} className="text-center text-[10px] text-ono-gray font-medium py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-8" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isStart = dateStr === rangeFrom;
          const isEnd = dateStr === (selecting || rangeTo);
          const effectiveEnd = selecting || rangeTo;

          let isInRange = false;
          if (rangeFrom && effectiveEnd) {
            const from = rangeFrom < effectiveEnd ? rangeFrom : effectiveEnd;
            const to = rangeFrom < effectiveEnd ? effectiveEnd : rangeFrom;
            isInRange = dateStr >= from && dateStr <= to;
          }

          return (
            <div
              key={dateStr}
              className={`h-8 flex items-center justify-center text-xs cursor-pointer transition-colors
                ${isInRange && !isStart && !isEnd ? 'bg-blue-100' : ''}
                ${isStart || isEnd ? 'bg-blue-600 text-white rounded' : ''}
                ${!isInRange && !isStart && !isEnd ? 'hover:bg-ono-gray-light rounded' : ''}
                ${isToday && !isStart && !isEnd ? 'font-bold text-ono-green' : ''}
              `}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => onDayHover(dateStr)}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ dateFrom, dateTo, onDateChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Calendar navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Selection state
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [tempTo, setTempTo] = useState(dateTo);
  const [selectingStart, setSelectingStart] = useState(true);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
  }, [dateFrom, dateTo]);

  // Click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const nextMonth2 = viewMonth === 11
    ? { month: 0, year: viewYear + 1 }
    : { month: viewMonth + 1, year: viewYear };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (selectingStart) {
      setTempFrom(dateStr);
      setTempTo('');
      setSelectingStart(false);
      setActivePreset(null);
    } else {
      if (dateStr < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(dateStr);
      } else {
        setTempTo(dateStr);
      }
      setSelectingStart(true);
    }
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const { from, to } = preset.getValue();
    setTempFrom(from);
    setTempTo(to);
    setActivePreset(preset.label);
    setSelectingStart(true);
  };

  const handleApply = () => {
    onDateChange(tempFrom, tempTo, activePreset || undefined);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
    setOpen(false);
  };

  const displayText = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString('he-IL')} — ${new Date(dateTo).toLocaleDateString('he-IL')}`
    : dateFrom
      ? new Date(dateFrom).toLocaleDateString('he-IL')
      : 'בחר טווח תאריכים';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 border rounded-md p-2 text-sm transition-colors ${
          open ? 'border-ono-green ring-2 ring-ono-green/20' : 'border-[#E8E8E8] hover:border-ono-green'
        } ${dateFrom ? 'text-ono-gray-dark' : 'text-ono-gray'}`}
      >
        <Calendar className="w-4 h-4 text-ono-gray shrink-0" />
        <span className="truncate">{displayText}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-[#E8E8E8] rounded-lg shadow-xl flex" dir="ltr">
          {/* Presets sidebar */}
          <div className="w-44 border-r border-[#E8E8E8] py-2 max-h-[380px] overflow-auto">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                className={`w-full text-right px-4 py-2 text-sm transition-colors ${
                  activePreset === preset.label
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-ono-gray-dark hover:bg-ono-gray-light/50'
                }`}
                dir="rtl"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendars + Actions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-ono-gray-light"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex-1" />
              <button onClick={handleNextMonth} className="p-1 rounded hover:bg-ono-gray-light"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-6">
              <MonthCalendar
                year={viewYear} month={viewMonth}
                rangeFrom={tempFrom} rangeTo={tempTo}
                selecting={!selectingStart ? hoverDate : null}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
              <MonthCalendar
                year={nextMonth2.year} month={nextMonth2.month}
                rangeFrom={tempFrom} rangeTo={tempTo}
                selecting={!selectingStart ? hoverDate : null}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
            </div>

            {/* Date display + actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E8E8E8]">
              <div className="flex items-center gap-2 text-xs text-ono-gray" dir="rtl">
                <span className="px-2 py-1 border border-[#E8E8E8] rounded bg-ono-gray-light/50 min-w-[90px] text-center">
                  {tempFrom ? new Date(tempFrom).toLocaleDateString('he-IL') : '—'}
                </span>
                <span>עד</span>
                <span className="px-2 py-1 border border-[#E8E8E8] rounded bg-ono-gray-light/50 min-w-[90px] text-center">
                  {tempTo ? new Date(tempTo).toLocaleDateString('he-IL') : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs">ביטול</Button>
                <Button size="sm" onClick={handleApply} disabled={!tempFrom || !tempTo} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">עדכן</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
