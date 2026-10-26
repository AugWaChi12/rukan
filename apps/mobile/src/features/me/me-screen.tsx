import Ionicons from '@expo/vector-icons/Ionicons';
import type { MyProfile, PassDuration } from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AiSparkleIcon, RukanCoinIcon, TierPassIcon } from '@/components/brand-icons';
import { ListGroup, ListRow } from '@/components/list';
import {
  AliasAvatar,
  AppText,
  Badge,
  Button,
  Card,
  ModalSheet,
  Row,
  Screen,
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';
import { WithProfile } from './shared';

const SITE = 'https://rukan.app';

/** แท็บ "ฉัน": การ์ดโปรไฟล์ด้านบน + เมนูเป็นกลุ่ม แต่ละแถวพาไปหน้าย่อย */
export function MeScreen() {
  return <WithProfile>{(profile) => <MeMenu profile={profile} />}</WithProfile>;
}

function MeMenu({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const { colors, preference } = useAppTheme();
  const photos = useQuery(queries.myPhotos());
  const blocks = useQuery(queries.myBlocks());
  const subQuery = useQuery(queries.mySubscription());
  const tierConfigsQuery = useQuery(queries.tierConfigs());
  const [showPassSheet, setShowPassSheet] = useState(false);
  const [passNotice, setPassNotice] = useState<string | null>(null);

  const exchangeMut = useMutation({
    mutationFn: (vars: { tier: 'gold' | 'premium'; duration: PassDuration }) =>
      api.exchangeCoinsForPass(vars),
    onSuccess: async () => {
      haptic.success();
      setPassNotice(t('me.wallet.exchangeSuccess'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.mySubscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myDeck }),
      ]);
    },
  });

  const sub = subQuery.data;
  const currentTier = sub?.tier ?? 'free';
  const coinBalance = sub?.coin_balance ?? 0;
  const tierConfigs = tierConfigsQuery.data ?? [];

  const go = (href: string) => router.push(href as Href);
  const openSite = (path: string) =>
    void WebBrowser.openBrowserAsync(`${SITE}${i18n.language === 'en' ? '/en' : ''}${path}`);

  const signOut = () => {
    if (Platform.OS === 'web') {
      void api.auth.signOut();
      return;
    }
    Alert.alert(t('me.menu.signOutTitle'), t('me.menu.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.signOut'), style: 'destructive', onPress: () => void api.auth.signOut() },
    ]);
  };

  const photoCount = photos.data?.length ?? 0;
  const cover = photos.data?.find((p) => p.position === 0)?.signedUrl ?? null;
  const subtitle = [
    profile.age === null ? null : t('me.age', { age: profile.age }),
    profile.occupation,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <AppText style={[styles.pageTitle, { color: colors.text }]}>{t('tabs.me')}</AppText>

      {/* การ์ดโปรไฟล์ */}
      <Pressable
        accessibilityRole="button"
        onPress={() => go('/me/profile')}
        style={({ pressed }) => [
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.line, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.accentTint }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <AppText style={[styles.avatarInitial, { color: colors.accent }]}>
              {profile.display_name.slice(0, 1).toUpperCase()}
            </AppText>
          )}
        </View>
        <View style={styles.profileText}>
          <AppText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {profile.display_name}
          </AppText>
          {subtitle ? (
            <AppText variant="muted" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
          <View style={styles.verifiedRow}>
            <Ionicons
              name={profile.verification_level === 'none' ? 'shield-outline' : 'shield-checkmark'}
              size={14}
              color={profile.verification_level === 'none' ? colors.muted : colors.sageDeep}
            />
            <AppText
              variant="small"
              style={{
                color: profile.verification_level === 'none' ? colors.muted : colors.sageDeep,
                fontWeight: '600',
              }}
            >
              {t(`me.verified.${profile.verification_level}`)}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      {/* กระเป๋าเหรียญ Rukan Coin & ระดับ Pass (Free | Gold | Premium + AI) */}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic.selection();
          setPassNotice(null);
          setShowPassSheet(true);
        }}
        style={({ pressed }) => [
          styles.walletCard,
          {
            backgroundColor: currentTier === 'premium' ? colors.accentTint : colors.goldTint,
            borderColor: currentTier === 'premium' ? colors.accentSoft : colors.gold,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 6 }}>
              <TierPassIcon tier={currentTier} size={20} />
              <Badge
                label={t(`me.wallet.tiers.${currentTier}`)}
                tone={
                  currentTier === 'premium' ? 'rose' : currentTier === 'gold' ? 'gold' : 'muted'
                }
              />
            </Row>
            <Row style={{ gap: 6 }}>
              <RukanCoinIcon size={20} />
              <Badge label={t('me.wallet.coinsValue', { count: coinBalance })} tone="ink" />
            </Row>
          </Row>
          <Row style={{ gap: 6, marginTop: 2 }}>
            <AiSparkleIcon size={16} />
            <AppText variant="small" style={{ color: palette.ink, fontWeight: '600', flex: 1 }}>
              {sub?.limits.allow_ai_assistant
                ? t('me.wallet.aiIncluded')
                : t('me.wallet.aiPerUse', { coins: sub?.limits.ai_coin_cost_per_use ?? 30 })}
            </AppText>
          </Row>
          <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('me.wallet.managePassBtn')} →
          </AppText>
        </View>
      </Pressable>

      {/* นามแฝง */}
      <View
        style={[styles.aliasCard, { backgroundColor: colors.lilacTint, borderColor: colors.lilac }]}
      >
        <AliasAvatar alias={profile.alias} color={profile.alias_color} size={34} />
        <View style={styles.profileText}>
          <AppText variant="small" style={{ color: colors.lilacDeep }}>
            {t('me.alias')}
          </AppText>
          <AppText style={[styles.alias, { color: colors.lilacDeep }]}>{profile.alias}</AppText>
        </View>
      </View>

      <ListGroup title={t('me.menu.groupProfile')}>
        <ListRow
          icon="person-outline"
          tint={colors.accentTint}
          label={t('me.menu.profileInfo')}
          onPress={() => go('/me/profile')}
        />
        <ListRow
          icon="images-outline"
          tint={colors.accentTint}
          label={t('me.menu.photos')}
          value={`${photoCount}`}
          onPress={() => go('/me/photos')}
        />
        <ListRow
          icon="sparkles-outline"
          tint={colors.lilacTint}
          label={t('me.menu.interests')}
          value={`${profile.interests.length}`}
          onPress={() => go('/me/interests')}
        />
        <ListRow
          icon="chatbubble-ellipses-outline"
          tint={colors.lilacTint}
          label={t('me.menu.prompts')}
          value={`${profile.prompts.length}`}
          onPress={() => go('/me/prompts')}
        />
      </ListGroup>

      <ListGroup title={t('me.menu.groupPrivacy')}>
        <ListRow
          icon="ban-outline"
          tint={colors.sageTint}
          label={t('me.menu.blocks')}
          value={blocks.data ? `${blocks.data.length}` : undefined}
          onPress={() => go('/me/blocks')}
        />
        <ListRow
          icon="color-palette-outline"
          tint={colors.sageTint}
          label={t('me.menu.settings')}
          value={`${t(`me.themes.${preference}`)} · ${i18n.language === 'en' ? 'EN' : 'ไทย'}`}
          onPress={() => go('/me/settings')}
        />
      </ListGroup>

      <ListGroup title={t('me.menu.groupHelp')}>
        <ListRow
          icon="people-outline"
          label={t('me.menu.rules')}
          onPress={() => openSite('/rules')}
        />
        <ListRow
          icon="lock-closed-outline"
          label={t('me.menu.privacy')}
          onPress={() => openSite('/privacy')}
        />
        <ListRow
          icon="document-text-outline"
          label={t('me.menu.terms')}
          onPress={() => openSite('/terms')}
        />
      </ListGroup>

      <ListGroup>
        <ListRow icon="log-out-outline" label={t('common.signOut')} destructive onPress={signOut} />
      </ListGroup>

      <AppText variant="small" style={styles.version}>
        {t('common.appName')} ·{' '}
        {t('me.menu.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>

      {/* Modal แลกเหรียญ Rukan Coin เป็น Gold Pass / Premium Pass */}
      <ModalSheet
        visible={showPassSheet}
        title={t('me.wallet.sheetTitle')}
        onClose={() => setShowPassSheet(false)}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 6 }}>
            <TierPassIcon tier={currentTier} size={20} />
            <Badge label={t(`me.wallet.tiers.${currentTier}`)} tone="gold" />
          </Row>
          <Row style={{ gap: 6 }}>
            <RukanCoinIcon size={20} />
            <Badge label={t('me.wallet.coinsValue', { count: coinBalance })} tone="ink" />
          </Row>
        </Row>

        <AppText variant="muted">{t('me.wallet.sheetSub')}</AppText>

        {passNotice ? (
          <Card tone="sage">
            <AppText variant="small" style={{ color: colors.sageDeep, fontWeight: '700' }}>
              {passNotice}
            </AppText>
          </Card>
        ) : null}

        {exchangeMut.error ? (
          <AppText variant="error">{errorMessage(exchangeMut.error)}</AppText>
        ) : null}

        {(['free', 'gold', 'premium'] as const).map((tierKey) => {
          const cfg = tierConfigs.find((item) => item.tier === tierKey);
          if (!cfg) return null;
          const isCurrent = currentTier === tierKey;
          const cardTone =
            tierKey === 'premium' ? 'rose' : tierKey === 'gold' ? 'cream' : 'default';

          return (
            <Card key={tierKey} tone={cardTone} style={{ gap: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 6 }}>
                  <TierPassIcon tier={tierKey} size={18} />
                  <AppText variant="subheading">{cfg.display_name}</AppText>
                </Row>
                {isCurrent ? <Badge label={t('me.wallet.activeBadge')} tone="sage" /> : null}
              </Row>

              <AppText variant="small">
                {t('me.wallet.quotaSummary', {
                  swipes: cfg.swipe_batch_size,
                  bubbles: cfg.daily_bubble_limit,
                  golden: cfg.daily_golden_bubbles,
                })}
              </AppText>

              <Row style={{ gap: 6 }}>
                <AiSparkleIcon size={15} />
                <AppText
                  variant="small"
                  style={{ fontWeight: '700', color: colors.accent, flex: 1 }}
                >
                  {cfg.allow_ai_assistant
                    ? t('me.wallet.aiIncluded')
                    : t('me.wallet.aiPerUse', { coins: cfg.ai_coin_cost_per_use })}
                </AppText>
              </Row>

              {tierKey !== 'free' ? (
                <Row style={{ marginTop: 4 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={exchangeMut.isPending}
                    label={t('me.wallet.durationWeekly', { coins: cfg.price_coins_weekly })}
                    onPress={() => exchangeMut.mutate({ tier: tierKey, duration: 'weekly' })}
                  />
                  <Button
                    size="sm"
                    variant={tierKey === 'premium' ? 'rose' : 'primary'}
                    loading={exchangeMut.isPending}
                    label={t('me.wallet.durationMonthly', { coins: cfg.price_coins_monthly })}
                    onPress={() => exchangeMut.mutate({ tier: tierKey, duration: 'monthly' })}
                  />
                </Row>
              ) : null}
            </Card>
          );
        })}

        {/* แพ็กเกจเติมเหรียญ Rukan Coin */}
        <Card tone="lilac" style={{ gap: space.xs }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 6 }}>
              <RukanCoinIcon size={18} />
              <AppText variant="subheading">{t('me.wallet.topupPackagesTitle')}</AppText>
            </Row>
            <Badge label={t('me.wallet.topupWebBonusTag')} tone="rose" />
          </Row>
          <AppText variant="small">• {t('me.wallet.topupPackStarter')}</AppText>
          <AppText variant="small" style={{ fontWeight: '700' }}>
            • {t('me.wallet.topupPackPopular')}
          </AppText>
          <AppText variant="small" style={{ fontWeight: '700' }}>
            • {t('me.wallet.topupPackGold')}
          </AppText>
          <AppText variant="small" style={{ fontWeight: '700', color: colors.accent }}>
            • {t('me.wallet.topupPackVip')}
          </AppText>
        </Card>

        <Button
          variant="lilac"
          label={t('me.wallet.webTopupBtn')}
          onPress={() => openSite(`/topup?uid=${profile.id}`)}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginBottom: space.xs },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 26, fontWeight: '800' },
  profileText: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  aliasCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  alias: { fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', marginTop: space.sm },
});
