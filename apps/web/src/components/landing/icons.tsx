// ไอคอนเส้น (stroke) + โลโก้ "สองฟองที่รู้กัน"
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ChatIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
  </Stroke>
);
export const MoonIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Stroke>
);
export const UnlockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="4" y="11" width="16" height="10" rx="3" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </Stroke>
);
export const LockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="4" y="11" width="16" height="10" rx="3" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Stroke>
);
export const ShieldIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Stroke>
);
export const PeopleIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M15 14.5a5 5 0 0 1 6.5 5.5" />
  </Stroke>
);
export const HeartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </Stroke>
);
export const CheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
);
export const PlusIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);
export const ChevronIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
);

/** โลโก้รู้กัน: สองฟองแชทหันเข้าหากัน ส่วนที่ซ้อนกันคือ "รู้กันแค่เรา" พร้อมประกายดาวตรงกลาง */
export function LogoMark({ size = 34, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={(size * 64) / 76}
      viewBox="0 0 76 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="26" cy="28" r="22" fill="#E9A9BF" />
      <path d="M10 42 L6 56 L20 47 Z" fill="#E9A9BF" />
      <path
        d="M15 17 A16 16 0 0 1 26 12"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.65"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="28" r="22" fill="#C7BEE3" />
      <path d="M66 42 L70 56 L56 47 Z" fill="#C7BEE3" />
      <path
        d="M61 17 A16 16 0 0 0 50 12"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.65"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M38 13 a22 22 0 0 1 0 30 a22 22 0 0 1 0 -30 z" fill="#2E2238" />
      <path
        d="M38 21.5 C38.8 25.2 40.3 26.7 44 27.5 C40.3 28.3 38.8 29.8 38 33.5 C37.2 29.8 35.7 28.3 32 27.5 C35.7 26.7 37.2 25.2 38 21.5 Z"
        fill="#F2C66D"
      />
    </svg>
  );
}
