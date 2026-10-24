import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { AppText, BouncyPressable, Button, Screen, TextField } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ICON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="%23EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="%234285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="%23FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="%2334A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

export function SignInScreen() {
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

  const googleSignIn = useMutation({
    mutationFn: async () => {
      const redirectUri =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : Linking.createURL('auth/callback')
          : Linking.createURL('auth/callback', { scheme: 'rukan' });

      const oauth = await api.auth.signInWithOAuth('google', redirectUri);
      if (!oauth?.url) throw new Error('Cannot get OAuth URL');

      if (Platform.OS === 'web') {
        window.location.href = oauth.url;
        return;
      }

      const res = await WebBrowser.openAuthSessionAsync(oauth.url, redirectUri);
      if (res.type === 'success' && res.url) {
        const url = res.url;
        const errorMatch =
          url.match(/[?&#]error_description=([^&#]+)/) || url.match(/[?&#]error=([^&#]+)/);
        if (errorMatch?.[1]) {
          throw new Error(decodeURIComponent(errorMatch[1].replace(/\+/g, ' ')));
        }

        const codeMatch = url.match(/[?&]code=([^&#]+)/);
        if (codeMatch?.[1]) {
          const code = decodeURIComponent(codeMatch[1]);
          await api.auth.exchangeCodeForSession(code);
          return;
        }

        const accessMatch = url.match(/[#&]access_token=([^&#]+)/);
        const refreshMatch = url.match(/[#&]refresh_token=([^&#]+)/);
        if (accessMatch?.[1] && refreshMatch?.[1]) {
          await api.auth.setSession({
            access_token: decodeURIComponent(accessMatch[1]),
            refresh_token: decodeURIComponent(refreshMatch[1]),
          });
          return;
        }
      }
    },
  });

  const error = googleSignIn.error || submit.error;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t('common.appName')}</AppText>
        <AppText variant="muted">{t('common.tagline')}</AppText>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="heading">{t('auth.title')}</AppText>
        <AppText variant="muted">{t('auth.subtitle')}</AppText>
      </View>

      {/* Social Login Options */}
      <View style={styles.socialGroup}>
        <BouncyPressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithGoogle')}
          onPress={() => googleSignIn.mutate()}
          disabled={googleSignIn.isPending}
          style={[
            styles.googleButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.lineStrong,
            },
          ]}
        >
          {googleSignIn.isPending ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <View style={styles.socialButtonContent}>
              <Image
                source={{ uri: GOOGLE_ICON_SVG }}
                style={styles.googleIcon}
                contentFit="contain"
              />
              <AppText variant="body" style={styles.socialButtonLabel}>
                {t('auth.continueWithGoogle')}
              </AppText>
            </View>
          )}
        </BouncyPressable>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
        <AppText variant="small" style={{ color: colors.muted }}>
          {t('auth.orDivider')}
        </AppText>
        <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
      </View>

      {/* Email / Password Form */}
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

      {error ? <AppText variant="error">{errorMessage(error)}</AppText> : null}
      {submit.isSuccess && mode === 'signUp' ? (
        <AppText variant="muted">{t('auth.checkEmail')}</AppText>
      ) : null}

      <Button
        label={mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        onPress={() => submit.mutate()}
        loading={submit.isPending}
        disabled={!email || password.length < 6 || googleSignIn.isPending}
      />
      <Button
        variant="ghost"
        label={mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
        onPress={() => {
          submit.reset();
          googleSignIn.reset();
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: space.xs,
  },
  sectionHeader: {
    marginBottom: space.md,
  },
  socialGroup: {
    gap: space.sm,
    marginBottom: space.xs,
  },
  googleButton: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  socialButtonLabel: {
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.md,
    gap: space.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
});
