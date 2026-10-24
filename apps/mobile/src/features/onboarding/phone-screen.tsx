import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Screen, TextField } from '@/components/ui';
import { useRefreshStatus } from '@/hooks/use-my-status';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { StepHeader } from './step-header';

/** 0812345678 / +66 81 234 5678 → 66812345678 (รูปแบบที่ Supabase Auth ใช้) */
export function toE164Thai(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (/^0[689]\d{8}$/.test(digits)) return `66${digits.slice(1)}`;
  if (/^66[689]\d{8}$/.test(digits)) return digits;
  return null;
}

/** ขั้น 2: ยืนยันเบอร์ด้วย OTP ผ่าน Supabase Auth → trigger ใน DB ปรับเป็นระดับ 'phone' */
export function PhoneScreen() {
  const { t } = useTranslation();
  const refreshStatus = useRefreshStatus();
  const [phoneInput, setPhoneInput] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const phone = toE164Thai(phoneInput);

  const send = useMutation({
    mutationFn: (p: string) => api.auth.requestPhoneOtp(p),
    onSuccess: (_data, p) => setSentTo(p),
  });
  const verify = useMutation({
    mutationFn: () => api.auth.verifyPhoneOtp(sentTo ?? '', otp.trim()),
    onSuccess: refreshStatus,
  });
  const error = send.error ?? verify.error;

  return (
    <Screen>
      <StepHeader
        step="phone"
        title={t('onboarding.phone.title')}
        body={t('onboarding.phone.body')}
      />
      {sentTo === null ? (
        <>
          <TextField
            label={t('onboarding.phone.phone')}
            placeholder={t('onboarding.phone.phonePlaceholder')}
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Button
            label={t('onboarding.phone.sendOtp')}
            onPress={() => phone && send.mutate(phone)}
            disabled={!phone}
            loading={send.isPending}
          />
        </>
      ) : (
        <>
          <TextField
            label={t('onboarding.phone.otp')}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Button
            label={t('onboarding.phone.verify')}
            onPress={() => verify.mutate()}
            disabled={otp.trim().length !== 6}
            loading={verify.isPending}
          />
          <Button
            variant="ghost"
            label={t('onboarding.phone.resend')}
            onPress={() => {
              setSentTo(null);
              setOtp('');
              verify.reset();
            }}
          />
        </>
      )}
      {error ? <AppText variant="error">{errorMessage(error)}</AppText> : null}
      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Screen>
  );
}
