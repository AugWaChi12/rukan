import Ionicons from '@expo/vector-icons/Ionicons';
import type { MyProfile } from '@rukan/shared';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ListGroup, ListRow } from '@/components/list';
import { AliasAvatar, AppText, Screen } from '@/components/ui';
import { api, queries } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';
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
