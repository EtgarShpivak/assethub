// Ono Academic College Brand Design Tokens
// All color values derived from the official brand identity

export const colors = {
  green: '#8BBF3C',
  greenDark: '#6E9A2D',
  greenLight: '#EEF7DC',
  orange: '#E8751A',
  orangeLight: '#FDF0E6',
  gray: '#898989',
  grayDark: '#3D3D3D',
  grayLight: '#F4F4F4',
  white: '#FFFFFF',
  navy: '#1E3A2F',
} as const;

export const platformColors = {
  meta: '#1877F2',
  google: '#EA4335',
  tiktok: '#FF0050',
  linkedin: '#0077B5',
} as const;

export const typography = {
  fontFamily: "'Heebo', sans-serif",
  sizes: {
    body: '14px',
    label: '13px',
    headingLg: '32px',
    headingMd: '24px',
    headingSm: '18px',
  },
} as const;

export const shadows = {
  card: '0 1px 4px rgba(0,0,0,0.07)',
} as const;

export const borders = {
  card: '1px solid #E8E8E8',
  radius: {
    card: '8px',
    button: '6px',
    pill: '9999px',
  },
} as const;
