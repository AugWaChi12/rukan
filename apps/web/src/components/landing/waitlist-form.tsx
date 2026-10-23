'use client';

import {
  AGE_BANDS,
  SUPABASE_RPC,
  WAITLIST_CONSENT_VERSION,
  WAITLIST_INTENTS,
  waitlistFormSchema,
  type WaitlistIntent,
} from '@rukan/shared';
import { useState, type FormEvent } from 'react';
import type { Dictionary, Locale } from '@/i18n/dictionaries';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from './icons';

type Status =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'] as const;

function readUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 100);
  }
  return utm;
}

const fieldClass =
  'w-full rounded-[14px] border border-line-strong bg-cream px-4 py-3.5 text-base text-ink outline-none focus:border-rose-deep focus:ring-2 focus:ring-rose/40';

export function WaitlistForm({
  t,
  areas,
  locale,
  privacyHref,
}: {
  t: Dictionary['waitlist'];
  areas: Dictionary['areas'];
  locale: Locale;
  privacyHref: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [area, setArea] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    // honeypot: ช่องที่คนมองไม่เห็น ถ้ามีค่า = bot → ทำเหมือนสำเร็จแต่ไม่ส่ง
    if (form.get('website')) {
      setStatus({ kind: 'done' });
      return;
    }

    const areaValue =
      area === 'other' ? `other:${String(form.get('areaOther') ?? '').trim()}` : area;
    const parsed = waitlistFormSchema.safeParse({
      email: form.get('email'),
      area: area === 'other' && areaValue === 'other:' ? '' : areaValue,
      ageBand: form.get('ageBand') || undefined,
      intents: form.getAll('intents'),
      consent: form.get('consent') === 'on',
    });
    if (!parsed.success) {
      const path = parsed.error.issues[0]?.path[0];
      const message =
        path === 'email'
          ? t.errors.email
          : path === 'area'
            ? t.errors.area
            : path === 'consent'
              ? t.errors.consent
              : t.errors.generic;
      setStatus({ kind: 'error', message });
      return;
    }

    setStatus({ kind: 'sending' });
    const { error } = await createClient().rpc(SUPABASE_RPC.joinWaitlist, {
      p_email: parsed.data.email,
      p_area: parsed.data.area,
      p_consent_version: WAITLIST_CONSENT_VERSION,
      p_age_band: parsed.data.ageBand,
      p_intents: parsed.data.intents,
      p_locale: locale,
      p_utm: readUtm(),
    });

    if (error) {
      const message = error.message.includes('rate_limited')
        ? t.errors.rate
        : error.message.includes('invalid_email')
          ? t.errors.email
          : t.errors.generic;
      setStatus({ kind: 'error', message });
      return;
    }
    setStatus({ kind: 'done' });
  }

  if (status.kind === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-sage-tint text-[#2C6B52]">
          <CheckIcon size={28} />
        </span>
        <p className="font-display text-2xl font-semibold">{t.successTitle}</p>
        <p className="text-muted">{t.successBody}</p>
        <button
          type="button"
          onClick={() => {
            setStatus({ kind: 'idle' });
            setArea('');
          }}
          className="mt-2 rounded-full border border-line-strong bg-white px-5 py-2.5 font-display text-sm font-medium"
        >
          {t.again}
        </button>
      </div>
    );
  }

  const sending = status.kind === 'sending';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="wl-email" className="text-sm font-semibold">
        {t.email}
      </label>
      <input
        id="wl-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder={t.emailPlaceholder}
        className={fieldClass}
      />

      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <label htmlFor="wl-area" className="text-sm font-semibold">
            {t.area}
          </label>
          <select
            id="wl-area"
            name="area"
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className={fieldClass}
          >
            <option value="" disabled>
              {t.areaPlaceholder}
            </option>
            {areas.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          {area === 'other' && (
            <input
              name="areaOther"
              aria-label={t.areaOtherPlaceholder}
              placeholder={t.areaOtherPlaceholder}
              maxLength={70}
              className={fieldClass}
            />
          )}
        </div>
        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <label htmlFor="wl-age" className="text-sm font-semibold">
            {t.age} <span className="font-normal text-muted">{t.optional}</span>
          </label>
          <select id="wl-age" name="ageBand" defaultValue="" className={fieldClass}>
            <option value="">{t.areaPlaceholder}</option>
            {AGE_BANDS.map((band) => (
              <option key={band} value={band}>
                {band.replace('-', '–')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          {t.intents} <span className="font-normal text-muted">{t.optional}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {WAITLIST_INTENTS.map((intent: WaitlistIntent) => (
            <label
              key={intent}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-cream px-4 py-2.5 text-sm has-[:checked]:border-rose-deep has-[:checked]:bg-rose-tint"
            >
              <input
                type="checkbox"
                name="intents"
                value={intent}
                className="size-4 accent-rose-deep"
              />
              {t.intentLabels[intent]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* honeypot — ซ่อนจากคนและ screen reader */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="mt-1 flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
        <input
          type="checkbox"
          name="consent"
          className="mt-0.5 size-[18px] shrink-0 accent-rose-deep"
        />
        <span>
          {t.consent}{' '}
          <a
            href={privacyHref}
            className="font-semibold text-rose-deep no-underline hover:underline"
          >
            {t.privacy}
          </a>
        </span>
      </label>

      {status.kind === 'error' && (
        <p
          role="alert"
          className="rounded-xl bg-rose-tint px-4 py-3 text-sm font-medium text-rose-deep"
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-1.5 rounded-full bg-ink py-4 font-display text-[17px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60"
      >
        {sending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
