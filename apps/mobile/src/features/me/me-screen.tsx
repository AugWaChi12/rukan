import { queryKeys, type MyPhoto } from '@rukan/api';
import {
  PROFILE_LIMITS,
  PROFILE_MODES,
  PROFILE_THEMES,
  type MyProfile,
  type ProfileMode,
} from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AliasAvatar,
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  Loading,
  Row,
  Screen,
  TextField,
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

const PHOTO_SLOTS = Array.from({ length: PROFILE_LIMITS.photos }, (_, i) => i);

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

/** หน้า "ฉัน": รูปโปรไฟล์ + ข้อมูลพื้นฐาน + ความสนใจ + คำถามเปิดบทสนทนา + ตั้งค่า */
export function MeScreen() {
  const { t } = useTranslation();
  const profile = useQuery(queries.myProfile());
  if (profile.isPending) return <Loading />;
  if (profile.isError) {
    return (
      <Screen>
        <AppText variant="error">{errorMessage(profile.error)}</AppText>
        <Button label={t('common.retry')} onPress={() => void profile.refetch()} />
      </Screen>
    );
  }
  return <MeContent profile={profile.data} />;
}

function MeContent({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();

  return (
    <Screen>
      {/* Header Summary */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge label={t(`me.verified.${profile.verification_level}`)} tone="sage" />
          {profile.org_badge ? <Badge label={profile.org_badge} tone="lilac" /> : null}
        </Row>
        <AppText variant="title">{profile.display_name}</AppText>
        <AppText variant="muted">
          {[profile.age === null ? null : t('me.age', { age: profile.age }), profile.occupation]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <Card tone="lilac" style={{ padding: space.md }}>
          <Row>
            <AliasAvatar alias={profile.alias} color={profile.alias_color} size={34} />
            <View style={{ flex: 1 }}>
              <AppText variant="small">{t('me.alias')}</AppText>
              <AppText variant="subheading">{profile.alias}</AppText>
            </View>
          </Row>
        </Card>
      </Card>

      <PhotosSection userId={profile.id} />
      <ProfileInfoSection profile={profile} />
      <InterestsSection initialIds={profile.interests} />
      <PromptsSection initialPrompts={profile.prompts} />
      <BlocksSection />
      <SettingsSection profile={profile} />
    </Screen>
  );
}

function PhotosSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const photosQuery = useQuery(queries.myPhotos());
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const byPosition = new Map<number, MyPhoto>();
  for (const photo of photosQuery.data ?? []) {
    byPosition.set(photo.position, photo);
  }

  const upload = useMutation({
    mutationFn: async (position: number) => {
      setBusySlot(position);
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      if (picked.canceled || !picked.assets[0]) return null;

      const asset = picked.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const mime = asset.mimeType ?? blob.type;
      const contentType: 'image/webp' | 'image/jpeg' =
        mime === 'image/webp' || asset.uri.toLowerCase().endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';

      const prev = byPosition.get(position);
      const id = await api.uploadMyPhoto({
        userId,
        photoId: Crypto.randomUUID(),
        position,
        body: blob,
        contentType,
      });
      if (prev && prev.id !== id) {
        // ลบไฟล์เดิมถ้าสล็อตนั้นเคยมีรูปอยู่แล้ว
        await api.removePhoto(prev.id).catch(() => undefined);
      }
      return id;
    },
    onSettled: () => {
      setBusySlot(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myPhotos });
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: MyPhoto) => {
      setBusySlot(photo.position);
      await api.removePhoto(photo.id);
    },
    onSettled: () => {
      setBusySlot(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myPhotos });
    },
  });

  return (
    <Card>
      <AppText variant="heading">
        {t('me.photosSection', {
          count: photosQuery.data?.length ?? 0,
          max: PROFILE_LIMITS.photos,
        })}
      </AppText>
      <AppText variant="small">{t('me.photosHint')}</AppText>

      <View style={styles.photoGrid}>
        {PHOTO_SLOTS.map((slot) => {
          const photo = byPosition.get(slot);
          const isBusy = busySlot === slot && (upload.isPending || remove.isPending);

          if (photo) {
            return (
              <View
                key={slot}
                style={[
                  styles.photoTile,
                  { borderColor: colors.line, backgroundColor: colors.background },
                ]}
              >
                {photo.signedUrl ? (
                  <Image
                    source={{ uri: photo.signedUrl }}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.photoOverlayTop}>
                  <View style={[styles.photoBadge, { backgroundColor: colors.card }]}>
                    <AppText variant="small">
                      {photo.moderation_status === 'approved'
                        ? t('me.photoStatus.approved')
                        : photo.moderation_status === 'rejected'
                          ? t('me.photoStatus.rejected')
                          : t('me.photoStatus.pending')}
                    </AppText>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('me.photoRemove')} ${slot + 1}`}
                  disabled={isBusy}
                  onPress={() => remove.mutate(photo)}
                  style={[styles.photoRemoveBtn, { backgroundColor: colors.card }]}
                >
                  <AppText variant="small">{t('me.photoRemove')}</AppText>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityLabel={t('me.photoAdd', { slot: slot + 1 })}
              disabled={isBusy}
              onPress={() => upload.mutate(slot)}
              style={[
                styles.photoTile,
                styles.photoEmpty,
                {
                  borderColor: colors.line,
                  backgroundColor: colors.background,
                  opacity: isBusy ? 0.5 : 1,
                },
              ]}
            >
              <AppText variant="small">{t('me.photoAdd', { slot: slot + 1 })}</AppText>
            </Pressable>
          );
        })}
      </View>

      {upload.isError ? <AppText variant="error">{errorMessage(upload.error)}</AppText> : null}
      {remove.isError ? <AppText variant="error">{errorMessage(remove.error)}</AppText> : null}
    </Card>
  );
}

function ProfileInfoSection({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const areas = useQuery(queries.areas());

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [modes, setModes] = useState<ProfileMode[]>(profile.modes);
  const [areaId, setAreaId] = useState<string>(profile.area_id ?? '');

  const toggleMode = (mode: ProfileMode) =>
    setModes((prev) => (prev.includes(mode) ? prev.filter((x) => x !== mode) : [...prev, mode]));

  const unchanged =
    displayName.trim() === profile.display_name &&
    occupation.trim() === (profile.occupation ?? '') &&
    bio.trim() === (profile.bio ?? '') &&
    areaId === (profile.area_id ?? '') &&
    sameSet(modes, profile.modes);

  const canSave = displayName.trim().length > 0 && modes.length > 0 && !unchanged;

  const update = useMutation({
    mutationFn: () =>
      api.updateMyProfile({
        displayName,
        occupation,
        bio,
        areaId,
        modes,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <Card>
      <AppText variant="heading">{t('me.profileSection')}</AppText>

      <TextField
        label={t('me.displayName')}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={PROFILE_LIMITS.displayName}
      />

      <TextField
        label={`${t('me.occupation')} ${t('common.optional')}`}
        placeholder={t('me.occupationPlaceholder')}
        value={occupation}
        onChangeText={setOccupation}
        maxLength={PROFILE_LIMITS.occupation}
      />

      <TextField
        label={t('me.bio')}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={PROFILE_LIMITS.bio}
      />

      <AppText variant="small">{t('me.modes')}</AppText>
      <Row>
        {PROFILE_MODES.map((mode) => (
          <Chip
            key={mode}
            label={t(`modes.${mode}`)}
            selected={modes.includes(mode)}
            onPress={() => toggleMode(mode)}
          />
        ))}
      </Row>

      <AppText variant="small">
        {t('me.area')} {t('common.optional')}
      </AppText>
      <Row>
        {(areas.data ?? []).map((area) => (
          <Chip
            key={area.id}
            label={i18n.language === 'en' ? area.name_en : area.name_th}
            selected={areaId === area.id}
            onPress={() => setAreaId(areaId === area.id ? '' : area.id)}
          />
        ))}
      </Row>

      {update.isError ? <AppText variant="error">{errorMessage(update.error)}</AppText> : null}

      <Button
        label={update.isSuccess && unchanged ? t('common.saved') : t('common.save')}
        onPress={() => update.mutate()}
        loading={update.isPending}
        disabled={!canSave}
      />
    </Card>
  );
}

function InterestsSection({ initialIds }: { initialIds: string[] }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const interestsQuery = useQuery(queries.interests());
  const [selected, setSelected] = useState<string[]>(initialIds);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= PROFILE_LIMITS.interests) return prev;
      return [...prev, id];
    });
  };

  const unchanged = sameSet(selected, initialIds);

  const save = useMutation({
    mutationFn: () => api.setInterests(selected),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <Card>
      <AppText variant="heading">
        {t('me.interestsSection', {
          count: selected.length,
          max: PROFILE_LIMITS.interests,
        })}
      </AppText>
      <AppText variant="small">{t('me.interestsHint')}</AppText>

      <Row>
        {(interestsQuery.data ?? []).map((item) => (
          <Chip
            key={item.id}
            label={i18n.language === 'en' ? item.name_en : item.name_th}
            selected={selected.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        ))}
      </Row>

      {save.isError ? <AppText variant="error">{errorMessage(save.error)}</AppText> : null}

      <Button
        label={save.isSuccess && unchanged ? t('common.saved') : t('me.SaveInterests')}
        onPress={() => save.mutate()}
        loading={save.isPending}
        disabled={unchanged}
      />
    </Card>
  );
}

function PromptsSection({
  initialPrompts,
}: {
  initialPrompts: { prompt_id: string; answer: string }[];
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const promptsQuery = useQuery(queries.prompts());
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialPrompts.map((p) => [p.prompt_id, p.answer])),
  );
  const [activeIds, setActiveIds] = useState<string[]>(() =>
    initialPrompts.map((p) => p.prompt_id),
  );

  const savedByPrompt = new Map(initialPrompts.map((p) => [p.prompt_id, p.answer]));
  const allPrompts = promptsQuery.data ?? [];
  const promptText = (id: string) => {
    const found = allPrompts.find((p) => p.id === id);
    if (!found) return id;
    return i18n.language === 'en' ? found.text_en : found.text_th;
  };

  const savePrompt = useMutation({
    mutationFn: ({ promptId, answer }: { promptId: string; answer: string }) =>
      api.setPromptAnswer(promptId, answer),
    onSuccess: (_data, variables) => {
      if (variables.answer.trim().length === 0) {
        setActiveIds((prev) => prev.filter((id) => id !== variables.promptId));
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
    },
  });

  const availablePrompts = allPrompts.filter((p) => !activeIds.includes(p.id));

  return (
    <Card>
      <AppText variant="heading">
        {t('me.promptsSection', {
          count: activeIds.length,
          max: PROFILE_LIMITS.prompts,
        })}
      </AppText>
      <AppText variant="small">{t('me.promptsHint')}</AppText>

      {activeIds.map((promptId) => {
        const value = drafts[promptId] ?? '';
        const saved = savedByPrompt.get(promptId) ?? '';
        const dirty = value.trim() !== saved.trim() && value.trim().length > 0;

        return (
          <View key={promptId} style={styles.promptBlock}>
            <TextField
              label={promptText(promptId)}
              placeholder={t('me.promptAddPlaceholder')}
              value={value}
              onChangeText={(text) => setDrafts((prev) => ({ ...prev, [promptId]: text }))}
              multiline
              maxLength={PROFILE_LIMITS.promptAnswer}
            />
            <Row>
              <Button
                label={t('me.promptSave')}
                onPress={() => savePrompt.mutate({ promptId, answer: value })}
                loading={savePrompt.isPending}
                disabled={!dirty}
              />
              <Button
                variant="ghost"
                label={t('me.promptRemove')}
                onPress={() => {
                  if (saved) {
                    savePrompt.mutate({ promptId, answer: '' });
                  } else {
                    setActiveIds((prev) => prev.filter((id) => id !== promptId));
                  }
                }}
                disabled={savePrompt.isPending}
              />
            </Row>
          </View>
        );
      })}

      {activeIds.length < PROFILE_LIMITS.prompts && availablePrompts.length > 0 ? (
        <>
          <AppText variant="small">{t('me.promptChoose')}</AppText>
          <Row>
            {availablePrompts.map((p) => (
              <Chip
                key={p.id}
                label={i18n.language === 'en' ? p.text_en : p.text_th}
                selected={false}
                onPress={() => setActiveIds((prev) => [...prev, p.id])}
              />
            ))}
          </Row>
        </>
      ) : null}

      {savePrompt.isError ? (
        <AppText variant="error">{errorMessage(savePrompt.error)}</AppText>
      ) : null}
    </Card>
  );
}

function BlocksSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const blocksQuery = useQuery(queries.myBlocks());

  const unblockMut = useMutation({
    mutationFn: (blockId: string) => api.unblockUser(blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myBlocks }),
  });

  const blocks = blocksQuery.data ?? [];

  return (
    <Card>
      <AppText variant="heading">{t('me.blocksSection', { count: blocks.length })}</AppText>
      {blocks.length === 0 ? (
        <AppText variant="muted">{t('me.blocksEmpty')}</AppText>
      ) : (
        blocks.map((b) => (
          <Card key={b.id} tone="cream" style={{ padding: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">
                  {b.is_anonymous
                    ? t('me.anonymousBlockedUser')
                    : (b.display_name ?? t('me.anonymousBlockedUser'))}
                </AppText>
                <AppText variant="small">{new Date(b.created_at).toLocaleDateString()}</AppText>
              </View>
              <Button
                size="sm"
                variant="ghost"
                label={t('me.unblock')}
                loading={unblockMut.isPending}
                onPress={() => unblockMut.mutate(b.id)}
              />
            </Row>
          </Card>
        ))
      )}
    </Card>
  );
}

function SettingsSection({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { setPreference } = useAppTheme();

  const update = useMutation({
    mutationFn: api.updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myProfile }),
  });

  return (
    <Card>
      <AppText variant="heading">{t('me.settingsSection')}</AppText>

      <AppText variant="small">{t('me.theme')}</AppText>
      <Row>
        {PROFILE_THEMES.map((theme) => (
          <Chip
            key={theme}
            label={t(`me.themes.${theme}`)}
            selected={profile.theme === theme}
            onPress={() => {
              setPreference(theme);
              update.mutate({ theme });
            }}
          />
        ))}
      </Row>

      <AppText variant="small">{t('me.language')}</AppText>
      <Row>
        {(['th', 'en'] as const).map((locale) => (
          <Chip
            key={locale}
            label={locale === 'th' ? 'ไทย' : 'English'}
            selected={i18n.language === locale}
            onPress={() => {
              void i18n.changeLanguage(locale);
              update.mutate({ locale });
            }}
          />
        ))}
      </Row>

      <Button variant="ghost" label={t('common.signOut')} onPress={() => void api.auth.signOut()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayTop: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
  },
  photoBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  photoRemoveBtn: {
    position: 'absolute',
    bottom: space.xs,
    right: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  promptBlock: {
    gap: space.sm,
  },
});
