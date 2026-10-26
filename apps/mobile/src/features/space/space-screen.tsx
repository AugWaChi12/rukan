import {
  CHAT_LIMITS,
  extractHashtags,
  SPACE_FEED_SORTS,
  SPACE_FEED_TABS,
  SPACE_LIMITS,
  SPACE_MOODS,
  type SpaceFeedSort,
  type SpaceFeedTab,
  type SpaceMood,
  type SpacePost,
  type StoryItem,
} from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AiSparkleIcon } from '@/components/brand-icons';
import { CareNoticeBanner, SafetySheet, type SafetyTarget } from '@/components/safety-sheet';
import {
  AliasAvatar,
  AppText,
  Badge,
  BouncyPressable,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  Loading,
  ModalSheet,
  Row,
  Screen,
  SegmentedControl,
  TextField,
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { compressAndPrepareImage } from '@/lib/image';
import { detectCurrentProvince } from '@/lib/location';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

const MOOD_ICONS: Record<SpaceMood, string> = {
  lonely: '🌙',
  tired: '🥱',
  happy: '✨',
  anxious: '🌧️',
  bored: '🫥',
  hopeful: '🌱',
  calm: '🍵',
  excited: '🎉',
  overthinking: '💭',
};

export function SpaceScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();

  const [tab, setTab] = useState<SpaceFeedTab>('all');
  const [sort, setSort] = useState<SpaceFeedSort>('latest');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<SpaceMood | undefined>(undefined);
  const [checkedMood, setCheckedMood] = useState<SpaceMood | null>(null);
  const [showCareNotice, setShowCareNotice] = useState(false);
  const [bubbleToast, setBubbleToast] = useState(false);

  const [activeReplyPost, setActiveReplyPost] = useState<SpacePost | null>(null);
  const [activeBubblePost, setActiveBubblePost] = useState<SpacePost | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null);

  const profileQuery = useQuery(queries.myProfile());
  const areasQuery = useQuery(queries.areas());
  const trendingQuery = useQuery(queries.spaceTrending());
  const storiesQuery = useQuery(queries.spaceStories());
  const feedQuery = useQuery(queries.spaceFeed(tab, { hashtag: selectedHashtag, sort }));
  const currentFeedKey = queryKeys.spaceFeed(tab, selectedHashtag, sort);
  const composeHashtags = extractHashtags(body);

  const areaMap = new Map(
    (areasQuery.data ?? []).map((a) => [a.id, i18n.language === 'en' ? a.name_en : a.name_th]),
  );

  const checkinMut = useMutation({
    mutationFn: (m: SpaceMood) => api.checkinMood(m),
    onSuccess: (res) => {
      haptic.medium();
      setCheckedMood(res.mood);
      setMood(res.mood);
    },
  });

  const createPostMut = useMutation({
    mutationFn: () => api.createPost({ body, mood, mediaUrl: attachedImage }),
    onSuccess: async (res) => {
      haptic.success();
      setBody('');
      setAttachedImage(null);
      if (res.care_notice) setShowCareNotice(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.space });
    },
  });

  const deleteStoryMut = useMutation({
    mutationFn: (id: string) => api.deleteMyStory(id),
    onSuccess: async () => {
      haptic.success();
      setActiveStory(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });

  const handlePickPostImage = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0] || !profileQuery.data) return;

    try {
      setIsUploadingImage(true);
      const prepared = await compressAndPrepareImage(picked.assets[0].uri, {
        maxWidth: 1080,
        quality: 0.82,
      });
      const publicUrl = await api.uploadSpaceMedia({
        userId: profileQuery.data.id,
        body: prepared.arrayBuffer,
      });
      setAttachedImage(publicUrl);
      haptic.success();
    } catch {
      haptic.warning();
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddStory = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0] || !profileQuery.data) return;

    try {
      setIsUploadingStory(true);
      const prepared = await compressAndPrepareImage(picked.assets[0].uri, {
        maxWidth: 1080,
        quality: 0.82,
      });
      const publicUrl = await api.uploadSpaceMedia({
        userId: profileQuery.data.id,
        body: prepared.arrayBuffer,
      });
      await api.createStory({ mediaUrl: publicUrl });
      await queryClient.invalidateQueries({ queryKey: queryKeys.stories });
      haptic.success();
    } catch {
      haptic.warning();
    } finally {
      setIsUploadingStory(false);
    }
  };

  // Optimistic like toggle เพื่อความสมูท 0ms latency พร้อม Heart Pop Micro-interaction
  const likeMut = useMutation({
    mutationFn: async (post: SpacePost) => {
      if (post.liked_by_me) {
        await api.unlikePost(post.id);
      } else {
        await api.likePost(post.id);
      }
    },
    onMutate: async (post: SpacePost) => {
      if (!post.liked_by_me) {
        haptic.success();
      } else {
        haptic.light();
      }
      await queryClient.cancelQueries({ queryKey: currentFeedKey });
      const previousFeed = queryClient.getQueryData<SpacePost[]>(currentFeedKey);
      if (previousFeed) {
        queryClient.setQueryData<SpacePost[]>(
          currentFeedKey,
          previousFeed.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  liked_by_me: !p.liked_by_me,
                  like_count: p.liked_by_me ? Math.max(0, p.like_count - 1) : p.like_count + 1,
                }
              : p,
          ),
        );
      }
      return { previousFeed };
    },
    onError: (_err, _post, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(currentFeedKey, context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: currentFeedKey });
    },
  });

  const deletePostMut = useMutation({
    mutationFn: (postId: string) => api.deleteMyPost(postId),
    onSuccess: () => {
      haptic.heavy();
      queryClient.invalidateQueries({ queryKey: queryKeys.space });
    },
  });

  const tabOptions = SPACE_FEED_TABS.map((v) => ({
    value: v,
    label: t(`space.tabs.${v}`),
  }));

  const sortOptions = SPACE_FEED_SORTS.map((v) => ({
    value: v,
    label: t(`space.sorts.${v}`),
  }));

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptic.selection();
    await Promise.all([
      feedQuery.refetch(),
      storiesQuery.refetch(),
      trendingQuery.refetch(),
      profileQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [feedQuery, storiesQuery, trendingQuery, profileQuery]);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* Header สไตล์ Modern Social App */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Row style={{ alignItems: 'center', gap: 8 }}>
            <AppText variant="title" style={styles.titleText}>
              {t('space.title')}
            </AppText>
            <View style={[styles.anonPill, { backgroundColor: colors.accentTint }]}>
              <Text style={{ fontSize: 10 }}>✨</Text>
              <AppText
                variant="small"
                style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}
              >
                {t('space.eyebrow')}
              </AppText>
            </View>
          </Row>
          <AppText variant="muted" style={styles.subtitleText}>
            {t('space.subtitle')}
          </AppText>
        </View>

        {profileQuery.data ? (
          <View
            style={[
              styles.aliasPill,
              {
                backgroundColor: colors.card,
                borderColor: colors.line,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              },
            ]}
          >
            <AliasAvatar
              alias={profileQuery.data.alias}
              color={profileQuery.data.alias_color}
              size={24}
            />
            <AppText
              variant="small"
              numberOfLines={1}
              style={{ fontWeight: '700', color: colors.text, fontSize: 12, maxWidth: 110 }}
            >
              {profileQuery.data.alias}
            </AppText>
          </View>
        ) : null}
      </View>

      {showCareNotice ? <CareNoticeBanner onDismiss={() => setShowCareNotice(false)} /> : null}
      {bubbleToast ? (
        <Card tone="lilac" style={styles.toastCard}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="subheading">{t('space.BubbleSentToast')}</AppText>
            <Button
              size="sm"
              variant="ghost"
              label={t('common.close')}
              onPress={() => setBubbleToast(false)}
            />
          </Row>
        </Card>
      ) : null}

      {/* แถบเรื่องราว 24 ชม. (Ephemeral Stories Bar) สไตล์ Instagram / BeReal */}
      <View style={styles.storiesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScroll}
        >
          {/* ปุ่มเพิ่มเรื่องราว (+) */}
          <BouncyPressable
            hapticFeedback="medium"
            disabled={isUploadingStory}
            onPress={handleAddStory}
            style={styles.storyItem}
          >
            <View style={styles.storyRingWrapper}>
              <View
                style={[
                  styles.myStoryDashedRing,
                  { borderColor: colors.accentSoft, backgroundColor: colors.card },
                ]}
              >
                {profileQuery.data ? (
                  <AliasAvatar
                    alias={profileQuery.data.alias}
                    color={profileQuery.data.alias_color}
                    size={48}
                  />
                ) : (
                  <Text style={{ fontSize: 20 }}>📸</Text>
                )}
              </View>
              <View style={[styles.storyAddBadge, { backgroundColor: colors.accent }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 }}>
                  {isUploadingStory ? '⏳' : '+'}
                </Text>
              </View>
            </View>
            <AppText variant="small" numberOfLines={1} style={styles.storyAuthorName}>
              {isUploadingStory ? t('space.uploadingImage') : t('space.addStory')}
            </AppText>
          </BouncyPressable>

          {/* รายการสตอรี่ของผู้อื่น */}
          {(storiesQuery.data ?? []).map((story) => {
            const ringColor =
              story.tier === 'premium'
                ? '#8B5CF6'
                : story.tier === 'gold'
                  ? '#F59E0B'
                  : colors.accent;
            return (
              <BouncyPressable
                key={story.id}
                hapticFeedback="selection"
                onPress={() => setActiveStory(story)}
                style={styles.storyItem}
              >
                <View
                  style={[
                    styles.storyRingWrapper,
                    styles.storyOuterRing,
                    { borderColor: ringColor, backgroundColor: colors.card },
                  ]}
                >
                  <AliasAvatar alias={story.alias} color={story.alias_color} size={48} />
                </View>
                <AppText variant="small" numberOfLines={1} style={styles.storyAuthorName}>
                  {story.is_mine ? t('space.myStory') : story.alias}
                </AppText>
              </BouncyPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* เช็กอินอารมณ์ประจำวัน — ทรงฟองสบู่นุ่มนวล แนวนอน กะทัดรัด ไม่แย่งพื้นที่ฟีด */}
      <View style={styles.moodSection}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Row style={{ gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 14 }}>🫧</Text>
            <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
              {checkedMood
                ? `${t('space.moodCheckedIn')} ${t(`space.moods.${checkedMood}`)}`
                : t('space.moodTitle')}
            </AppText>
          </Row>
          {checkedMood ? (
            <Badge label={`✓ ${t(`space.moods.${checkedMood}`)}`} tone="rose" />
          ) : null}
        </Row>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodScroll}
        >
          {SPACE_MOODS.map((m) => {
            const isSelected = mood === m;
            return (
              <BouncyPressable
                key={m}
                hapticFeedback="light"
                onPress={() => {
                  setMood(isSelected ? undefined : m);
                  checkinMut.mutate(m);
                }}
                style={[
                  styles.moodPill,
                  {
                    backgroundColor: isSelected ? colors.accentTint : colors.card,
                    borderColor: isSelected ? colors.accent : colors.line,
                  },
                ]}
              >
                <Text style={{ fontSize: 14 }}>{MOOD_ICONS[m]}</Text>
                <AppText
                  variant="small"
                  style={{
                    color: isSelected ? colors.accent : colors.text,
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: 12.5,
                  }}
                >
                  {t(`space.moods.${m}`)}
                </AppText>
              </BouncyPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* กล่องเขียนโพสต์ไม่ระบุตัวตน สไตล์ Threads / Twitter */}
      <View
        style={[
          styles.composerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.line,
            shadowColor: '#000',
          },
        ]}
      >
        <Row style={{ alignItems: 'flex-start', gap: 10 }}>
          {profileQuery.data ? (
            <AliasAvatar
              alias={profileQuery.data.alias}
              color={profileQuery.data.alias_color}
              size={36}
            />
          ) : null}
          <View style={{ flex: 1, minHeight: 74 }}>
            <TextInput
              placeholder={t('space.composePlaceholder')}
              placeholderTextColor={colors.muted}
              value={body}
              onChangeText={setBody}
              maxLength={SPACE_LIMITS.postBody}
              multiline
              style={[styles.composerInput, { color: colors.text }]}
            />
          </View>
        </Row>

        {/* รูปภาพที่แนบกับโพสต์ */}
        {attachedImage ? (
          <View style={styles.previewImageWrap}>
            <Image source={{ uri: attachedImage }} style={styles.previewImage} resizeMode="cover" />
            <BouncyPressable
              hapticFeedback="light"
              onPress={() => setAttachedImage(null)}
              style={styles.removeImageBtn}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
            </BouncyPressable>
          </View>
        ) : null}

        {composeHashtags.length > 0 ? (
          <Row style={{ gap: space.xs, marginTop: 2 }}>
            {composeHashtags.map((tag) => (
              <Badge key={tag} label={`#${tag}`} tone="rose" />
            ))}
          </Row>
        ) : null}

        {createPostMut.error ? (
          <AppText variant="error">{errorMessage(createPostMut.error)}</AppText>
        ) : null}

        <View style={[styles.composerDivider, { backgroundColor: colors.line }]} />

        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Row style={{ alignItems: 'center', gap: 10 }}>
            <BouncyPressable
              hapticFeedback="light"
              disabled={isUploadingImage}
              onPress={handlePickPostImage}
              style={[
                styles.attachBtn,
                {
                  backgroundColor: attachedImage ? colors.accentTint : colors.subtle,
                  borderColor: attachedImage ? colors.accentSoft : colors.line,
                },
              ]}
            >
              <Text style={{ fontSize: 14 }}>📷</Text>
              <AppText
                variant="small"
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: attachedImage ? colors.accent : colors.muted,
                }}
              >
                {isUploadingImage
                  ? t('space.uploadingImage')
                  : attachedImage
                    ? t('space.removeImage')
                    : t('space.addImage')}
              </AppText>
            </BouncyPressable>

            <AppText variant="small" style={{ fontSize: 11, color: colors.muted }}>
              {body.trim().length}/{SPACE_LIMITS.postBody}
            </AppText>
          </Row>

          <Button
            variant="primary"
            size="sm"
            label={t('space.postButton')}
            loading={createPostMut.isPending || isUploadingImage}
            disabled={body.trim().length === 0}
            onPress={() => createPostMut.mutate()}
          />
        </Row>

        <Row style={{ alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 11 }}>🔒</Text>
          <AppText variant="muted" style={{ fontSize: 11 }}>
            {t('space.composeHint')}
          </AppText>
        </Row>
      </View>

      {/* แถบ #แฮชแท็กมาแรง สไตล์ X */}
      {(trendingQuery.data ?? []).length > 0 ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="small" style={{ fontWeight: '700', color: colors.muted }}>
            {t('space.trendingTitle')}
          </AppText>
          <Row>
            {(trendingQuery.data ?? []).map((item) => {
              const active = selectedHashtag === item.tag;
              return (
                <Chip
                  key={item.tag}
                  tone="rose"
                  label={`#${item.tag} (${item.post_count})`}
                  selected={active}
                  onPress={() => {
                    haptic.selection();
                    setSelectedHashtag(active ? null : item.tag);
                  }}
                />
              );
            })}
          </Row>
        </View>
      ) : null}

      {/* แท็บกรองโพสต์ + เรียงลำดับ (ล่าสุด / มาแรง) */}
      <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />

      {/* แบนเนอร์พิกัดตำแหน่งเมื่อเลือกแท็บ ใกล้ฉัน (Nearby) พร้อมปุ่ม GPS Auto-detect */}
      {tab === 'nearby' ? (
        <View
          style={[
            styles.locationBanner,
            { backgroundColor: colors.card, borderColor: colors.line },
          ]}
        >
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Row style={{ gap: 8, alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
                  {profileQuery.data?.area_id
                    ? (areaMap.get(profileQuery.data.area_id) ?? profileQuery.data.area_id)
                    : 'ยังไม่ได้เลือกตำแหน่ง'}
                </AppText>
                <AppText variant="muted" style={{ fontSize: 11 }}>
                  {gpsStatusText || 'แสดงเฉพาะโพสต์จากผู้คนในพื้นที่นี้'}
                </AppText>
              </View>
            </Row>
            <BouncyPressable
              hapticFeedback="selection"
              disabled={isDetectingGps}
              onPress={async () => {
                setIsDetectingGps(true);
                setGpsStatusText(t('space.detectingGps'));
                const res = await detectCurrentProvince();
                setIsDetectingGps(false);
                if (res.success && res.province) {
                  await api.updateMyProfile({ areaId: res.province.id });
                  await queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
                  await queryClient.invalidateQueries({ queryKey: queryKeys.space });
                  setGpsStatusText(t('space.gpsSuccess', { name: res.province.name_th }));
                  haptic.success();
                } else {
                  setGpsStatusText('ไม่สามารถเข้าถึง GPS ได้ กรุณาลองใหม่');
                  haptic.warning();
                }
              }}
              style={[
                styles.gpsBtn,
                { backgroundColor: colors.accentTint, borderColor: colors.accentSoft },
              ]}
            >
              <Text style={{ fontSize: 12 }}>{isDetectingGps ? '⏳' : '🎯'}</Text>
              <AppText
                variant="small"
                style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}
              >
                {isDetectingGps ? t('space.detectingGps') : t('space.detectGps')}
              </AppText>
            </BouncyPressable>
          </Row>
        </View>
      ) : null}

      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Row style={{ gap: space.xs }}>
          {sortOptions.map((opt) => (
            <Chip
              key={opt.value}
              tone="sage"
              label={opt.label}
              selected={sort === opt.value}
              onPress={() => {
                haptic.selection();
                setSort(opt.value);
              }}
            />
          ))}
        </Row>
        {selectedHashtag ? (
          <Chip
            tone="rose"
            selected
            label={`${t('space.activeHashtag', { tag: selectedHashtag })} ✕`}
            onPress={() => {
              haptic.light();
              setSelectedHashtag(null);
            }}
          />
        ) : null}
      </Row>

      {/* รายการโพสต์ */}
      {feedQuery.isPending ? (
        <Loading />
      ) : (feedQuery.data ?? []).length === 0 ? (
        <EmptyState icon="🫧" title={t('space.emptyTitle')} body={t('space.emptyBody')} />
      ) : (
        (feedQuery.data ?? []).map((post) => {
          const areaName = post.area_id ? (areaMap.get(post.area_id) ?? post.area_id) : null;
          const metaParts = [
            areaName,
            post.age_band,
            new Date(post.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          ].filter(Boolean);

          return (
            <Card
              key={post.id}
              style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.line }]}
            >
              <View style={styles.postHeader}>
                <AliasAvatar alias={post.alias} color={post.alias_color} size={40} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Row style={{ alignItems: 'center', gap: 6 }}>
                    <AppText variant="subheading" style={{ fontWeight: '700', fontSize: 14.5 }}>
                      {post.alias}
                    </AppText>
                    {post.is_mine ? <Badge label={t('space.mineTag')} tone="sage" /> : null}
                    {post.mood ? (
                      <Badge label={t(`space.moods.${post.mood}`)} tone="lilac" />
                    ) : null}
                  </Row>
                  <AppText variant="small" style={{ color: colors.muted, fontSize: 11.5 }}>
                    {metaParts.join(' · ')}
                  </AppText>
                </View>
                {post.is_mine ? (
                  <BouncyPressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    hapticFeedback="medium"
                    onPress={() => setPostToDelete(post.id)}
                    style={[styles.iconBtn, { borderColor: colors.line }]}
                  >
                    <Text style={{ fontSize: 13 }}>🗑️</Text>
                  </BouncyPressable>
                ) : (
                  <BouncyPressable
                    accessibilityRole="button"
                    accessibilityLabel={t('safety.sheetTitle')}
                    hapticFeedback="selection"
                    onPress={() =>
                      setSafetyTarget({
                        targetType: 'post',
                        targetId: post.id,
                        label: post.alias,
                      })
                    }
                    style={[styles.iconBtn, { borderColor: colors.line }]}
                  >
                    <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 14 }}>⋯</Text>
                  </BouncyPressable>
                )}
              </View>

              <AppText variant="body" style={styles.postBody}>
                {post.body}
              </AppText>

              {post.media_url ? (
                <Image
                  source={{ uri: post.media_url }}
                  style={[styles.postMediaImage, { borderColor: colors.line }]}
                  resizeMode="cover"
                />
              ) : null}

              {(post.hashtags ?? []).length > 0 ? (
                <Row style={{ gap: space.xs }}>
                  {post.hashtags.map((tag) => (
                    <Chip
                      key={tag}
                      tone="rose"
                      label={`#${tag}`}
                      selected={selectedHashtag === tag}
                      onPress={() => {
                        haptic.selection();
                        setSelectedHashtag(selectedHashtag === tag ? null : tag);
                      }}
                    />
                  ))}
                </Row>
              ) : null}

              <Row style={styles.postActions}>
                <BouncyPressable
                  accessibilityRole="button"
                  hapticFeedback="none"
                  onPress={() => likeMut.mutate(post)}
                  style={[
                    styles.actionPill,
                    {
                      backgroundColor: post.liked_by_me ? colors.accentTint : colors.subtle,
                      borderColor: post.liked_by_me ? colors.accentSoft : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: post.liked_by_me ? colors.accent : colors.text,
                    }}
                  >
                    {post.liked_by_me ? '❤️' : '🤍'} {t('space.like', { count: post.like_count })}
                  </Text>
                </BouncyPressable>

                <BouncyPressable
                  accessibilityRole="button"
                  hapticFeedback="light"
                  onPress={() => setActiveReplyPost(post)}
                  style={[
                    styles.actionPill,
                    { backgroundColor: colors.subtle, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    💬 {t('space.reply', { count: post.reply_count })}
                  </Text>
                </BouncyPressable>

                {!post.is_mine ? (
                  <BouncyPressable
                    accessibilityRole="button"
                    hapticFeedback="medium"
                    onPress={() => setActiveBubblePost(post)}
                    style={[
                      styles.bubblePill,
                      {
                        backgroundColor: '#F3E8FF',
                        borderColor: '#DDD6FE',
                        shadowColor: '#8B5CF6',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#7C3AED' }}>
                      🫧 {t('space.sendBubble')}
                    </Text>
                  </BouncyPressable>
                ) : null}
              </Row>
            </Card>
          );
        })
      )}

      {/* Modal ตอบกลับโพสต์ */}
      <RepliesSheet
        post={activeReplyPost}
        onClose={() => setActiveReplyPost(null)}
        onOpenSafety={(target) => {
          setActiveReplyPost(null);
          setSafetyTarget(target);
        }}
        onCareNotice={() => setShowCareNotice(true)}
      />

      {/* Modal ส่ง Bubble ทักเจ้าของโพสต์ */}
      <SendBubbleSheet
        post={activeBubblePost}
        onClose={() => setActiveBubblePost(null)}
        onSent={() => {
          setActiveBubblePost(null);
          setBubbleToast(true);
        }}
      />

      {/* Modal ความปลอดภัย (บล็อก / รายงาน) */}
      <SafetySheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />

      {/* Popup ยืนยันการลบโพสต์ */}
      <ConfirmDialog
        visible={!!postToDelete}
        title={t('space.deleteConfirmTitle')}
        message={t('space.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        loading={deletePostMut.isPending}
        onConfirm={() => {
          if (postToDelete) {
            deletePostMut.mutate(postToDelete);
            setPostToDelete(null);
          }
        }}
        onCancel={() => setPostToDelete(null)}
      />

      {/* Modal รับชมสตอรี่แบบเต็มจอ */}
      <StoryViewerModal
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onDelete={(story) => {
          setActiveStory(null);
          setStoryToDelete(story.id);
        }}
        onSendBubble={(story) => {
          setActiveStory(null);
          setActiveBubblePost({
            id: story.id,
            alias: story.alias,
            alias_color: story.alias_color,
            body: `[Story] ${story.caption || '🫧 สตอรี่'}`,
            mood: null,
            created_at: story.created_at,
            like_count: 0,
            reply_count: 0,
            liked_by_me: false,
            is_mine: story.is_mine,
            hashtags: [],
            area_id: null,
            media_url: story.media_url,
          });
        }}
      />

      {/* Popup ยืนยันการลบสตอรี่ */}
      <ConfirmDialog
        visible={!!storyToDelete}
        title={t('space.deleteStoryConfirmTitle')}
        message={t('space.deleteStoryConfirmMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        loading={deleteStoryMut.isPending}
        onConfirm={() => {
          if (storyToDelete) {
            deleteStoryMut.mutate(storyToDelete);
            setStoryToDelete(null);
          }
        }}
        onCancel={() => setStoryToDelete(null)}
      />
    </Screen>
  );
}

function RepliesSheet({
  post,
  onClose,
  onOpenSafety,
  onCareNotice,
}: {
  post: SpacePost | null;
  onClose: () => void;
  onOpenSafety: (target: SafetyTarget) => void;
  onCareNotice: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [replyText, setReplyText] = useState('');

  const repliesQuery = useQuery({
    ...queries.spaceReplies(post?.id ?? '00000000-0000-4000-8000-000000000000'),
    enabled: post !== null,
  });

  const replyMut = useMutation({
    mutationFn: () => {
      if (!post) throw new Error('no post');
      return api.replyPost({ postId: post.id, body: replyText });
    },
    onSuccess: async (res) => {
      haptic.success();
      setReplyText('');
      if (res.care_notice) onCareNotice();
      if (post) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.spaceReplies(post.id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.space }),
        ]);
      }
    },
  });

  if (!post) return null;

  return (
    <ModalSheet
      visible={true}
      title={t('space.repliesTitle', { alias: post.alias })}
      onClose={onClose}
    >
      <Card tone="cream">
        <Row>
          <AliasAvatar alias={post.alias} color={post.alias_color} size={30} />
          <AppText variant="subheading">{post.alias}</AppText>
        </Row>
        <AppText variant="body">{post.body}</AppText>
      </Card>

      {/* รายการตอบกลับ */}
      <View style={{ gap: space.sm }}>
        {repliesQuery.isPending ? (
          <Loading />
        ) : (repliesQuery.data ?? []).length === 0 ? (
          <EmptyState badge="0" title={t('space.emptyTitle')} body={t('space.emptyBody')} />
        ) : (
          (repliesQuery.data ?? []).map((r) => (
            <Card key={r.id} style={{ padding: space.md, gap: space.xs }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <AliasAvatar alias={r.alias} color={r.alias_color} size={26} />
                  <AppText variant="small" style={{ fontWeight: '700' }}>
                    {r.alias}
                  </AppText>
                  {r.is_op ? <Badge label={t('space.opTag')} tone="rose" /> : null}
                  {r.is_mine ? <Badge label={t('space.mineTag')} tone="sage" /> : null}
                </Row>
                {!r.is_mine ? (
                  <BouncyPressable
                    hapticFeedback="selection"
                    onPress={() =>
                      onOpenSafety({
                        targetType: 'reply',
                        targetId: r.id,
                        label: r.alias,
                      })
                    }
                  >
                    <Text style={{ color: colors.muted, fontWeight: '700' }}>⋯</Text>
                  </BouncyPressable>
                ) : null}
              </Row>
              <AppText variant="body">{r.body}</AppText>
            </Card>
          ))
        )}
      </View>

      {/* ฟอร์มตอบกลับ */}
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <TextField
          label={`${replyText.trim().length}/${SPACE_LIMITS.replyBody}`}
          value={replyText}
          onChangeText={setReplyText}
          placeholder={t('space.replyPlaceholder')}
          maxLength={SPACE_LIMITS.replyBody}
          multiline
        />
        {replyMut.error ? <AppText variant="error">{errorMessage(replyMut.error)}</AppText> : null}
        <Button
          variant="primary"
          label={t('space.replySend')}
          loading={replyMut.isPending}
          disabled={replyText.trim().length === 0}
          onPress={() => replyMut.mutate()}
        />
      </View>
    </ModalSheet>
  );
}

function SendBubbleSheet({
  post,
  onClose,
  onSent,
}: {
  post: SpacePost | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [note, setNote] = useState('');
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const subQuery = useQuery(queries.mySubscription());
  const isVip = subQuery.data?.limits.allow_ai_assistant ?? false;
  const aiCoinCost = subQuery.data?.limits.ai_coin_cost_per_use ?? 30;

  const aiMut = useMutation({
    mutationFn: () => {
      if (!post) throw new Error('no post');
      return api.useAiWingman({ contextType: 'bubble', contextText: post.body });
    },
    onSuccess: async (res) => {
      haptic.selection();
      setAiIdeas(res.suggestions);
      await queryClient.invalidateQueries({ queryKey: queryKeys.mySubscription });
    },
  });

  const sendBubbleMut = useMutation({
    mutationFn: () => {
      if (!post) throw new Error('no post');
      return api.sendBubble({ postId: post.id, message: note });
    },
    onSuccess: async () => {
      haptic.success();
      setNote('');
      setAiIdeas([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myBubbles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
      ]);
      onSent();
    },
  });

  if (!post) return null;

  return (
    <ModalSheet
      visible={true}
      title={t('space.bubbleModalTitle', { alias: post.alias })}
      onClose={onClose}
    >
      <Card tone="lilac">
        <Badge label="1-on-1 Bubble" tone="lilac" />
        <AppText variant="body">{t('space.bubbleModalHint')}</AppText>
      </Card>

      {/* AI Wingman ช่วยคิดคำทักจากโพสต์ */}
      <View style={{ gap: space.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 6 }}>
            <AiSparkleIcon size={16} />
            <AppText variant="small" style={{ fontWeight: '700', color: colors.accent }}>
              {t('space.aiWingmanHint')}
            </AppText>
          </Row>
          <Button
            size="sm"
            variant="ghost"
            loading={aiMut.isPending}
            label={
              isVip
                ? t('space.aiWingmanFreeBtn')
                : t('space.aiWingmanCoinBtn', { coins: aiCoinCost })
            }
            onPress={() => aiMut.mutate()}
          />
        </Row>
        {aiMut.error ? <AppText variant="error">{errorMessage(aiMut.error)}</AppText> : null}
        {aiIdeas.length > 0 ? (
          <View style={{ gap: 6 }}>
            {aiIdeas.map((idea) => (
              <BouncyPressable
                key={idea}
                hapticFeedback="light"
                onPress={() => setNote(idea)}
                style={{
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.accentSoft,
                  backgroundColor: colors.accentTint,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <AppText variant="small" style={{ fontWeight: '600' }}>
                  {idea}
                </AppText>
              </BouncyPressable>
            ))}
          </View>
        ) : null}
      </View>

      <TextField
        label={`${note.trim().length}/${CHAT_LIMITS.bubbleMessage}`}
        hint={t('space.bubbleModalHint')}
        value={note}
        onChangeText={setNote}
        placeholder={t('space.bubblePlaceholder')}
        maxLength={CHAT_LIMITS.bubbleMessage}
        multiline
      />

      {sendBubbleMut.error ? (
        <AppText variant="error">{errorMessage(sendBubbleMut.error)}</AppText>
      ) : null}

      <Button
        variant="rose"
        label={t('space.bubbleSend')}
        loading={sendBubbleMut.isPending}
        disabled={note.trim().length === 0}
        onPress={() => sendBubbleMut.mutate()}
      />
    </ModalSheet>
  );
}

function StoryViewerModal({
  story,
  onClose,
  onDelete,
  onSendBubble,
}: {
  story: StoryItem | null;
  onClose: () => void;
  onDelete: (story: StoryItem) => void;
  onSendBubble: (story: StoryItem) => void;
}) {
  const { t } = useTranslation();

  if (!story) return null;

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.storyViewerBackdrop}>
        {/* Header แถบด้านบน */}
        <View style={styles.storyViewerHeader}>
          <Row style={{ alignItems: 'center', gap: 10, flex: 1 }}>
            <AliasAvatar alias={story.alias} color={story.alias_color} size={38} />
            <View>
              <Row style={{ alignItems: 'center', gap: 6 }}>
                <AppText variant="subheading" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {story.alias}
                </AppText>
                {story.tier === 'premium' ? (
                  <Badge label="Premium" tone="gold" />
                ) : story.tier === 'gold' ? (
                  <Badge label="Gold" tone="gold" />
                ) : null}
                {story.is_mine ? <Badge label={t('space.mineTag')} tone="sage" /> : null}
              </Row>
              <AppText variant="small" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                {t('space.storyExpiresNotice')}
              </AppText>
            </View>
          </Row>

          <Row style={{ alignItems: 'center', gap: 10 }}>
            {story.is_mine ? (
              <BouncyPressable
                onPress={() => onDelete(story)}
                hapticFeedback="medium"
                style={[styles.storyHeaderBtn, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]}
              >
                <Text style={{ fontSize: 14 }}>🗑️</Text>
              </BouncyPressable>
            ) : null}

            <BouncyPressable
              onPress={onClose}
              hapticFeedback="light"
              style={[styles.storyHeaderBtn, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            >
              <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }}>✕</Text>
            </BouncyPressable>
          </Row>
        </View>

        {/* รูป Story คมชัดเต็มจอ */}
        <View style={styles.storyImageContainer}>
          <Image
            source={{ uri: story.media_url }}
            style={styles.storyFullImage}
            resizeMode="contain"
          />
        </View>

        {/* Footer แถบล่าง: แสดงแคปชัน และปุ่ม "ส่ง Bubble" (ไม่มีฟอร์มตอบกลับสาธารณะ) */}
        <View style={styles.storyViewerFooter}>
          {story.caption ? (
            <View style={styles.storyCaptionPill}>
              <AppText variant="body" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                {story.caption}
              </AppText>
            </View>
          ) : null}

          {!story.is_mine ? (
            <View style={styles.storyBubbleActionWrap}>
              <BouncyPressable
                onPress={() => onSendBubble(story)}
                hapticFeedback="medium"
                style={styles.storyBubbleBtn}
              >
                <Text style={{ fontSize: 17 }}>🫧</Text>
                <AppText
                  variant="subheading"
                  style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}
                >
                  {t('space.storyBubbleBtn')}
                </AppText>
              </BouncyPressable>
              <AppText
                variant="small"
                style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 11 }}
              >
                {t('space.storyBubbleHint')}
              </AppText>
            </View>
          ) : (
            <View
              style={[
                styles.storyCaptionPill,
                { backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 },
              ]}
            >
              <AppText
                variant="small"
                style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}
              >
                {t('space.myStoryNotice')}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: 2,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  anonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  subtitleText: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 18,
  },
  aliasPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toastCard: {
    padding: space.md,
  },
  moodSection: {
    gap: 8,
    marginTop: 2,
  },
  moodScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  composerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  composerInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 4,
    textAlignVertical: 'top',
  },
  composerDivider: {
    height: 1,
    width: '100%',
    marginVertical: 2,
  },
  locationBanner: {
    padding: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  moodCard: {
    gap: space.sm,
  },
  postCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBody: {
    paddingVertical: 4,
    fontSize: 15.5,
    lineHeight: 23,
  },
  postActions: {
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  actionPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bubblePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  storiesSection: {
    marginVertical: 4,
  },
  storiesScroll: {
    gap: 14,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyRingWrapper: {
    position: 'relative',
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStoryDashedRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyOuterRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAddBtn: {
    width: 68,
    alignItems: 'center',
  },
  storyAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAuthorName: {
    marginTop: 5,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  previewImageWrap: {
    position: 'relative',
    marginTop: 6,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  postMediaImage: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  storyViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
    paddingVertical: 44,
    paddingHorizontal: 16,
  },
  storyViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  storyHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  storyFullImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.xl,
  },
  storyViewerFooter: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  storyCaptionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
    maxWidth: '90%',
  },
  storyBubbleActionWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  storyBubbleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    width: '100%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});
