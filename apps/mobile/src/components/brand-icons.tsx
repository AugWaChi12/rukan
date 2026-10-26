import { Image } from 'expo-image';
import { memo } from 'react';

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function SvgIcon({ svg, size = 24 }: { svg: string; size?: number }) {
  return (
    <Image
      source={{ uri: svgDataUri(svg) }}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={0}
    />
  );
}

export const BrandLogoMark = memo(function BrandLogoMark({ size = 40 }: { size?: number }) {
  const svg = `<svg width="64" height="64" viewBox="0 0 76 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="28" r="22" fill="#E9A9BF" />
    <path d="M10 42 L6 56 L20 47 Z" fill="#E9A9BF" />
    <path d="M15 17 A16 16 0 0 1 26 12" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="50" cy="28" r="22" fill="#C7BEE3" />
    <path d="M66 42 L70 56 L56 47 Z" fill="#C7BEE3" />
    <path d="M61 17 A16 16 0 0 0 50 12" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="2.2" stroke-linecap="round" />
    <path d="M38 13 a22 22 0 0 1 0 30 a22 22 0 0 1 0 -30 z" fill="#2E2238" />
    <path d="M38 21.5 C38.8 25.2 40.3 26.7 44 27.5 C40.3 28.3 38.8 29.8 38 33.5 C37.2 29.8 35.7 28.3 32 27.5 C35.7 26.7 37.2 25.2 38 21.5 Z" fill="#F2C66D" />
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TabSpaceIcon = memo(function TabSpaceIcon({
  size = 26,
  focused = false,
}: {
  size?: number;
  focused?: boolean;
}) {
  const stroke = focused ? '#2E2238' : '#7B6F85';
  const ring = focused ? '#D4688E' : '#9B8EA6';
  const fill = focused ? '#F2ECF9' : 'none';
  const star = focused ? '#F2C66D' : 'none';
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="34" r="15" fill="${fill}" stroke="${stroke}" stroke-width="4" />
    <path d="M10 40C7.5 35.8 15.2 28.4 28.5 23.6C41.8 18.8 54.5 18.4 57 22.6C59.5 26.8 51.8 34.2 38.5 39" stroke="${ring}" stroke-width="4" stroke-linecap="round" />
    <path d="M46 10L48.2 15.8L54 18L48.2 20.2L46 26L43.8 20.2L38 18L43.8 15.8L46 10Z" fill="${star}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
    ${focused ? '<circle cx="16" cy="18" r="3.5" fill="#E9A9BF" />' : ''}
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TabDropIcon = memo(function TabDropIcon({
  size = 26,
  focused = false,
}: {
  size?: number;
  focused?: boolean;
}) {
  const stroke = focused ? '#2E2238' : '#7B6F85';
  const backFill = focused ? '#F2ECF9' : 'none';
  const frontFill = focused ? '#FFF9F5' : 'none';
  const heartFill = focused ? '#E9A9BF' : 'none';
  const heartStroke = focused ? '#D4688E' : '#7B6F85';
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="14" width="28" height="38" rx="8" transform="rotate(-10 12 14)" fill="${backFill}" stroke="${stroke}" stroke-width="3.6" />
    <rect x="22" y="12" width="30" height="40" rx="8" transform="rotate(6 22 12)" fill="${frontFill}" stroke="${stroke}" stroke-width="4" />
    <path d="M36.5 26C34.2 23.6 30.5 24 29 26.8C27.5 24 23.8 23.6 21.5 26C19.2 28.4 19.5 32.4 22.2 35.2L29 41.5L35.8 35.2C38.5 32.4 38.8 28.4 36.5 26Z" transform="translate(8, 2)" fill="${heartFill}" stroke="${heartStroke}" stroke-width="3.2" stroke-linejoin="round" />
    ${focused ? '<circle cx="53" cy="14" r="3.5" fill="#F2C66D" />' : ''}
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TabChatsIcon = memo(function TabChatsIcon({
  size = 26,
  focused = false,
}: {
  size?: number;
  focused?: boolean;
}) {
  const stroke = focused ? '#2E2238' : '#7B6F85';
  const leftFill = focused ? '#FCEEF3' : 'none';
  const rightFill = focused ? '#E9A9BF' : 'none';
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 14C15.611 14 8 21.163 8 30C8 33.82 9.42 37.33 11.8 40.08L9.5 48.5L17.9 44.8C20.1 45.58 22.5 46 25 46C34.389 46 42 38.837 42 30C42 21.163 34.389 14 25 14Z" fill="${leftFill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />
    <path d="M39 18C48.389 18 56 25.163 56 34C56 37.82 54.58 41.33 52.2 44.08L54.5 52.5L46.1 48.8C43.9 49.58 41.5 50 39 50C29.611 50 22 42.837 22 34C22 25.163 29.611 18 39 18Z" fill="${rightFill}" fill-opacity="0.88" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />
    <path d="M32 25L33.8 30.2L39 32L33.8 33.8L32 39L30.2 33.8L25 32L30.2 30.2L32 25Z" fill="${focused ? '#2E2238' : '#9B8EA6'}" />
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TabNotificationsIcon = memo(function TabNotificationsIcon({
  size = 26,
  focused = false,
}: {
  size?: number;
  focused?: boolean;
}) {
  const stroke = focused ? '#2E2238' : '#7B6F85';
  const bellFill = focused ? '#FFF4F7' : 'none';
  const rimStroke = focused ? '#D4688E' : stroke;
  const clapperFill = focused ? '#F2C66D' : 'none';
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10C29.8 10 28 11.8 28 14V16.3C21.6 18.2 17 24.1 17 31V41L12 46V49H52V46L47 41V31C47 24.1 42.4 18.2 36 16.3V14C36 11.8 34.2 10 32 10Z" fill="${bellFill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />
    <path d="M12 49H52" stroke="${rimStroke}" stroke-width="4" stroke-linecap="round" />
    <path d="M26 49C26.5 52.5 29 55 32 55C35 55 37.5 52.5 38 49" fill="${clapperFill}" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round" />
    ${focused ? '<circle cx="48" cy="18" r="4.5" fill="#E9A9BF" stroke="#2E2238" stroke-width="2.5" /><path d="M48 11L49.2 13.8L52 15L49.2 16.2L48 19L46.8 16.2L44 15L46.8 13.8L48 11Z" fill="#F2C66D" />' : ''}
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TabMeIcon = memo(function TabMeIcon({
  size = 26,
  focused = false,
}: {
  size?: number;
  focused?: boolean;
}) {
  const stroke = focused ? '#2E2238' : '#7B6F85';
  const ring = focused ? '#D4688E' : '#B5A8BF';
  const headFill = focused ? '#F2ECF9' : 'none';
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="23" fill="${focused ? '#FFF9F5' : 'none'}" stroke="${ring}" stroke-width="3.5" stroke-dasharray="8 5" />
    <circle cx="32" cy="25" r="8.5" fill="${headFill}" stroke="${stroke}" stroke-width="4" />
    <path d="M17 48C19.5 40.5 25.2 37 32 37C38.8 37 44.5 40.5 47 48" stroke="${stroke}" stroke-width="4" stroke-linecap="round" />
    ${focused ? '<circle cx="47" cy="17" r="7" fill="#F2C66D" stroke="#2E2238" stroke-width="3" />' : ''}
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const RukanCoinIcon = memo(function RukanCoinIcon({ size = 22 }: { size?: number }) {
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="RukanCoinGold" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFEBA8" />
        <stop offset="50%" stop-color="#F2C66D" />
        <stop offset="100%" stop-color="#C88A1E" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#RukanCoinGold)" stroke="#2E2238" stroke-width="3.5" />
    <circle cx="32" cy="32" r="20" stroke="#7A5210" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="4 3" />
    <circle cx="27" cy="32" r="9" fill="#FFF9E6" fill-opacity="0.85" stroke="#2E2238" stroke-width="2.5" />
    <circle cx="37" cy="32" r="9" fill="#E9A9BF" fill-opacity="0.9" stroke="#2E2238" stroke-width="2.5" />
    <path d="M32 26L33.5 30.5L38 32L33.5 33.5L32 38L30.5 33.5L26 32L30.5 30.5L32 26Z" fill="#2E2238" />
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const TierPassIcon = memo(function TierPassIcon({
  tier,
  size = 28,
}: {
  tier: 'free' | 'gold' | 'premium';
  size?: number;
}) {
  if (tier === 'premium') {
    const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="VipDiamondGrad" x1="14" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FFD4E4" />
          <stop offset="50%" stop-color="#D4688E" />
          <stop offset="100%" stop-color="#7B5EA7" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="#2E2238" stroke="#F2C66D" stroke-width="3.5" />
      <path d="M23 20H41L48 29L32 47L16 29L23 20Z" fill="url(#VipDiamondGrad)" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round" />
      <path d="M16 29H48M25 20L32 47L39 20" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2" stroke-linejoin="round" />
      <path d="M47 11L48.8 15.2L53 17L48.8 18.8L47 23L45.2 18.8L41 17L45.2 15.2L47 11Z" fill="#F2C66D" />
    </svg>`;
    return <SvgIcon svg={svg} size={size} />;
  }

  if (tier === 'gold') {
    const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="52" height="52" rx="16" fill="#FFF6DC" stroke="#B67E15" stroke-width="3.5" />
      <path d="M16 42L19 24L27.5 31L32 20L36.5 31L45 24L48 42H16Z" fill="#F2C66D" stroke="#2E2238" stroke-width="3.2" stroke-linejoin="round" />
      <circle cx="32" cy="17" r="3" fill="#D4688E" />
      <circle cx="18" cy="21" r="2.5" fill="#F2C66D" />
      <circle cx="46" cy="21" r="2.5" fill="#F2C66D" />
    </svg>`;
    return <SvgIcon svg={svg} size={size} />;
  }

  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="52" height="52" rx="16" fill="#E8F4EE" stroke="#2C6B52" stroke-width="3.5" />
    <path d="M32 46V26" stroke="#2C6B52" stroke-width="3.5" stroke-linecap="round" />
    <path d="M32 30C32 22 40 18 46 20C46 28 40 32 32 30Z" fill="#8CC7AE" stroke="#2C6B52" stroke-width="3" stroke-linejoin="round" />
    <path d="M32 34C32 27 25 23 19 25C19 32 25 36 32 34Z" fill="#B8E0CE" stroke="#2C6B52" stroke-width="3" stroke-linejoin="round" />
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});

export const AiSparkleIcon = memo(function AiSparkleIcon({ size = 18 }: { size?: number }) {
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6L37.5 24.5L56 30L37.5 35.5L32 54L26.5 35.5L8 30L26.5 24.5L32 6Z" fill="#F2C66D" stroke="#2E2238" stroke-width="3.5" stroke-linejoin="round" />
    <circle cx="50" cy="14" r="4" fill="#D4688E" />
  </svg>`;
  return <SvgIcon svg={svg} size={size} />;
});
