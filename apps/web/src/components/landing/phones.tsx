// ภาพมือถือ 3 เครื่องใน hero (Feed นามแฝง · ปัดๆ · แชท) + การ์ดแจ้งเตือนลอย — เป็นภาพประกอบล้วน ไม่มี interaction
// รูปบนการ์ดเป็น pixel art (public/landing/card-photo.png)
import Image from 'next/image';
import type { Dictionary } from '@/i18n/dictionaries';
import { ChatIcon, CheckIcon, HeartIcon, LockIcon } from './icons';

const STORY_RINGS = [
  'from-rose to-lilac',
  'from-lilac to-sage',
  'from-sage to-rose',
  'from-rose-deep to-lilac',
];

function Frame({
  children,
  className = '',
  side = false,
}: {
  children: React.ReactNode;
  className?: string;
  side?: boolean;
}) {
  return (
    <div
      className={`shrink-0 rounded-[40px] bg-ink p-[9px] shadow-[0_30px_60px_rgba(46,34,56,0.18)] ${
        side ? 'hidden h-[470px] w-[230px] md:block' : 'relative z-10 h-[530px] w-[260px] p-[10px]'
      } ${className}`}
    >
      <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-[32px] bg-cream px-3 pt-8 pb-3">
        {children}
      </div>
    </div>
  );
}

export function Phones({ t }: { t: Dictionary['phones'] }) {
  return (
    <div className="relative mx-auto max-w-[1120px] px-5 pt-2.5 pb-20" aria-hidden="true">
      <div className="flex items-end justify-center">
        <Frame side className="translate-x-10 -rotate-6">
          <p className="font-display text-base font-semibold">{t.space}</p>
          {/* story ของนามแฝง */}
          <div className="mb-1 flex gap-2">
            {STORY_RINGS.map((ring, i) => (
              <span key={ring} className={`rounded-full bg-gradient-to-br p-[2px] ${ring}`}>
                <span className="flex size-9 items-center justify-center rounded-full bg-cream font-display text-[11px] font-semibold">
                  {(t.posts[i % t.posts.length]?.alias ?? '').slice(0, 1)}
                </span>
              </span>
            ))}
          </div>
          {t.posts.map((post, i) => (
            <div
              key={post.alias}
              className="flex flex-col gap-1 rounded-2xl bg-white p-2.5 shadow-[0_3px_10px_rgba(46,34,56,0.06)]"
            >
              <p className="text-[10px]">
                <b>{post.alias}</b> <span className="text-muted">· {post.meta}</span>
              </p>
              <p className="text-[11px] leading-snug">{post.body}</p>
              {i === 1 && (
                <span className="self-start rounded-full bg-lilac-tint px-2 py-0.5 text-[9px] font-semibold">
                  {t.sendBubble}
                </span>
              )}
            </div>
          ))}
        </Frame>

        <Frame>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[17px] font-semibold">{t.dropTitle}</p>
            <p className="text-[10px] text-muted">{t.dropMeta}</p>
          </div>
          <div className="flex grow flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_22px_rgba(46,34,56,0.08)]">
            <div className="relative mx-2 mt-2 h-[210px] overflow-hidden rounded-[18px]">
              {/* pixel art จากรูปจริงของทีม (เจ้าของรูปอนุญาต) — 48×42 px ขยายแบบ pixelated */}
              <Image
                src="/landing/card-photo.png"
                alt=""
                fill
                sizes="240px"
                unoptimized
                className="object-cover [image-rendering:pixelated]"
              />
              {/* เห็น 3 รูปแรก ที่เหลือล็อกไว้ */}
              <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-6 gap-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`h-[3px] rounded-full ${i === 0 ? 'bg-white' : i < 3 ? 'bg-white/55' : 'bg-white/20'}`}
                  />
                ))}
              </div>
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 font-display text-[10px]">
                <LockIcon size={11} /> {t.locked}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
              <p className="font-display text-base font-semibold">{t.cardName}</p>
              <p className="text-[11px] text-muted">{t.cardLine}</p>
              <div className="rounded-[14px_14px_14px_5px] bg-cream px-2.5 py-2 text-[11px] leading-snug">
                {t.cardAnswer}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-white text-muted shadow">
              ✕
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-rose px-5 py-2.5 font-display text-[13px] font-semibold">
              <HeartIcon size={14} /> {t.like}
            </span>
          </div>
        </Frame>

        <Frame side className="-translate-x-10 rotate-6">
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-white px-2.5 py-2 shadow-[0_3px_10px_rgba(46,34,56,0.06)]">
            <p className="font-display text-[11px]">{t.reveal}</p>
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-[5px] rounded-full ${i < 3 ? 'bg-rose' : i === 3 ? 'bg-rose-tint' : 'bg-line'}`}
                />
              ))}
            </div>
          </div>
          {t.chat.map((m) => (
            <p
              key={m.text}
              className={`max-w-[160px] px-2.5 py-2 text-[11px] leading-snug ${
                m.mine
                  ? 'self-end rounded-[14px_14px_5px_14px] bg-rose'
                  : 'self-start rounded-[14px_14px_14px_5px] bg-lilac-tint'
              }`}
            >
              {m.text}
            </p>
          ))}
        </Frame>
      </div>

      <Toast
        className="top-[90px] left-[4%]"
        icon={<HeartIcon size={18} className="text-rose-deep" />}
        bg="bg-rose-tint"
        title={t.toastMatch}
        sub={t.toastMatchSub}
      />
      <Toast
        className="top-[200px] right-[4%] [animation-delay:1.2s]"
        icon={<ChatIcon size={18} />}
        bg="bg-lilac-tint"
        title={t.toastDrop}
        sub={t.toastDropSub}
      />
      <div className="float absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-white px-[18px] py-2.5 whitespace-nowrap shadow-[0_14px_34px_rgba(46,34,56,0.12)] [animation-delay:2.4s] md:flex">
        <CheckIcon size={16} className="text-[#3E9A74]" />
        <p className="text-[13px] font-semibold">{t.toastVerified}</p>
      </div>
    </div>
  );
}

function Toast({
  className,
  icon,
  bg,
  title,
  sub,
}: {
  className: string;
  icon: React.ReactNode;
  bg: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      className={`float absolute z-20 hidden items-center gap-2.5 rounded-[18px] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(46,34,56,0.12)] md:flex ${className}`}
    >
      <span className={`flex size-[34px] items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </span>
      <div>
        <p className="font-display text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}
