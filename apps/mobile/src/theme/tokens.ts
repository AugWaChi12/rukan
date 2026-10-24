/**
 * สีของดีไซน์ Soft Bubble — ชุดเดียวกับเว็บ (apps/web/src/app/globals.css)
 * light = ขาวอุ่น + พาสเทลหม่น · gold = ดำทอง
 */
export const palette = {
  ink: '#2e2238',
  muted: '#76687f',
  cream: '#faf8f7',
  white: '#ffffff',
  line: '#ece6e9',
  lineStrong: '#e3dde1',
  rose: '#e9a9bf',
  roseDeep: '#c23a72',
  roseTint: '#f5e9ee',
  lilac: '#c7bee3',
  lilacTint: '#eeebf3',
  sage: '#bbdacb',
  sageTint: '#e6f0ea',
  gold: '#d6b36a',
  night: '#0f0e0d',
  nightCard: '#1b1917',
  nightInk: '#f2eadb',
  nightMuted: '#a69d90',
} as const;

export type ThemeName = 'light' | 'gold';

export interface AppColors {
  background: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentTint: string;
  danger: string;
}

export const themes: Record<ThemeName, AppColors> = {
  light: {
    background: palette.cream,
    card: palette.white,
    text: palette.ink,
    muted: palette.muted,
    line: palette.line,
    primary: palette.ink,
    onPrimary: palette.white,
    accent: palette.roseDeep,
    accentTint: palette.roseTint,
    danger: palette.roseDeep,
  },
  gold: {
    background: palette.night,
    card: palette.nightCard,
    text: palette.nightInk,
    muted: palette.nightMuted,
    line: '#2a2724',
    primary: palette.gold,
    onPrimary: palette.night,
    accent: palette.gold,
    accentTint: '#2a2419',
    danger: palette.rose,
  },
};

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
