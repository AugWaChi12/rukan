// หน้าเอกสารกฎหมาย (/rules, /privacy, /terms) ใช้ component เดียวกันทั้งไทยและอังกฤษ
import { dictionaries, type Locale } from '@/i18n/dictionaries';
import { legalDictionaries, type LegalDocKey } from '@/i18n/legal';
import { LogoMark, ShieldIcon } from '../landing/icons';

const DOC_KEYS: readonly LegalDocKey[] = ['rules', 'privacy', 'terms'];

export function LegalPage({ locale, docKey }: { locale: Locale; docKey: LegalDocKey }) {
  const site = dictionaries[locale];
  const legal = legalDictionaries[locale];
  const doc = legal.docs[docKey];
  const base = locale === 'en' ? '/en' : '';
  const switchBase = locale === 'en' ? '' : '/en';

  return (
    <div className="bg-grid min-h-dvh flex flex-col overflow-x-clip">
      <div className="bg-glow flex-1">
        {/* Nav (Liquid Glass Pill) */}
        <div className="sticky top-3 z-40 flex justify-center px-3 pt-2 sm:px-4 sm:pt-4">
          <nav
            aria-label={site.brand}
            className="flex w-full max-w-[1120px] items-center justify-between gap-2 rounded-full border border-white/80 bg-white/80 py-2 pr-2.5 pl-4 shadow-[0_12px_36px_rgba(46,34,56,0.08)] backdrop-blur-xl sm:gap-3 sm:py-2.5 sm:pr-3 sm:pl-5"
          >
            <a href={base || '/'} className="flex shrink-0 items-center gap-2 no-underline">
              <LogoMark size={32} title={site.brand} />
              <span className="font-display text-[19px] font-bold sm:text-[21px]">
                {site.brand}
              </span>
            </a>

            <div className="hidden items-center gap-2 md:flex">
              {DOC_KEYS.map((key) => {
                const active = key === docKey;
                return (
                  <a
                    key={key}
                    href={`${base}/${key}`}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-full px-4 py-2 text-[14px] font-medium transition ${
                      active
                        ? 'bg-rose-tint font-semibold text-rose-deep'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {legal.nav[key]}
                  </a>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <a
                href={`${switchBase}/${docKey}`}
                hrefLang={locale === 'en' ? 'th' : 'en'}
                className="flex min-h-[38px] items-center rounded-full border border-line/80 bg-white/70 px-3 text-xs font-semibold text-muted hover:text-ink sm:min-h-[42px] sm:border-transparent sm:bg-transparent sm:px-2 sm:text-sm"
              >
                {site.nav.switchLabel}
              </a>
              <a
                href={`${base || '/'}#waitlist`}
                className="flex min-h-[38px] items-center rounded-full bg-ink px-4 py-1.5 font-display text-[13px] font-medium text-white shadow-sm hover:bg-ink/90 sm:min-h-[42px] sm:px-[18px] sm:py-2 sm:text-[15px]"
              >
                {site.nav.cta}
              </a>
            </div>
          </nav>
        </div>

        {/* Mobile doc switcher */}
        <div className="mx-auto mt-4 flex max-w-[840px] flex-wrap justify-center gap-2 px-5 md:hidden">
          {DOC_KEYS.map((key) => {
            const active = key === docKey;
            return (
              <a
                key={key}
                href={`${base}/${key}`}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] items-center rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? 'border-rose bg-rose-tint font-semibold text-rose-deep'
                    : 'border-line bg-white text-muted'
                }`}
              >
                {legal.nav[key]}
              </a>
            );
          })}
        </div>

        {/* Header */}
        <header className="mx-auto flex max-w-[840px] flex-col gap-4 px-5 pt-10 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={base || '/'}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-muted hover:text-rose-deep"
            >
              {legal.backHome}
            </a>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <span className="rounded-full border border-rose bg-rose-tint px-3 py-1 font-semibold text-rose-deep">
                {legal.draftBadge}
              </span>
              <span className="rounded-full border border-line bg-white px-3 py-1">
                {legal.versionLabel}: {doc.version}
              </span>
              <span className="rounded-full border border-line bg-white px-3 py-1">
                {legal.updatedLabel}: {doc.updatedAt}
              </span>
            </div>
          </div>

          <p className="font-display text-[15px] font-semibold text-rose-deep">{doc.eyebrow}</p>
          <h1 className="font-display text-[clamp(30px,5vw,48px)] leading-tight font-bold">
            {doc.title}
          </h1>
          <p className="text-[clamp(16px,1.8vw,19px)] leading-relaxed text-muted">{doc.subtitle}</p>

          {/* Draft notice banner */}
          <div
            role="note"
            className="mt-2 flex items-start gap-3 rounded-2xl border border-line-strong bg-lilac-tint/80 p-4 text-sm leading-relaxed text-ink"
          >
            <ShieldIcon size={20} className="mt-0.5 shrink-0 text-rose-deep" />
            <p>{legal.draftNotice}</p>
          </div>
        </header>

        {/* Sections */}
        <main className="mx-auto flex max-w-[840px] flex-col gap-5 px-5 pb-20">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="flex flex-col gap-3.5 rounded-3xl border border-line bg-white p-[clamp(20px,4vw,32px)] shadow-[0_8px_30px_rgba(46,34,56,0.03)]"
            >
              <h2 className="font-display text-[clamp(19px,2.4vw,23px)] font-bold text-ink">
                {section.title}
              </h2>

              {section.paragraphs?.map((p) => (
                <p key={p} className="text-[15px] leading-relaxed text-muted">
                  {p}
                </p>
              ))}

              {section.table ? (
                <div className="overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-line bg-cream font-display font-semibold text-ink">
                        {section.table.headers.map((header) => (
                          <th key={header} className="px-4 py-3">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {section.table.rows.map((row) => (
                        <tr key={row[0]} className="align-top">
                          <td className="px-4 py-3 font-medium text-ink">{row[0]}</td>
                          <td className="px-4 py-3 text-muted">{row[1]}</td>
                          <td className="px-4 py-3 text-muted">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {section.bullets ? (
                <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink/90 marker:text-rose-deep">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.callout ? (
                <div className="mt-1 rounded-2xl border border-sage bg-sage-tint p-4">
                  <p className="font-display text-[15px] font-semibold text-ink">
                    {section.callout.title}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink/85">
                    {section.callout.body}
                  </p>
                </div>
              ) : null}
            </section>
          ))}

          {/* Contact card */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 text-sm text-muted">
            <span>{legal.contactLabel}</span>
            <a
              href={`mailto:${legal.contactEmail}`}
              className="font-display font-semibold text-rose-deep hover:underline"
            >
              {legal.contactEmail}
            </a>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-line bg-cream px-5 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-[18px]">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-[17px] font-bold">{site.brand}</span>
            <span className="text-[13px] text-muted">{site.footer.copyright}</span>
          </div>
          <nav aria-label="footer" className="flex flex-wrap gap-5 text-sm">
            <a href={`${base}/rules`} className="hover:text-rose-deep">
              {site.footer.rules}
            </a>
            <a href={`${base}/privacy`} className="hover:text-rose-deep">
              {site.footer.privacy}
            </a>
            <a href={`${base}/terms`} className="hover:text-rose-deep">
              {site.footer.terms}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
