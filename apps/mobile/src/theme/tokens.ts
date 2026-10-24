/**
 * สีของดีไซน์ Soft Bubble — ชุดเดียวกับเว็บโปรโมท (apps/web/src/app/globals.css)
 * light = ขาวอุ่น (Cream) + พาสเทลหม่น (Rose / Lilac / Sage)
 * gold  = ดำทอง (Night / Gold)
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
  lilacDeep: '#5e4b8b',
  lilacTint: '#eeebf3',
  sage: '#bbdacb',
  sageDeep: '#2c6b52',
  sageCheck: '#3e9a74',
  sageTint: '#e6f0ea',
  gold: '#d6b36a',
  goldTint: '#f9f3e3',
  night: '#0f0e0d',
  nightCard: '#1b1917',
  nightElevated: '#25221f',
  nightInk: '#f2eadb',
  nightMuted: '#a69d90',
} as const;

export type ThemeName = 'light' | 'gold';

export interface AppColors {
  background: string;
  subtle: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  lineStrong: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  accentTint: string;
  lilac: string;
  lilacDeep: string;
  lilacTint: string;
  sage: string;
  sageDeep: string;
  sageTint: string;
  gold: string;
  goldTint: string;
  danger: string;
}

export const themes: Record<ThemeName, AppColors> = {
  light: {
    background: palette.cream,
    subtle: '#f4eff2',
    card: palette.white,
    text: palette.ink,
    muted: palette.muted,
    line: palette.line,
    lineStrong: palette.lineStrong,
    primary: palette.ink,
    onPrimary: palette.white,
    accent: palette.roseDeep,
    accentSoft: palette.rose,
    accentTint: palette.roseTint,
    lilac: palette.lilac,
    lilacDeep: palette.lilacDeep,
    lilacTint: palette.lilacTint,
    sage: palette.sage,
    sageDeep: palette.sageDeep,
    sageTint: palette.sageTint,
    gold: palette.gold,
    goldTint: palette.goldTint,
    danger: palette.roseDeep,
  },
  gold: {
    background: palette.night,
    subtle: palette.nightElevated,
    card: palette.nightCard,
    text: palette.nightInk,
    muted: palette.nightMuted,
    line: '#2a2724',
    lineStrong: '#3a3530',
    primary: palette.gold,
    onPrimary: palette.night,
    accent: palette.gold,
    accentSoft: palette.gold,
    accentTint: '#2a2419',
    lilac: palette.lilac,
    lilacDeep: '#d8d0f0',
    lilacTint: '#252232',
    sage: palette.sage,
    sageDeep: '#9ed4bc',
    sageTint: '#1c2923',
    gold: palette.gold,
    goldTint: '#2a2419',
    danger: palette.rose,
  },
};

export const radius = { xs: 8, sm: 12, md: 18, lg: 26, xl: 32, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 } as const;
