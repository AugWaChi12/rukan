// หน้าแรกของเว็บโปรโมท (ไทย / อังกฤษ ใช้ component เดียวกัน) — โครงตาม docs/WEBSITE.md หัวข้อ 3
import Image from 'next/image';
import { dictionaries, type Locale } from '@/i18n/dictionaries';
import {
  ChatIcon,
  CheckIcon,
  ChevronIcon,
  LockIcon,
  LogoMark,
  MoonIcon,
  PeopleIcon,
  PlusIcon,
  ShieldIcon,
  UnlockIcon,
} from './icons';
import { Phones } from './phones';
import { WaitlistForm } from './waitlist-form';

const card = 'rounded-3xl border border-line bg-white p-[22px]';
const eyebrow = 'font-display text-[15px] font-semibold text-rose-deep';
const h2 = 'font-display text-[clamp(28px,4vw,44px)] font-bold leading-tight';
// ตัวอธิบาย: ใหญ่พออ่านบนมือถือ + เข้มกว่า text-muted (ตัวเทาเดิมอ่านยาก)
const body = 'text-base leading-relaxed text-ink/75 sm:text-[17px]';
const PHOTO = '/landing/card-photo.png';

export function Landing({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  const base = locale === 'en' ? '/en' : '';

  return (
    <div className="bg-grid overflow-x-clip">
      <div className="bg-glow relative">
        {/* Nav (Liquid Glass Pill + แถบลัดบนมือถือ) */}
        <div className="sticky top-3 z-40 flex flex-col items-center gap-2 px-3 pt-2 sm:px-4 sm:pt-4">
          <nav
            aria-label={t.brand}
            className="flex w-full max-w-[1120px] items-center justify-between gap-2 rounded-full border border-white/80 bg-white/82 py-2 pr-2.5 pl-4 shadow-[0_10px_32px_rgba(46,34,56,0.08)] backdrop-blur-xl sm:gap-3 sm:py-2.5 sm:pr-3 sm:pl-5"
          >
            <a href={base || '/'} className="flex shrink-0 items-center gap-2 no-underline">
              <LogoMark size={32} title={t.brand} />
              <span className="font-display text-[19px] font-bold sm:text-[21px]">{t.brand}</span>
            </a>
            <div className="hidden gap-7 text-[15px] font-medium md:flex">
              <a href="#features" className="hover:text-rose-deep">
                {t.nav.features}
              </a>
              <a href="#how" className="hover:text-rose-deep">
                {t.nav.how}
              </a>
              <a href="#safety" className="hover:text-rose-deep">
                {t.nav.safety}
              </a>
              <a href="#faq" className="hover:text-rose-deep">
                {t.nav.faq}
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <a
                href={t.nav.switchHref}
                hrefLang={locale === 'en' ? 'th' : 'en'}
                className="rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-ink sm:text-sm"
              >
                {t.nav.switchLabel}
              </a>
              <a
                href="#waitlist"
                className="rounded-full bg-ink px-4 py-2 font-display text-[13px] font-medium whitespace-nowrap text-white shadow-sm hover:bg-ink/90 sm:px-[18px] sm:py-2.5 sm:text-[15px]"
              >
                {t.nav.cta}
              </a>
            </div>
          </nav>

          {/* แถบเมนูลัดสำหรับจอโทรศัพท์ (ให้กดข้ามหมวดได้สะดวกเหมือนบนคอม) */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/75 bg-white/75 px-2 py-1 text-[12px] font-medium shadow-[0_6px_20px_rgba(46,34,56,0.05)] backdrop-blur-md md:hidden">
            <a
              href="#features"
              className="rounded-full px-3 py-1 whitespace-nowrap text-ink/80 active:bg-rose-tint active:text-rose-deep"
            >
              {t.nav.features}
            </a>
            <span className="text-line-strong">·</span>
            <a
              href="#how"
              className="rounded-full px-3 py-1 whitespace-nowrap text-ink/80 active:bg-rose-tint active:text-rose-deep"
            >
              {t.nav.how}
            </a>
            <span className="text-line-strong">·</span>
            <a
              href="#safety"
              className="rounded-full px-3 py-1 whitespace-nowrap text-ink/80 active:bg-rose-tint active:text-rose-deep"
            >
              {t.nav.safety}
            </a>
            <span className="text-line-strong">·</span>
            <a
              href="#faq"
              className="rounded-full px-3 py-1 whitespace-nowrap text-ink/80 active:bg-rose-tint active:text-rose-deep"
            >
              {t.nav.faq}
            </a>
          </div>
        </div>

        {/* Hero */}
        <header className="mx-auto flex max-w-[1120px] flex-col items-center gap-4 px-4 pt-8 pb-6 text-center sm:gap-[22px] sm:px-5 sm:pt-14 sm:pb-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="w-[clamp(56px,11vw,110px)] [&>svg]:h-auto [&>svg]:w-full">
              <LogoMark size={110} />
            </span>
            <p className="font-display text-[clamp(56px,13vw,140px)] leading-none font-extrabold tracking-tight">
              {t.brand}
            </p>
          </div>
          <h1 className="font-display text-[clamp(27px,5.5vw,60px)] leading-[1.18] font-bold">
            {t.hero.titleA} <span className="text-gradient">{t.hero.titleB}</span>
          </h1>
          <p className="max-w-[640px] text-[clamp(15.5px,2vw,20px)] leading-relaxed text-ink/75">
            {t.hero.sub}
          </p>
          {/* หนึ่งคน สองตัวตน */}
          <div className="grid w-full max-w-[580px] grid-cols-2 items-stretch gap-2.5 sm:flex sm:justify-center sm:gap-3">
            <IdentityPill
              tone="bg-lilac-tint border border-lilac/40"
              avatar={
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lilac to-rose font-display text-base font-bold text-white sm:size-11 sm:text-lg">
                  {t.features.space.sampleAlias.slice(0, 1)}
                </span>
              }
              label={t.hero.identities.alias.label}
              place={t.hero.identities.alias.place}
              desc={t.hero.identities.alias.desc}
            />
            <span className="hidden shrink-0 flex-col items-center justify-center gap-1 font-display text-[11px] font-semibold text-muted sm:flex sm:text-xs">
              <span className="h-4 w-px bg-line-strong" />
              {t.hero.identities.link}
              <span className="h-4 w-px bg-line-strong" />
            </span>
            <IdentityPill
              tone="bg-rose-tint border border-rose/40"
              avatar={
                <span className="relative size-10 shrink-0 overflow-hidden rounded-full sm:size-11">
                  <Image
                    src={PHOTO}
                    alt=""
                    fill
                    sizes="44px"
                    unoptimized
                    className="object-cover [image-rendering:pixelated]"
                  />
                </span>
              }
              label={t.hero.identities.real.label}
              place={t.hero.identities.real.place}
              desc={t.hero.identities.real.desc}
            />
          </div>
          <span className="-mt-2 rounded-full border border-line bg-white/85 px-3 py-0.5 font-display text-[11px] font-semibold text-muted shadow-2xs sm:hidden">
            🔗 {t.hero.identities.link}
          </span>
          <div className="mt-1 flex w-full max-w-[420px] flex-wrap justify-center gap-2.5 sm:max-w-none sm:gap-3">
            <a
              href="#waitlist"
              className="flex-1 rounded-full bg-rose px-5 py-3.5 text-center font-display text-[15.5px] font-semibold whitespace-nowrap shadow-[0_10px_28px_rgba(194,58,114,0.22)] hover:brightness-105 sm:flex-initial sm:px-7 sm:py-[15px] sm:text-[17px]"
            >
              {t.hero.ctaPrimary}
            </a>
            <a
              href="#how"
              className="flex-1 rounded-full border border-line-strong bg-white px-5 py-3.5 text-center font-display text-[15.5px] font-medium whitespace-nowrap hover:border-ink sm:flex-initial sm:px-[26px] sm:py-[14px] sm:text-[17px]"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
          <p className="text-xs text-muted sm:text-sm">{t.hero.note}</p>
        </header>

        <Phones t={t.phones} />
      </div>

      {/* Marquee */}
      <section aria-label={t.marquee.title} className="flex flex-col gap-3 pt-10 pb-[70px]">
        <p className="mb-1.5 text-center font-display text-[15px] font-semibold text-rose-deep">
          {t.marquee.title}
        </p>
        <div className="overflow-hidden">
          <div className="marquee">
            {[...t.marquee.rowA, ...t.marquee.rowA].map((label, i) => (
              <span
                key={i}
                aria-hidden={i >= t.marquee.rowA.length}
                className="rounded-full border border-line bg-white px-[18px] py-2.5 text-[15px] font-medium whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="marquee marquee-reverse">
            {[...t.marquee.rowB, ...t.marquee.rowB].map((label, i) => (
              <span
                key={i}
                aria-hidden={i >= t.marquee.rowB.length}
                className={`rounded-full px-[18px] py-2.5 text-[15px] font-medium whitespace-nowrap ${
                  ['bg-rose-tint', 'bg-lilac-tint', 'bg-sage-tint'][i % 3]
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features (bento) */}
      <section
        id="features"
        className="mx-auto flex max-w-[1120px] scroll-mt-24 flex-col gap-9 px-5 pt-10 pb-20"
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className={eyebrow}>{t.features.eyebrow}</p>
          <h2 className={h2}>{t.features.title}</h2>
          <p className={`max-w-[640px] ${body}`}>{t.features.sub}</p>
        </div>
        <div className="flex flex-wrap gap-[18px]">
          <article className={`${card} flex flex-[2_1_520px] flex-col gap-3.5`}>
            <div className="flex flex-col gap-2 rounded-[18px] bg-cream p-4">
              <div className="rounded-[14px] bg-white px-3 py-2.5 text-[15px] shadow-[0_3px_10px_rgba(46,34,56,0.05)]">
                <b>{t.features.space.sampleAlias}</b>{' '}
                <span className="text-muted">· {t.features.space.sampleMeta}</span>
                <br />
                {t.features.space.sampleBody}
              </div>
              <span className="self-start rounded-full bg-lilac-tint px-3 py-1 text-[13px] font-semibold">
                {t.phones.sendBubble}
              </span>
            </div>
            <FeatureText
              icon={<ChatIcon />}
              tint="bg-lilac-tint"
              title={t.features.space.title}
              body={t.features.space.body}
            />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="relative flex min-h-[136px] items-center justify-center gap-1.5 rounded-[18px] bg-cream px-2.5 pt-5 pb-3 sm:gap-2 sm:px-3 sm:pt-3">
              {['object-[30%_40%]', 'object-center', 'object-[70%_30%]'].map((pos, i) => (
                <span
                  key={pos}
                  className={`relative h-[88px] w-[56px] overflow-hidden rounded-[12px] shadow-[0_6px_14px_rgba(46,34,56,0.10)] sm:h-[96px] sm:w-[64px] ${['-rotate-[5deg]', '', 'rotate-[5deg]'][i]}`}
                >
                  <Image
                    src={PHOTO}
                    alt=""
                    fill
                    sizes="64px"
                    unoptimized
                    className={`object-cover [image-rendering:pixelated] ${pos}`}
                  />
                </span>
              ))}
              <span className="flex h-[88px] w-[56px] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-line-strong bg-white/70 text-muted sm:h-[96px] sm:w-[64px]">
                <LockIcon size={16} />
                <span className="font-display text-[11px]">+3</span>
              </span>
              <span className="absolute top-2 right-2.5 rounded-full bg-ink px-2.5 py-0.5 font-display text-[11px] text-white sm:top-2.5 sm:right-3 sm:py-1 sm:text-[13px]">
                3 / 6
              </span>
            </div>
            <FeatureText
              icon={<MoonIcon />}
              tint="bg-rose-tint"
              title={t.features.drop.title}
              body={t.features.drop.body}
            />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="flex min-h-[116px] flex-col justify-center gap-2.5 rounded-[18px] bg-cream p-4">
              <p className="font-display text-sm">{t.features.reveal.progress}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-2 rounded-full bg-rose" />
                <div className="h-2 rounded-full bg-rose" />
                <div className="h-2 rounded-full bg-line" />
              </div>
              <p className="text-[13px] text-ink/70">{t.features.reveal.progressSub}</p>
            </div>
            <FeatureText
              icon={<UnlockIcon />}
              tint="bg-rose-tint"
              title={t.features.reveal.title}
              body={t.features.reveal.body}
            />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="flex min-h-[116px] flex-col justify-center gap-2 rounded-[18px] bg-cream p-4 text-[14.5px] sm:text-[15px]">
              {t.features.verified.checks.map((c) => (
                <p key={c} className="flex items-center gap-2">
                  <CheckIcon size={15} className="shrink-0 text-[#3E9A74]" /> {c}
                </p>
              ))}
              <p className="flex items-center gap-2 text-muted">
                <PlusIcon size={15} className="shrink-0" /> {t.features.verified.optional}
              </p>
            </div>
            <FeatureText
              icon={<ShieldIcon className="text-[#2C6B52]" />}
              tint="bg-sage-tint"
              title={t.features.verified.title}
              body={t.features.verified.body}
            />
          </article>

          <article className={`${card} flex flex-[2_1_520px] flex-col gap-3.5`}>
            <div className="flex flex-col items-stretch gap-2.5 rounded-[18px] bg-cream p-3.5 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
              <MiniProfile
                tone="bg-lilac-tint"
                avatar={
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lilac to-rose font-display text-lg font-bold text-white sm:size-14 sm:text-xl">
                    {t.features.space.sampleAlias.slice(0, 1)}
                  </span>
                }
                tag={t.features.modes.friend}
                name={t.features.space.sampleAlias}
                meta={t.features.modes.aliasMeta}
              />
              <span className="mx-auto flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-muted shadow-2xs">
                <LockIcon size={16} />
              </span>
              <MiniProfile
                tone="bg-rose-tint"
                avatar={
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-full sm:size-14">
                    <Image
                      src={PHOTO}
                      alt=""
                      fill
                      sizes="56px"
                      unoptimized
                      className="object-cover [image-rendering:pixelated]"
                    />
                  </span>
                }
                tag={t.features.modes.date}
                name={t.phones.cardName}
                meta={t.features.modes.realMeta}
              />
            </div>
            <p className="-mt-1 text-center font-display text-sm font-semibold text-rose-deep">
              {t.features.modes.wall}
            </p>
            <FeatureText
              icon={<PeopleIcon />}
              tint="bg-lilac-tint"
              title={t.features.modes.title}
              body={t.features.modes.body}
            />
          </article>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="mx-auto flex max-w-[1120px] scroll-mt-24 flex-col gap-9 px-5 pt-10 pb-[90px]"
      >
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className={eyebrow}>{t.how.eyebrow}</p>
          <h2 className={h2}>{t.how.title}</h2>
        </div>
        <ol className="flex flex-wrap gap-[18px]">
          {t.how.steps.map((step, i) => (
            <li key={step.title} className={`${card} flex flex-[1_1_280px] flex-col gap-2.5 p-6`}>
              <span
                className={`font-display text-[44px] leading-none font-extrabold ${['text-rose', 'text-lilac', 'text-sage'][i]}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className={body}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety (ดำทอง) */}
      <section id="safety" className="scroll-mt-24 bg-night px-5 py-20 text-night-ink">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-10">
          <div className="flex flex-[1_1_380px] flex-col gap-3.5">
            <p className="font-display text-[15px] font-semibold text-gold">{t.safety.eyebrow}</p>
            <h2 className={h2}>{t.safety.title}</h2>
            <p className="text-[17px] leading-relaxed text-night-muted">{t.safety.body}</p>
            <a
              href={`${base}/rules`}
              className="mt-1.5 self-start rounded-full bg-gold px-6 py-[13px] font-display text-base font-semibold text-[#17130B] hover:brightness-105"
            >
              {t.safety.cta}
            </a>
          </div>
          <ul className="grid flex-[1_1_420px] grid-cols-1 gap-3.5 sm:grid-cols-2">
            {t.safety.items.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-1.5 rounded-[20px] bg-night-card p-[18px]"
              >
                <ShieldIcon size={20} className="text-gold" />
                <p className="font-display text-base font-semibold">{item.title}</p>
                <p className="text-[15px] text-night-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="scroll-mt-24 px-5 py-[90px]">
        <div className="relative mx-auto flex max-w-[760px] flex-col gap-[18px] rounded-[32px] border border-line bg-white p-[clamp(24px,5vw,48px)] shadow-[0_20px_60px_rgba(46,34,56,0.08)]">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="font-display text-[clamp(26px,3.6vw,38px)] font-bold">
              {t.waitlist.titleA} <span className="text-gradient">{t.waitlist.titleB}</span>
            </h2>
            <p className="text-base text-muted">{t.waitlist.sub}</p>
          </div>
          <WaitlistForm
            t={t.waitlist}
            areas={t.areas}
            locale={locale}
            privacyHref={`${base}/privacy`}
          />
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto flex max-w-[760px] scroll-mt-24 flex-col gap-3.5 px-5 pb-[90px]"
      >
        <h2 className="mb-2.5 text-center font-display text-[clamp(26px,3.6vw,38px)] font-bold">
          {t.faq.title}
        </h2>
        {t.faq.items.map((item, i) => (
          <details
            key={item.q}
            open={i === 0}
            className="group rounded-[20px] border border-line bg-white px-[22px] py-[18px]"
          >
            <summary className="flex items-center justify-between gap-4 font-display text-[17px] font-semibold">
              {item.q}
              <ChevronIcon
                size={18}
                className="shrink-0 text-muted transition group-open:rotate-180"
              />
            </summary>
            <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-cream px-5 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-[18px]">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-[17px] font-bold">{t.brand}</span>
            <span className="text-[13px] text-muted">{t.footer.copyright}</span>
          </div>
          <nav aria-label="footer" className="flex flex-wrap gap-5 text-sm">
            <a href={`${base}/rules`} className="hover:text-rose-deep">
              {t.footer.rules}
            </a>
            <a href={`${base}/privacy`} className="hover:text-rose-deep">
              {t.footer.privacy}
            </a>
            <a href={`${base}/terms`} className="hover:text-rose-deep">
              {t.footer.terms}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureText({
  icon,
  tint,
  title,
  body: text,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <>
      <span className={`flex size-10 items-center justify-center rounded-[14px] ${tint}`}>
        {icon}
      </span>
      <h3 className="font-display text-[22px] font-semibold">{title}</h3>
      <p className={body}>{text}</p>
    </>
  );
}

/** การ์ดเล็กใน hero: ตัวตนหนึ่งฝั่ง (นามแฝง / ตัวจริง) */
function IdentityPill({
  tone,
  avatar,
  label,
  place,
  desc,
}: {
  tone: string;
  avatar: React.ReactNode;
  label: string;
  place: string;
  desc: string;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-[22px] px-3 py-3 text-center shadow-[0_4px_16px_rgba(46,34,56,0.04)] sm:flex-row sm:gap-2.5 sm:px-4 sm:text-left ${tone}`}
    >
      {avatar}
      <div className="min-w-0">
        <p className="font-display text-[14px] leading-snug font-bold sm:text-base">
          {label} <span className="font-medium text-muted">· {place}</span>
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ink/70 sm:text-sm">{desc}</p>
      </div>
    </div>
  );
}

/** โปรไฟล์ย่อในการ์ด "นามแฝงกับตัวจริง" */
function MiniProfile({
  tone,
  avatar,
  tag,
  name,
  meta,
}: {
  tone: string;
  avatar: React.ReactNode;
  tag: string;
  name: string;
  meta: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-[16px] bg-white p-3 shadow-[0_3px_10px_rgba(46,34,56,0.05)]">
      {avatar}
      <div className="min-w-0">
        <span className={`rounded-full px-2 py-0.5 font-display text-xs font-semibold ${tone}`}>
          {tag}
        </span>
        <p className="mt-1 font-display text-base font-semibold">{name}</p>
        <p className="text-[13px] text-ink/70">{meta}</p>
      </div>
    </div>
  );
}
