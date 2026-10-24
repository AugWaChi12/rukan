import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';

/** เข้าสู่ระบบ / สมัครด้วยอีเมล — social login (Apple / Google / LINE) เพิ่มทีหลังเมื่อตั้ง provider */
export function SignInScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      mode === 'signIn'
        ? api.auth.signInWithEmail(email.trim(), password)
        : api.auth.signUpWithEmail(email.trim(), password),
    // สำเร็จแล้ว SessionProvider จะเห็น session ใหม่ → navigator พาไปหน้าถัดไปเอง
  });

  return (
    <Screen>
      <AppText variant="title">{t('common.appName')}</AppText>
      <AppText variant="muted">{t('common.tagline')}</AppText>

      <AppText variant="heading">{t('auth.title')}</AppText>
      <AppText variant="muted">{t('auth.subtitle')}</AppText>

      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
      />

      {submit.isError ? <AppText variant="error">{errorMessage(submit.error)}</AppText> : null}
      {submit.isSuccess && mode === 'signUp' ? (
        <AppText variant="muted">{t('auth.checkEmail')}</AppText>
      ) : null}

      <Button
        label={mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        onPress={() => submit.mutate()}
        loading={submit.isPending}
        disabled={!email || password.length < 6}
      />
      <Button
        variant="ghost"
        label={mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
        onPress={() => {
          submit.reset();
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
        }}
      />
      <AppText variant="small">{t('auth.socialSoon')}</AppText>
    </Screen>
  );
}
