export interface PlatformFormat {
  name: string;
  dims: string;
  types: ('image' | 'video')[];
}

export const PLATFORM_SPECS: Record<string, PlatformFormat[]> = {
  meta: [
    { name: 'Feed Square', dims: '1080×1080', types: ['image'] },
    { name: 'Story / Reels', dims: '1080×1920', types: ['image', 'video'] },
    { name: 'Feed Landscape', dims: '1200×628', types: ['image'] },
    { name: 'Carousel Tile', dims: '1080×1080', types: ['image'] },
  ],
  google: [
    { name: 'Leaderboard', dims: '728×90', types: ['image'] },
    { name: 'Medium Rectangle', dims: '300×250', types: ['image'] },
    { name: 'Half Page', dims: '300×600', types: ['image'] },
    { name: 'Large Rectangle', dims: '336×280', types: ['image'] },
  ],
  tiktok: [
    { name: 'Vertical Video', dims: '1080×1920', types: ['video'] },
    { name: 'Square Video', dims: '1080×1080', types: ['video'] },
  ],
  linkedin: [
    { name: 'Single Image', dims: '1200×628', types: ['image'] },
    { name: 'Story', dims: '1080×1920', types: ['image', 'video'] },
  ],
};

export const PLATFORM_LABELS: Record<string, string> = {
  meta: 'META',
  google: 'Google Ads',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

export const DOMAIN_CONTEXTS = [
  { value: 'social', label: 'סושיאל' },
  { value: 'display', label: 'שילוט ודיספליי' },
  { value: 'print', label: 'דפוס' },
  { value: 'branding', label: 'מיתוג' },
  { value: 'internal', label: 'פנימי' },
  { value: 'newsletter', label: 'ידיעונים וברושורים' },
] as const;

export const PLATFORMS = [
  { value: 'meta', label: 'META', color: '#1877F2' },
  { value: 'google', label: 'Google Ads', color: '#EA4335' },
  { value: 'tiktok', label: 'TikTok', color: '#FF0050' },
  { value: 'linkedin', label: 'LinkedIn', color: '#0077B5' },
] as const;

export const FILE_TYPES = [
  { value: 'image', label: 'תמונה' },
  { value: 'video', label: 'וידאו' },
  { value: 'pdf', label: 'PDF' },
  { value: 'newsletter', label: 'ידיעונים וברושורים' },
  { value: 'other', label: 'אחר' },
] as const;

export const DATE_PRESETS = [
  { value: 'last_week', label: 'שבוע אחרון' },
  { value: 'last_month', label: 'חודש אחרון' },
  { value: 'prev_month', label: 'חודש קודם' },
  { value: 'last_year', label: 'שנה אחורה' },
  { value: 'this_year', label: 'השנה' },
] as const;

export function getDatePresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (preset) {
    case 'last_week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'last_month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'prev_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    case 'last_year': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'this_year': {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }
    default:
      return { from: '', to: '' };
  }
}

// Validation helpers
export function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

export function isValidEnglishCode(text: string): boolean {
  return /^[a-z0-9-]*$/.test(text);
}

export const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:5', label: '4:5' },
] as const;

export const INITIATIVE_STATUSES = [
  { value: 'active', label: 'פעיל', color: 'green' },
  { value: 'ongoing', label: 'מתמשך', color: 'blue' },
  { value: 'ended', label: 'הסתיים', color: 'gray' },
  { value: 'archived', label: 'בארכיון', color: 'neutral' },
] as const;

export const ASSET_TYPES = [
  { value: 'production', label: 'חומרי הפקה' },
  { value: 'source', label: 'חומרי מקור' },
  { value: 'draft', label: 'טיוטות' },
] as const;
