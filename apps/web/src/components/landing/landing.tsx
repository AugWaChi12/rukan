// หน้าแรกของเว็บโปรโมท (ไทย / อังกฤษ ใช้ component เดียวกัน) — โครงตาม docs/WEBSITE.md หัวข้อ 3
import { dictionaries, type Locale } from '@/i18n/dictionaries';
import {
  ChatIcon,
  CheckIcon,
  ChevronIcon,
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

export function Landing({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  const base = locale === 'en' ? '/en' : '';

  return (
    <div className="bg-grid overflow-x-clip">
      <div className="bg-glow relative">
        {/* Nav */}
        <div className="flex justify-center px-4 pt-5">
          <nav
            aria-label={t.brand}
            className="flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-white/80 py-2.5 pr-3 pl-5 shadow-[0_8px_30px_rgba(46,34,56,0.06)] backdrop-blur"
          >
            <a href={base || '/'} className="flex items-center gap-2 no-underline">
              <LogoMark size={34} title={t.brand} />
              <span className="font-display text-[21px] font-bold">{t.brand}</span>
            </a>
            <div className="hidden gap-7 text-[15px] font-medium md:flex">
              <a href="#features" className="hover:text-rose-deep">{t.nav.features}</a>
              <a href="#how" className="hover:text-rose-deep">{t.nav.how}</a>
              <a href="#safety" className="hover:text-rose-deep">{t.nav.safety}</a>
              <a href="#faq" className="hover:text-rose-deep">{t.nav.faq}</a>
            </div>
            <div className="flex items-center gap-3">
              <a href={t.nav.switchHref} hrefLang={locale === 'en' ? 'th' : 'en'} className="text-sm font-semibold text-muted hover:text-ink">
                {t.nav.switchLabel}
              </a>
              <a href="#waitlist" className="rounded-full bg-ink px-[18px] py-2.5 font-display text-[15px] font-medium text-white hover:bg-ink/90">
                {t.nav.cta}
              </a>
            </div>
          </nav>
        </div>

        {/* Hero */}
        <header className="mx-auto flex max-w-[1120px] flex-col items-center gap-[22px] px-5 pt-[72px] pb-10 text-center">
          <div className="flex items-center gap-4">
            <span className="w-[clamp(64px,9vw,110px)] [&>svg]:h-auto [&>svg]:w-full">
              <LogoMark size={110} />
            </span>
            <p className="font-display text-[clamp(64px,11vw,140px)] leading-none font-extrabold tracking-tight">{t.brand}</p>
          </div>
          <h1 className="font-display text-[clamp(30px,5vw,60px)] leading-tight font-bold">
            {t.hero.titleA} <span className="text-gradient">{t.hero.titleB}</span>
          </h1>
          <p className="max-w-[640px] text-[clamp(16px,1.8vw,20px)] leading-relaxed text-muted">{t.hero.sub}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <a
              href="#waitlist"
              className="rounded-full bg-rose px-7 py-[15px] font-display text-[17px] font-semibold shadow-[0_10px_28px_rgba(194,58,114,0.22)] hover:brightness-105"
            >
              {t.hero.ctaPrimary}
            </a>
            <a href="#how" className="rounded-full border border-line-strong bg-white px-[26px] py-[14px] font-display text-[17px] font-medium hover:border-ink">
              {t.hero.ctaSecondary}
            </a>
          </div>
          <p className="text-[13px] text-muted">{t.hero.note}</p>
        </header>

        <Phones t={t.phones} />
      </div>

      {/* Marquee */}
      <section aria-label={t.marquee.title} className="flex flex-col gap-3 pt-10 pb-[70px]">
        <p className="mb-1.5 text-center font-display text-[15px] font-semibold text-rose-deep">{t.marquee.title}</p>
        <div className="overflow-hidden">
          <div className="marquee">
            {[...t.marquee.rowA, ...t.marquee.rowA].map((label, i) => (
              <span key={i} aria-hidden={i >= t.marquee.rowA.length} className="rounded-full border border-line bg-white px-[18px] py-2.5 text-[15px] font-medium whitespace-nowrap">
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
      <section id="features" className="mx-auto flex max-w-[1120px] scroll-mt-24 flex-col gap-9 px-5 pt-10 pb-20">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className={eyebrow}>{t.features.eyebrow}</p>
          <h2 className={h2}>{t.features.title}</h2>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-muted">{t.features.sub}</p>
        </div>
        <div className="flex flex-wrap gap-[18px]">
          <article className={`${card} flex flex-[2_1_520px] flex-col gap-3.5`}>
            <div className="flex flex-col gap-2 rounded-[18px] bg-cream p-4">
              <div className="rounded-[14px] bg-white px-3 py-2.5 text-[13px] shadow-[0_3px_10px_rgba(46,34,56,0.05)]">
                <b>{t.features.space.sampleAlias}</b> <span className="text-muted">· {t.features.space.sampleMeta}</span>
                <br />
                {t.features.space.sampleBody}
              </div>
              <span className="self-start rounded-full bg-lilac-tint px-2.5 py-1 text-xs font-semibold">{t.phones.sendBubble}</span>
            </div>
            <FeatureText icon={<ChatIcon />} tint="bg-lilac-tint" title={t.features.space.title} body={t.features.space.body} />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="relative flex h-[110px] items-center justify-center rounded-[18px] bg-cream">
              <div className="h-[92px] w-[70px] -rotate-[8deg] rounded-[14px] bg-lilac-tint" />
              <div className="-ml-[30px] h-[92px] w-[70px] rounded-[14px] bg-rose-tint" />
              <div className="-ml-[30px] h-[92px] w-[70px] rotate-[8deg] rounded-[14px] bg-sage-tint" />
              <span className="absolute top-3 right-3.5 rounded-full bg-ink px-2.5 py-1 font-display text-[13px] text-white">19:00</span>
            </div>
            <FeatureText icon={<MoonIcon />} tint="bg-rose-tint" title={t.features.drop.title} body={t.features.drop.body} />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="flex h-[110px] flex-col justify-center gap-2.5 rounded-[18px] bg-cream p-4">
              <p className="font-display text-sm">{t.features.reveal.progress}</p>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-2 rounded-full bg-rose" />
                <div className="h-2 rounded-full bg-rose" />
                <div className="h-2 rounded-full bg-line" />
              </div>
              <p className="text-xs text-muted">{t.features.reveal.progressSub}</p>
            </div>
            <FeatureText icon={<UnlockIcon />} tint="bg-rose-tint" title={t.features.reveal.title} body={t.features.reveal.body} />
          </article>

          <article className={`${card} flex flex-[1_1_300px] flex-col gap-3.5`}>
            <div className="flex h-[110px] flex-col justify-center gap-2 rounded-[18px] bg-cream p-4 text-[13px]">
              {t.features.verified.checks.map((c) => (
                <p key={c} className="flex items-center gap-2">
                  <CheckIcon size={15} className="text-[#3E9A74]" /> {c}
                </p>
              ))}
              <p className="flex items-center gap-2 text-muted">
                <PlusIcon size={15} /> {t.features.verified.optional}
              </p>
            </div>
            <FeatureText icon={<ShieldIcon className="text-[#2C6B52]" />} tint="bg-sage-tint" title={t.features.verified.title} body={t.features.verified.body} />
          </article>

          <article className={`${card} flex flex-[2_1_520px] flex-col gap-3.5`}>
            <div className="flex justify-center rounded-[18px] bg-cream p-4">
              <div className="flex gap-1 rounded-full bg-white p-[5px] shadow-[0_3px_10px_rgba(46,34,56,0.06)]">
                <span className="rounded-full bg-rose px-[22px] py-2 font-display text-[15px]">{t.features.modes.friend}</span>
                <span className="rounded-full px-[22px] py-2 font-display text-[15px] text-muted">{t.features.modes.date}</span>
              </div>
            </div>
            <FeatureText icon={<PeopleIcon />} tint="bg-lilac-tint" title={t.features.modes.title} body={t.features.modes.body} />
          </article>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto flex max-w-[1120px] scroll-mt-24 flex-col gap-9 px-5 pt-10 pb-[90px]">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className={eyebrow}>{t.how.eyebrow}</p>
          <h2 className={h2}>{t.how.title}</h2>
        </div>
        <ol className="flex flex-wrap gap-[18px]">
          {t.how.steps.map((step, i) => (
            <li key={step.title} className={`${card} flex flex-[1_1_280px] flex-col gap-2.5 p-6`}>
              <span className={`font-display text-[44px] leading-none font-extrabold ${['text-rose', 'text-lilac', 'text-sage'][i]}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{step.body}</p>
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
            <a href={`${base}/rules`} className="mt-1.5 self-start rounded-full bg-gold px-6 py-[13px] font-display text-base font-semibold text-[#17130B] hover:brightness-105">
              {t.safety.cta}
            </a>
          </div>
          <ul className="grid flex-[1_1_420px] grid-cols-1 gap-3.5 sm:grid-cols-2">
            {t.safety.items.map((item) => (
              <li key={item.title} className="flex flex-col gap-1.5 rounded-[20px] bg-night-card p-[18px]">
                <ShieldIcon size={20} className="text-gold" />
                <p className="font-display text-base font-semibold">{item.title}</p>
                <p className="text-[13px] text-night-muted">{item.body}</p>
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
          <WaitlistForm t={t.waitlist} areas={t.areas} locale={locale} privacyHref={`${base}/privacy`} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto flex max-w-[760px] scroll-mt-24 flex-col gap-3.5 px-5 pb-[90px]">
        <h2 className="mb-2.5 text-center font-display text-[clamp(26px,3.6vw,38px)] font-bold">{t.faq.title}</h2>
        {t.faq.items.map((item, i) => (
          <details key={item.q} open={i === 0} className="group rounded-[20px] border border-line bg-white px-[22px] py-[18px]">
            <summary className="flex items-center justify-between gap-4 font-display text-[17px] font-semibold">
              {item.q}
              <ChevronIcon size={18} className="shrink-0 text-muted transition group-open:rotate-180" />
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
            <a href={`${base}/rules`} className="hover:text-rose-deep">{t.footer.rules}</a>
            <a href={`${base}/privacy`} className="hover:text-rose-deep">{t.footer.privacy}</a>
            <a href={`${base}/terms`} className="hover:text-rose-deep">{t.footer.terms}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureText({ icon, tint, title, body }: { icon: React.ReactNode; tint: string; title: string; body: string }) {
  return (
    <>
      <span className={`flex size-10 items-center justify-center rounded-[14px] ${tint}`}>{icon}</span>
      <h3 className="font-display text-[22px] font-semibold">{title}</h3>
      <p className="text-[15px] leading-relaxed text-muted">{body}</p>
    </>
  );
}
