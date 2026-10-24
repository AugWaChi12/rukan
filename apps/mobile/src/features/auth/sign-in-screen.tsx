import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText, BouncyPressable, Button, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

// โลโก้ Google 4 สีทางการ (Official 4-color Google "G" icon)
const GOOGLE_ICON = require('../../../assets/images/google.png');

/** ดึงค่าจาก query / hash ของ redirect URL */
function param(url: string, key: string): string | undefined {
  const match = url.match(new RegExp(`[?&#]${key}=([^&#]+)`));
  return match?.[1] ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : undefined;
}

async function signInWithGoogle() {
  const redirectUri =
    Platform.OS === 'web'
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL('auth/callback', { scheme: 'rukan' });

  const oauth = await api.auth.signInWithOAuth('google', redirectUri);
  if (!oauth?.url) throw new Error('oauth_url_missing');

  if (Platform.OS === 'web') {
    window.location.href = oauth.url;
    return;
  }

  const res = await WebBrowser.openAuthSessionAsync(oauth.url, redirectUri);
  // ผู้ใช้กดปิดหน้าต่างเอง → ไม่ถือเป็น error
  if (res.type !== 'success') return;

  const failure = param(res.url, 'error_description') ?? param(res.url, 'error');
  if (failure) throw new Error(failure);

  // PKCE: รับแค่ code (แลกได้เฉพาะเครื่องที่มี code_verifier) — ไม่รับ access_token จาก URL
  const code = param(res.url, 'code');
  if (!code) throw new Error('oauth_code_missing');
  await api.auth.exchangeCodeForSession(code);
  // สำเร็จแล้ว SessionProvider จะเห็น session ใหม่ → navigator พาไปหน้าถัดไปเอง
}

/** หน้าแรกของแอป: Google เป็นทางหลัก อีเมลเป็นทางรอง */
export function SignInScreen() {
  const [step, setStep] = useState<'welcome' | 'email'>('welcome');
  return step === 'welcome' ? (
    <WelcomeStep onUseEmail={() => setStep('email')} />
  ) : (
    <EmailStep onBack={() => setStep('welcome')} />
  );
}

function WelcomeStep({ onUseEmail }: { onUseEmail: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const google = useMutation({ mutationFn: signInWithGoogle });

  return (
    <Screen scroll={false} style={styles.welcome}>
      {/* แบรนด์ */}
      <View style={styles.brandRow}>
        <View style={[styles.brandDot, { backgroundColor: colors.accentSoft }]} />
        <AppText style={styles.brandName}>{t('common.appName')}</AppText>
      </View>

      {/* ภาพประกอบ: ฟองสามลูกซ้อนกัน = คนสามคนที่เพิ่งเริ่มรู้จักกัน */}
      <View style={styles.art} accessible={false}>
        <View style={[styles.bubble, styles.bubbleA, { backgroundColor: palette.rose }]} />
        <View style={[styles.bubble, styles.bubbleB, { backgroundColor: palette.lilac }]} />
        <View style={[styles.bubble, styles.bubbleC, { backgroundColor: palette.sage }]} />
      </View>

      {/* ข้อความหลัก */}
      <View style={styles.copy}>
        <AppText style={[styles.headline, { color: colors.text }]}>{t('auth.headline')}</AppText>
        <AppText style={[styles.lede, { color: colors.muted }]}>{t('auth.lede')}</AppText>
      </View>

      {/* ปุ่ม */}
      <View style={styles.actions}>
        <BouncyPressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithGoogle')}
          onPress={() => google.mutate()}
          disabled={google.isPending}
          activeScale={0.98}
          style={[
            styles.googleButton,
            { backgroundColor: colors.card, borderColor: colors.lineStrong },
          ]}
        >
          {google.isPending ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Image source={GOOGLE_ICON} style={styles.googleIcon} contentFit="contain" />
              <AppText style={[styles.googleLabel, { color: colors.text }]}>
                {t('auth.continueWithGoogle')}
              </AppText>
            </>
          )}
        </BouncyPressable>

        <Pressable
          accessibilityRole="button"
          onPress={onUseEmail}
          hitSlop={8}
          style={({ pressed }) => [styles.textLink, { opacity: pressed ? 0.5 : 1 }]}
        >
          <AppText style={[styles.textLinkLabel, { color: colors.text }]}>
            {t('auth.useEmail')}
          </AppText>
        </Pressable>

        {google.isError ? (
          <AppText variant="error" style={styles.center}>
            {errorMessage(google.error)}
          </AppText>
        ) : null}

        <AppText variant="small" style={[styles.center, styles.legal]}>
          {t('auth.legal')}
        </AppText>
      </View>
    </Screen>
  );
}

function EmailStep({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      mode === 'signIn'
        ? api.auth.signInWithEmail(email.trim(), password)
        : api.auth.signUpWithEmail(email.trim(), password),
  });

  const isSignIn = mode === 'signIn';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.back')}
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
        >
          <AppText style={[styles.backLabel, { color: colors.text }]}>‹ {t('auth.back')}</AppText>
        </Pressable>

        <View style={styles.emailHeader}>
          <AppText style={[styles.emailTitle, { color: colors.text }]}>
            {isSignIn ? t('auth.emailTitleSignIn') : t('auth.emailTitleSignUp')}
          </AppText>
          <AppText variant="muted">{t('auth.emailSubtitle')}</AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            returnKeyType="next"
          />
          <TextField
            label={t('auth.password')}
            hint={isSignIn ? undefined : t('auth.passwordHint')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            returnKeyType="go"
            onSubmitEditing={() => {
              if (email && password.length >= 6) submit.mutate();
            }}
          />
        </View>

        {submit.isError ? <AppText variant="error">{errorMessage(submit.error)}</AppText> : null}
        {submit.isSuccess && !isSignIn ? (
          <View style={[styles.notice, { backgroundColor: colors.sageTint }]}>
            <AppText style={{ color: colors.sageDeep }}>{t('auth.checkEmail')}</AppText>
          </View>
        ) : null}

        <Button
          label={isSignIn ? t('auth.signIn') : t('auth.signUp')}
          onPress={() => submit.mutate()}
          loading={submit.isPending}
          disabled={!email || password.length < 6}
        />

        <View style={styles.switchRow}>
          <AppText variant="muted">
            {isSignIn ? t('auth.noAccount') : t('auth.haveAccount')}
          </AppText>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              submit.reset();
              setMode(isSignIn ? 'signUp' : 'signIn');
            }}
          >
            <AppText style={[styles.switchLink, { color: colors.accent }]}>
              {isSignIn ? t('auth.toSignUp') : t('auth.toSignIn')}
            </AppText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },

  // --- welcome ---
  welcome: { justifyContent: 'space-between', paddingBottom: space.lg, gap: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  brandDot: { width: 14, height: 14, borderRadius: 7 },
  brandName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  art: { height: 190, alignSelf: 'center', width: 240, marginVertical: space.lg },
  bubble: { position: 'absolute', borderRadius: 999, opacity: 0.85 },
  bubbleA: { width: 130, height: 130, left: 10, top: 30 },
  bubbleB: { width: 110, height: 110, right: 14, top: 0 },
  bubbleC: { width: 92, height: 92, right: 52, bottom: 0 },

  copy: { gap: space.md },
  headline: { fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8 },
  lede: { fontSize: 16, lineHeight: 24, maxWidth: 320 },

  actions: { gap: space.md, marginTop: space.xxl },
  googleButton: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  googleIcon: { width: 20, height: 20 },
  googleLabel: { fontSize: 16, fontWeight: '600' },
  textLink: { alignSelf: 'center', paddingVertical: space.sm },
  textLinkLabel: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  legal: { lineHeight: 18, paddingHorizontal: space.lg },

  // --- email ---
  back: { alignSelf: 'flex-start', paddingVertical: space.xs },
  backLabel: { fontSize: 16, fontWeight: '600' },
  emailHeader: { gap: space.xs, marginTop: space.md, marginBottom: space.sm },
  emailTitle: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  form: { gap: space.lg },
  notice: { borderRadius: radius.sm, padding: space.md },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
  },
  switchLink: { fontSize: 14, fontWeight: '700' },
});
