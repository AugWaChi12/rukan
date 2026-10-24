import Ionicons from '@expo/vector-icons/Ionicons';
import { queryKeys, type MyPhoto } from '@rukan/api';
import { PROFILE_LIMITS } from '@rukan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';
import { SubScreen, WithProfile } from './shared';

const PHOTO_SLOTS = Array.from({ length: PROFILE_LIMITS.photos }, (_, i) => i);

export function PhotosScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('me.menu.photos')} hint={t('me.photosHint')}>
      <WithProfile>{(profile) => <PhotoGrid userId={profile.id} />}</WithProfile>
    </SubScreen>
  );
}

function PhotoGrid({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const photosQuery = useQuery(queries.myPhotos());
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const byPosition = new Map<number, MyPhoto>();
  for (const photo of photosQuery.data ?? []) byPosition.set(photo.position, photo);

  const refresh = () => {
    setBusySlot(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.myPhotos });
  };

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
      const blob = await (await fetch(asset.uri)).blob();
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
      // ลบไฟล์เดิมถ้าสล็อตนั้นเคยมีรูปอยู่แล้ว
      if (prev && prev.id !== id) await api.removePhoto(prev.id).catch(() => undefined);
      return id;
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: async (photo: MyPhoto) => {
      setBusySlot(photo.position);
      await api.removePhoto(photo.id);
    },
    onSettled: refresh,
  });

  const statusLabel = (status: MyPhoto['moderation_status']) =>
    status === 'approved'
      ? t('me.photoStatus.approved')
      : status === 'rejected'
        ? t('me.photoStatus.rejected')
        : t('me.photoStatus.pending');

  return (
    <>
      <View style={styles.grid}>
        {PHOTO_SLOTS.map((slot) => {
          const photo = byPosition.get(slot);
          const isBusy = busySlot === slot && (upload.isPending || remove.isPending);

          if (photo) {
            return (
              <View
                key={slot}
                style={[styles.tile, { backgroundColor: colors.subtle, borderColor: colors.line }]}
              >
                {photo.signedUrl ? (
                  <Image
                    source={{ uri: photo.signedUrl }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : null}
                {slot === 0 ? (
                  <View style={[styles.mainTag, { backgroundColor: colors.text }]}>
                    <AppText style={[styles.tagText, { color: colors.background }]}>
                      {t('me.photoMain')}
                    </AppText>
                  </View>
                ) : null}
                <View style={[styles.status, { backgroundColor: colors.card }]}>
                  <AppText style={[styles.tagText, { color: colors.text }]}>
                    {statusLabel(photo.moderation_status)}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('me.photoRemove')} ${slot + 1}`}
                  disabled={isBusy}
                  hitSlop={8}
                  onPress={() => remove.mutate(photo)}
                  style={[styles.removeBtn, { backgroundColor: colors.card }]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="close" size={16} color={colors.text} />
                  )}
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
              style={({ pressed }) => [
                styles.tile,
                styles.empty,
                {
                  borderColor: colors.lineStrong,
                  backgroundColor: pressed ? colors.subtle : colors.card,
                },
              ]}
            >
              {isBusy ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <Ionicons name="add" size={26} color={colors.muted} />
              )}
            </Pressable>
          );
        })}
      </View>

      <AppText variant="small">
        {t('me.photoCount', {
          count: photosQuery.data?.length ?? 0,
          max: PROFILE_LIMITS.photos,
        })}
      </AppText>

      {upload.isError ? <AppText variant="error">{errorMessage(upload.error)}</AppText> : null}
      {remove.isError ? <AppText variant="error">{errorMessage(remove.error)}</AppText> : null}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '31.5%',
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  mainTag: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  status: {
    position: 'absolute',
    bottom: space.xs,
    left: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
