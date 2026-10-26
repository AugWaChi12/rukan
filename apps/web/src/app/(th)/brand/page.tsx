'use client';

import { useState } from 'react';
import { LogoMark } from '@/components/landing/icons';

type BrandAsset = {
  id: string;
  title: string;
  subtitle: string;
  category: 'logo' | 'tab' | 'pass' | 'feature';
  fileName: string;
  viewBox: string;
  svg: string;
};

const BRAND_ASSETS: BrandAsset[] = [
  {
    id: 'logo-a',
    title: 'Concept A · Twin Soul Bubbles (Recommended)',
    subtitle:
      'สองฟองคำพูดแบบ Liquid Glass หันเข้าหากัน ส่วนที่ซ้อนทับตรงกลางเกิดประกายดาว 4 แฉก “รู้กันแค่เรา”',
    category: 'logo',
    fileName: 'logo-concept-a-twin-soul.svg',
    viewBox: '0 0 512 512',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="BgSquircle" x1="64" y1="32" x2="448" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2E2238" />
      <stop offset="55%" stop-color="#1E1626" />
      <stop offset="100%" stop-color="#140E1A" />
    </linearGradient>
    <linearGradient id="RoseBubbleGrad" x1="96" y1="128" x2="296" y2="348" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFD0E0" />
      <stop offset="50%" stop-color="#E9A9BF" />
      <stop offset="100%" stop-color="#C96A8B" />
    </linearGradient>
    <linearGradient id="LilacBubbleGrad" x1="216" y1="128" x2="416" y2="348" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E5DFFF" />
      <stop offset="50%" stop-color="#C7BEE3" />
      <stop offset="100%" stop-color="#8E7EC0" />
    </linearGradient>
    <linearGradient id="OverlapCoreGrad" x1="256" y1="162" x2="256" y2="322" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B2B4A" />
      <stop offset="100%" stop-color="#1F1629" />
    </linearGradient>
    <linearGradient id="GoldSparkGrad" x1="232" y1="218" x2="280" y2="266" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF3C4" />
      <stop offset="50%" stop-color="#F2C66D" />
      <stop offset="100%" stop-color="#D99B26" />
    </linearGradient>
  </defs>
  <g id="Rukan-Logo-Concept-A-Twin-Soul">
    <rect id="App-Icon-Squircle" x="24" y="24" width="464" height="464" rx="112" fill="url(#BgSquircle)" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="4" />
    <g id="Bubble-Left-Rose">
      <path d="M198 132C136.144 132 86 182.144 86 244C86 272.42 96.578 298.366 114.012 318.106L94.5 366.5L146.842 344.205C162.502 351.773 180.06 356 198 356C259.856 356 310 305.856 310 244C310 182.144 259.856 132 198 132Z" fill="url(#RoseBubbleGrad)" />
      <path d="M132 178C149 158 173 148 198 148" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="8" stroke-linecap="round" />
    </g>
    <g id="Bubble-Right-Lilac">
      <path d="M314 132C375.856 132 426 182.144 426 244C426 272.42 415.422 298.366 397.988 318.106L417.5 366.5L365.158 344.205C349.498 351.773 331.94 356 314 356C252.144 356 202 305.856 202 244C202 182.144 252.144 132 314 132Z" fill="url(#LilacBubbleGrad)" />
      <path d="M380 178C363 158 339 148 314 148" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="8" stroke-linecap="round" />
    </g>
    <g id="Intersection-Rukan-Zone">
      <path d="M256 148.3C288.2 167.8 310 203.3 310 244C310 284.7 288.2 320.2 256 339.7C223.8 320.2 202 284.7 202 244C202 203.3 223.8 167.8 256 148.3Z" fill="url(#OverlapCoreGrad)" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="3" />
      <path id="Center-Spark-Star" d="M256 202C259.8 223.5 268.5 232.2 290 236C268.5 239.8 259.8 248.5 256 270C252.2 248.5 243.5 239.8 222 236C243.5 232.2 252.2 223.5 256 202Z" fill="url(#GoldSparkGrad)" />
      <circle id="Spark-Dot" cx="256" cy="292" r="5" fill="#F2C66D" opacity="0.85" />
    </g>
  </g>
</svg>`,
  },
  {
    id: 'logo-b',
    title: 'Concept B · Whisper Orbit',
    subtitle: 'ฟองคำพูดคู่ผสานเป็นรูปหัวใจ ล้อมด้วยวงโคจรดาวเสาร์ (เชื่อมโลก Space เข้ากับแชท 1:1)',
    category: 'logo',
    fileName: 'logo-concept-b-whisper-orbit.svg',
    viewBox: '0 0 512 512',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="OrbitBg" x1="40" y1="24" x2="472" y2="488" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFF9F5" />
      <stop offset="100%" stop-color="#F5ECF9" />
    </linearGradient>
    <linearGradient id="OrbitHeartGrad" x1="144" y1="140" x2="368" y2="372" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#D4688E" />
      <stop offset="52%" stop-color="#E9A9BF" />
      <stop offset="100%" stop-color="#9A88C9" />
    </linearGradient>
    <linearGradient id="OrbitRingGrad" x1="76" y1="300" x2="436" y2="212" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2E2238" />
      <stop offset="50%" stop-color="#D4688E" />
      <stop offset="100%" stop-color="#F2C66D" />
    </linearGradient>
  </defs>
  <g id="Rukan-Logo-Concept-B-Whisper-Orbit">
    <rect id="App-Icon-Squircle" x="24" y="24" width="464" height="464" rx="112" fill="url(#OrbitBg)" stroke="#E6DCEB" stroke-width="4" />
    <g id="Space-Orbit-Back">
      <ellipse cx="256" cy="262" rx="186" ry="64" transform="rotate(-18 256 262)" stroke="url(#OrbitRingGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="220 180" />
    </g>
    <g id="Heart-Twin-Bubble">
      <path d="M256 368C256 368 128 294 128 206C128 161.817 163.817 126 208 126C231.6 126 252.8 136.2 267.4 152.5C251.2 172.4 244 198.2 248.5 224.5C254.2 257.8 282.5 282.4 316.2 284.8C298.8 320.2 256 368 256 368Z" fill="url(#OrbitHeartGrad)" />
      <path d="M256 368C256 368 384 294 384 206C384 161.817 348.183 126 304 126C280.4 126 259.2 136.2 244.6 152.5" fill="#2E2238" fill-opacity="0.9" />
      <circle cx="204" cy="204" r="14" fill="#FFFFFF" />
      <circle cx="308" cy="204" r="14" fill="#F2C66D" />
    </g>
    <g id="Space-Orbit-Front">
      <path d="M88 316C116 350 202 356 292 326C382 296 438 242 424 204" stroke="url(#OrbitRingGrad)" stroke-width="16" stroke-linecap="round" />
      <circle id="Satellite-Bubble" cx="394" cy="176" r="22" fill="#F2C66D" stroke="#2E2238" stroke-width="6" />
    </g>
  </g>
</svg>`,
  },
  {
    id: 'logo-c',
    title: 'Concept C · Thai “ร” Bubble Monogram',
    subtitle: 'เส้นสายอักษรไทย “ร” (รู้กัน) ที่ม้วนต่อเนื่องเป็นกรอบฟองแชทและรอยยิ้มแบบมินิมอล',
    category: 'logo',
    fileName: 'logo-concept-c-thai-rukan.svg',
    viewBox: '0 0 512 512',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="MonogramBg" x1="32" y1="32" x2="480" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2E2238" />
      <stop offset="100%" stop-color="#191220" />
    </linearGradient>
    <linearGradient id="RibbonGrad" x1="136" y1="120" x2="376" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFD4E2" />
      <stop offset="48%" stop-color="#E9A9BF" />
      <stop offset="100%" stop-color="#C7BEE3" />
    </linearGradient>
  </defs>
  <g id="Rukan-Logo-Concept-C-Thai-Monogram">
    <rect id="App-Icon-Squircle" x="24" y="24" width="464" height="464" rx="112" fill="url(#MonogramBg)" />
    <g id="Outer-Chat-Halo" opacity="0.18">
      <circle cx="256" cy="256" r="156" stroke="#E9A9BF" stroke-width="24" />
    </g>
    <g id="Thai-Ror-Rua-Bubble-Path">
      <path d="M206 376V264C206 230.863 232.863 204 266 204C294.719 204 318 180.719 318 152C318 123.281 294.719 100 266 100H216C165.19 100 124 141.19 124 192V292C124 342.81 165.19 384 216 384H344L384 408L368 364C382.8 344.2 392 319.2 392 292C392 252 366 218 330 206" stroke="url(#RibbonGrad)" stroke-width="38" stroke-linecap="round" stroke-linejoin="round" />
      <circle id="Ror-Eye-Loop" cx="264" cy="152" r="22" fill="#F2C66D" />
      <path id="Sparkle-Accent" d="M352 124L358 142L376 148L358 154L352 172L346 154L328 148L346 142L352 124Z" fill="#F2C66D" />
    </g>
  </g>
</svg>`,
  },
  {
    id: 'tab-space',
    title: 'Tab 1 · Space (พื้นที่นามแฝง)',
    subtitle: 'ดาวเคราะห์วงแหวนพร้อมประกายดาวกระซิบ',
    category: 'tab',
    fileName: 'icon-tab-space.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Tab-Space">
    <circle id="Planet-Core" cx="32" cy="34" r="15" fill="#F2ECF9" stroke="#2E2238" stroke-width="3.5" />
    <path id="Orbit-Ring" d="M10 40C7.5 35.8 15.2 28.4 28.5 23.6C41.8 18.8 54.5 18.4 57 22.6C59.5 26.8 51.8 34.2 38.5 39" stroke="#D4688E" stroke-width="3.5" stroke-linecap="round" />
    <path id="Whisper-Star" d="M46 10L48.2 15.8L54 18L48.2 20.2L46 26L43.8 20.2L38 18L43.8 15.8L46 10Z" fill="#F2C66D" stroke="#2E2238" stroke-width="2.5" stroke-linejoin="round" />
    <circle id="Moon-Dot" cx="16" cy="18" r="3.5" fill="#E9A9BF" />
  </g>
</svg>`,
  },
  {
    id: 'tab-drop',
    title: 'Tab 2 · Swipe Deck (ปัด & ฟองสลาย)',
    subtitle: 'การ์ดคู่พร้อมหัวใจฟองอากาศลอยขึ้น',
    category: 'tab',
    fileName: 'icon-tab-drop.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Tab-Drop-Swipe">
    <rect id="Back-Card" x="12" y="14" width="28" height="38" rx="8" transform="rotate(-10 12 14)" fill="#F2ECF9" stroke="#2E2238" stroke-width="3.2" />
    <rect id="Front-Card" x="22" y="12" width="30" height="40" rx="8" transform="rotate(6 22 12)" fill="#FFF9F5" stroke="#2E2238" stroke-width="3.5" />
    <path id="Floating-Bubble-Heart" d="M36.5 26C34.2 23.6 30.5 24 29 26.8C27.5 24 23.8 23.6 21.5 26C19.2 28.4 19.5 32.4 22.2 35.2L29 41.5L35.8 35.2C38.5 32.4 38.8 28.4 36.5 26Z" transform="translate(8, 2)" fill="#E9A9BF" stroke="#D4688E" stroke-width="2.8" stroke-linejoin="round" />
    <circle id="Bubble-Particle-1" cx="53" cy="14" r="3.5" fill="#F2C66D" />
    <circle id="Bubble-Particle-2" cx="56" cy="23" r="2" fill="#D4688E" />
  </g>
</svg>`,
  },
  {
    id: 'tab-chats',
    title: 'Tab 3 · Chats (แชทรู้กัน)',
    subtitle: 'ฟองแชทคู่ซ้อนกันพร้อมดาว 4 แฉกตรงกลาง',
    category: 'tab',
    fileName: 'icon-tab-chats.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Tab-Chats">
    <path id="Bubble-Left" d="M25 14C15.611 14 8 21.163 8 30C8 33.82 9.42 37.33 11.8 40.08L9.5 48.5L17.9 44.8C20.1 45.58 22.5 46 25 46C34.389 46 42 38.837 42 30C42 21.163 34.389 14 25 14Z" fill="#FCEEF3" stroke="#2E2238" stroke-width="3.5" stroke-linejoin="round" />
    <path id="Bubble-Right" d="M39 18C48.389 18 56 25.163 56 34C56 37.82 54.58 41.33 52.2 44.08L54.5 52.5L46.1 48.8C43.9 49.58 41.5 50 39 50C29.611 50 22 42.837 22 34C22 25.163 29.611 18 39 18Z" fill="#E9A9BF" fill-opacity="0.85" stroke="#2E2238" stroke-width="3.5" stroke-linejoin="round" />
    <path id="Rukan-Center-Spark" d="M32 25L33.8 30.2L39 32L33.8 33.8L32 39L30.2 33.8L25 32L30.2 30.2L32 25Z" fill="#2E2238" />
  </g>
</svg>`,
  },
  {
    id: 'tab-me',
    title: 'Tab 4 · Me (โปรไฟล์ยืนยันตัวตน)',
    subtitle: 'วงแหวนออร่า + ตราดาวรับรองตัวจริง',
    category: 'tab',
    fileName: 'icon-tab-me.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Tab-Me">
    <circle id="Aura-Ring" cx="32" cy="32" r="23" fill="#FFF9F5" stroke="#E9A9BF" stroke-width="3" stroke-dasharray="8 5" />
    <circle id="Avatar-Head" cx="32" cy="25" r="8.5" fill="#F2ECF9" stroke="#2E2238" stroke-width="3.5" />
    <path id="Avatar-Shoulders" d="M17 48C19.5 40.5 25.2 37 32 37C38.8 37 44.5 40.5 47 48" stroke="#2E2238" stroke-width="3.5" stroke-linecap="round" />
    <circle id="Verified-Star-Badge" cx="47" cy="17" r="7" fill="#F2C66D" stroke="#2E2238" stroke-width="2.8" />
  </g>
</svg>`,
  },
  {
    id: 'coin-rukan',
    title: 'Rukan Coin (เหรียญรู้กัน)',
    subtitle: 'เหรียญทองปั๊มนูนสัญลักษณ์สองฟองรู้กันตรงกลาง',
    category: 'pass',
    fileName: 'icon-rukan-coin.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="RukanCoinGold" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFEBA8" />
      <stop offset="50%" stop-color="#F2C66D" />
      <stop offset="100%" stop-color="#C88A1E" />
    </linearGradient>
  </defs>
  <g id="Rukan-Icon-Coin">
    <circle id="Coin-Outer" cx="32" cy="32" r="26" fill="url(#RukanCoinGold)" stroke="#2E2238" stroke-width="3.5" />
    <circle id="Coin-Inner-Rim" cx="32" cy="32" r="20" stroke="#7A5210" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="4 3" />
    <circle id="Coin-Bubble-L" cx="27" cy="32" r="9" fill="#FFF9E6" fill-opacity="0.85" stroke="#2E2238" stroke-width="2.5" />
    <circle id="Coin-Bubble-R" cx="37" cy="32" r="9" fill="#E9A9BF" fill-opacity="0.9" stroke="#2E2238" stroke-width="2.5" />
    <path id="Coin-Center-Spark" d="M32 26L33.5 30.5L38 32L33.5 33.5L32 38L30.5 33.5L26 32L30.5 30.5L32 26Z" fill="#2E2238" />
  </g>
</svg>`,
  },
  {
    id: 'pass-free',
    title: 'Free Tier Badge (ผู้ใช้ทั่วไป)',
    subtitle: 'ต้นอ่อนใบคู่ในกรอบเขียวมิ้นต์ Sage',
    category: 'pass',
    fileName: 'icon-pass-free.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Pass-Free">
    <rect id="Badge-Base" x="8" y="8" width="48" height="48" rx="16" fill="#E8F4EE" stroke="#2C6B52" stroke-width="3" />
    <path id="Sprout-Stem" d="M32 46V26" stroke="#2C6B52" stroke-width="3.5" stroke-linecap="round" />
    <path id="Leaf-Right" d="M32 30C32 22 40 18 46 20C46 28 40 32 32 30Z" fill="#8CC7AE" stroke="#2C6B52" stroke-width="3" stroke-linejoin="round" />
    <path id="Leaf-Left" d="M32 34C32 27 25 23 19 25C19 32 25 36 32 34Z" fill="#B8E0CE" stroke="#2C6B52" stroke-width="3" stroke-linejoin="round" />
  </g>
</svg>`,
  },
  {
    id: 'pass-gold',
    title: 'Gold Pass Badge (สายป๊อป โอกาสแมตช์สูง)',
    subtitle: 'มงกุฎทองประดับพลอยชมพู Rose',
    category: 'pass',
    fileName: 'icon-pass-gold.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Pass-Gold">
    <rect id="Gold-Badge-Base" x="8" y="8" width="48" height="48" rx="16" fill="#FFF6DC" stroke="#B67E15" stroke-width="3" />
    <path id="Crown-Body" d="M16 42L19 24L27.5 31L32 20L36.5 31L45 24L48 42H16Z" fill="#F2C66D" stroke="#2E2238" stroke-width="3.2" stroke-linejoin="round" />
    <circle id="Crown-Gem-Center" cx="32" cy="17" r="3" fill="#D4688E" />
    <circle id="Crown-Gem-L" cx="18" cy="21" r="2.5" fill="#F2C66D" />
    <circle id="Crown-Gem-R" cx="46" cy="21" r="2.5" fill="#F2C66D" />
  </g>
</svg>`,
  },
  {
    id: 'pass-premium',
    title: 'Premium Pass Badge (VIP + ผู้ช่วย AI ส่วนตัว)',
    subtitle: 'เพชรเจียระไนบนพื้นม่วงรัตติกาล พร้อมประกาย AI Wingman',
    category: 'pass',
    fileName: 'icon-pass-premium.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="VipDiamondGrad" x1="14" y1="14" x2="50" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFD4E4" />
      <stop offset="50%" stop-color="#D4688E" />
      <stop offset="100%" stop-color="#7B5EA7" />
    </linearGradient>
  </defs>
  <g id="Rukan-Icon-Pass-Premium-VIP-AI">
    <rect id="Vip-Badge-Base" x="8" y="8" width="48" height="48" rx="16" fill="#2E2238" stroke="#F2C66D" stroke-width="3" />
    <path id="Diamond-Gem" d="M23 20H41L48 29L32 47L16 29L23 20Z" fill="url(#VipDiamondGrad)" stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round" />
    <path id="Diamond-Facet" d="M16 29H48M25 20L32 47L39 20" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="2" stroke-linejoin="round" />
    <path id="AI-Wingman-Sparkle" d="M47 11L48.8 15.2L53 17L48.8 18.8L47 23L45.2 18.8L41 17L45.2 15.2L47 11Z" fill="#F2C66D" />
  </g>
</svg>`,
  },
  {
    id: 'feat-bubble',
    title: 'Feature · ฟองทัก (Greeting Bubble)',
    subtitle: 'ฟองอากาศลอยขึ้นพร้อมไฮไลต์แสงสะท้อน',
    category: 'feature',
    fileName: 'icon-feature-bubble.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Feature-Bubble">
    <circle id="Main-Bubble" cx="30" cy="34" r="18" fill="#FCEEF3" stroke="#D4688E" stroke-width="3.5" />
    <path id="Bubble-Highlight" d="M21 25C23.5 22 26.8 20.5 30.5 20.5" stroke="#D4688E" stroke-width="3" stroke-linecap="round" />
    <circle id="Mini-Bubble-1" cx="48" cy="18" r="6" fill="#F2ECF9" stroke="#7B5EA7" stroke-width="3" />
    <circle id="Mini-Bubble-2" cx="53" cy="31" r="3.5" fill="#F2C66D" />
  </g>
</svg>`,
  },
  {
    id: 'feat-reveal',
    title: 'Feature · เปิดรูป 3 ขั้น (Progressive Reveal)',
    subtitle: 'วงแหวน 3 ระดับจากเบลอสู่วงชัดตรงกลาง',
    category: 'feature',
    fileName: 'icon-feature-reveal.svg',
    viewBox: '0 0 64 64',
    svg: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Rukan-Icon-Feature-Progressive-Reveal">
    <circle id="Stage-1-Blur-Ring" cx="32" cy="32" r="23" stroke="#C7BEE3" stroke-width="3" stroke-dasharray="5 5" />
    <circle id="Stage-2-Half-Ring" cx="32" cy="32" r="16" stroke="#E9A9BF" stroke-width="3.2" />
    <circle id="Stage-3-Clear-Core" cx="32" cy="32" r="9" fill="#D4688E" stroke="#2E2238" stroke-width="3" />
    <circle id="Eye-Spark" cx="34.5" cy="29.5" r="2.5" fill="#FFFFFF" />
  </g>
</svg>`,
  },
];

export default function BrandKitPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stageBg, setStageBg] = useState<'cream' | 'night' | 'glass'>('cream');

  async function copySvg(id: string, svg: string) {
    await navigator.clipboard.writeText(svg);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
  }

  function downloadSvg(fileName: string, svg: string) {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const logos = BRAND_ASSETS.filter((a) => a.category === 'logo');
  const icons = BRAND_ASSETS.filter((a) => a.category !== 'logo');

  const previewSurface =
    stageBg === 'night'
      ? 'bg-[#17121E] border-[#31263F]'
      : stageBg === 'glass'
        ? 'bg-gradient-to-br from-rose-tint via-white to-lilac-tint border-white'
        : 'bg-cream border-line';

  return (
    <div className="bg-grid min-h-dvh pb-24 text-ink">
      <header className="sticky top-3 z-40 mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 pt-3">
        <div className="flex w-full items-center justify-between rounded-full border border-white/80 bg-white/85 px-5 py-2.5 shadow-[0_12px_36px_rgba(46,34,56,0.08)] backdrop-blur-xl">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <LogoMark size={32} />
            <div>
              <span className="font-display text-lg font-bold">รู้กัน · Brand & Figma Kit</span>
              <span className="ml-2 hidden rounded-full bg-rose-tint px-2.5 py-0.5 text-xs font-semibold text-rose-deep sm:inline-block">
                Vector SVG 100%
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1.5 rounded-full border border-line bg-cream p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStageBg('cream')}
              className={`rounded-full px-3 py-1.5 transition ${stageBg === 'cream' ? 'bg-white text-ink shadow-2xs' : 'text-muted'}`}
            >
              พื้นสว่าง
            </button>
            <button
              type="button"
              onClick={() => setStageBg('glass')}
              className={`rounded-full px-3 py-1.5 transition ${stageBg === 'glass' ? 'bg-white text-ink shadow-2xs' : 'text-muted'}`}
            >
              Liquid Glass
            </button>
            <button
              type="button"
              onClick={() => setStageBg('night')}
              className={`rounded-full px-3 py-1.5 transition ${stageBg === 'night' ? 'bg-ink text-white shadow-2xs' : 'text-muted'}`}
            >
              พื้นมืด
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-10 flex max-w-[1120px] flex-col gap-12 px-5">
        {/* How to paste into Figma banner */}
        <section className="flex flex-col justify-between gap-4 rounded-[28px] border border-line bg-white p-6 shadow-[0_14px_40px_rgba(46,34,56,0.05)] md:flex-row md:items-center">
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-sm font-semibold text-rose-deep">
              ✦ วิธีเอาไปแก้ไขต่อในโปรแกรม Figma
            </p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              กดปุ่ม “Copy SVG to Figma” แล้วกด{' '}
              <kbd className="rounded-lg bg-cream px-2 py-0.5 text-base">Ctrl + V</kbd> ใน Figma
              ได้เลย
            </h1>
            <p className="text-sm text-muted">
              ทุกชิ้นแยกเลเยอร์ (<code className="text-ink">&lt;g id=&quot;...&quot;&gt;</code>)
              และตั้งค่าสี Gradient มาตรฐานของแบรนด์ไว้ครบ — พาวางใน Figma จะดัดเส้น เปลี่ยนสี
              หรือปรับขนาดได้ทุกจุดทันที หรือใช้ไฟล์ในโฟลเดอร์{' '}
              <code className="text-ink">docs/brand/svg/</code>
            </p>
          </div>
        </section>

        {/* Section 1: 3 Logo Concepts */}
        <section className="flex flex-col gap-5">
          <div>
            <p className="font-display text-sm font-semibold text-rose-deep">
              01 · APP ICON & LOGO CONCEPTS (512×512)
            </p>
            <h2 className="font-display text-2xl font-bold">
              โลโก้แอป “รู้กัน” 3 สไตล์สำหรับเลือกและต่อยอดใน Figma
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {logos.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-[28px] border border-line bg-white p-5 shadow-[0_12px_34px_rgba(46,34,56,0.05)]"
              >
                <div className="flex flex-col gap-3">
                  <div
                    className={`flex h-[240px] items-center justify-center rounded-[22px] border p-6 transition ${previewSurface}`}
                    dangerouslySetInnerHTML={{
                      __html: item.svg.replace(
                        'width="512" height="512"',
                        'width="188" height="188"',
                      ),
                    }}
                  />
                  <h3 className="font-display text-lg font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{item.subtitle}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => copySvg(item.id, item.svg)}
                    className="flex-1 rounded-full bg-ink px-4 py-2.5 font-display text-xs font-semibold text-white transition hover:bg-ink/90"
                  >
                    {copiedId === item.id
                      ? '✓ คัดลอกแล้ว (กด Ctrl+V ใน Figma)'
                      : 'Copy SVG to Figma'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSvg(item.fileName, item.svg)}
                    className="rounded-full border border-line-strong bg-cream px-3.5 py-2.5 font-display text-xs font-semibold text-ink hover:bg-rose-tint"
                  >
                    .SVG
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: Custom App Icons */}
        <section className="flex flex-col gap-5">
          <div>
            <p className="font-display text-sm font-semibold text-rose-deep">
              02 · BESPOKE ICON SET (64×64 VECTOR GRID)
            </p>
            <h2 className="font-display text-2xl font-bold">
              ชุดไอคอนเฉพาะของแอป (แถบเมนู · เหรียญ Rukan Coin · 3 Pass · ฟีเจอร์หลัก)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {icons.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-[24px] border border-line bg-white p-4 shadow-[0_8px_24px_rgba(46,34,56,0.04)]"
              >
                <div className="flex flex-col gap-2.5">
                  <div
                    className={`flex h-[120px] items-center justify-center rounded-[18px] border transition ${previewSurface}`}
                    dangerouslySetInnerHTML={{
                      __html: item.svg.replace('width="64" height="64"', 'width="72" height="72"'),
                    }}
                  />
                  <h3 className="font-display text-[15px] font-bold">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-muted">{item.subtitle}</p>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => copySvg(item.id, item.svg)}
                    className="flex-1 rounded-full bg-ink px-3 py-2 font-display text-[11px] font-semibold text-white transition hover:bg-ink/90"
                  >
                    {copiedId === item.id ? '✓ Copied!' : 'Copy to Figma'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSvg(item.fileName, item.svg)}
                    className="rounded-full border border-line-strong bg-cream px-2.5 py-2 font-display text-[11px] font-semibold text-ink hover:bg-rose-tint"
                  >
                    .SVG
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
