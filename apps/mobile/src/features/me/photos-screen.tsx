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
import { compressAndPrepareImage } from '@/lib/image';
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
      const prepared = await compressAndPrepareImage(asset.uri, {
        maxWidth: 1080,
        quality: 0.85,
      });

      const prev = byPosition.get(position);
      const id = await api.uploadMyPhoto({
        userId,
        photoId: Crypto.randomUUID(),
        position,
        body: prepared.arrayBuffer,
        contentType: prepared.contentType,
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
                style={[
                  styles.tile,
                  {
                    backgroundColor: colors.subtle,
                    borderColor: slot === 0 ? colors.accent : colors.line,
                  },
                ]}
              >
                {photo.signedUrl ? (
                  <Image
                    source={{ uri: photo.signedUrl }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : null}
                {slot === 0 ? (
                  <View style={[styles.mainTag, { backgroundColor: colors.accent }]}>
                    <AppText style={[styles.tagText, { color: '#ffffff' }]}>
                      ★ {t('me.photoMain')}
                    </AppText>
                  </View>
                ) : (
                  <View style={[styles.slotBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <AppText style={[styles.tagText, { color: '#ffffff' }]}>{slot + 1}</AppText>
                  </View>
                )}
                <View style={[styles.status, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
                  <AppText style={[styles.tagText, { color: colors.text, fontSize: 10 }]}>
                    {statusLabel(photo.moderation_status)}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('me.photoRemove')} ${slot + 1}`}
                  disabled={isBusy}
                  hitSlop={8}
                  onPress={() => remove.mutate(photo)}
                  style={[styles.removeBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="close" size={14} color="#ffffff" />
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
                  borderColor: slot === 0 ? colors.accentSoft : colors.lineStrong,
                  backgroundColor: pressed ? colors.subtle : colors.card,
                },
              ]}
            >
              <View style={[styles.slotNumberCircle, { backgroundColor: colors.subtle }]}>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                  {slot + 1}
                </AppText>
              </View>
              {isBusy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <View style={[styles.plusCircle, { backgroundColor: colors.accentTint }]}>
                  <Ionicons name="add" size={22} color={colors.accent} />
                </View>
              )}
              {slot === 0 ? (
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.accent,
                    marginTop: 4,
                  }}
                >
                  ★ {t('me.photoMain')}
                </AppText>
              ) : null}
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
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  empty: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  image: { width: '100%', height: '100%' },
  mainTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  slotBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNumberCircle: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
