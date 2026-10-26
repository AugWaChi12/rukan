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
} from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const profileQuery = useQuery(queries.myProfile());
  const areasQuery = useQuery(queries.areas());
  const trendingQuery = useQuery(queries.spaceTrending());
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
    mutationFn: () => api.createPost({ body, mood }),
    onSuccess: async (res) => {
      haptic.success();
      setBody('');
      if (res.care_notice) setShowCareNotice(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.space });
    },
  });

  // Optimistic like toggle เพื่อความสมูท 0ms latency
  const likeMut = useMutation({
    mutationFn: async (post: SpacePost) => {
      if (post.liked_by_me) {
        await api.unlikePost(post.id);
      } else {
        await api.likePost(post.id);
      }
    },
    onMutate: async (post: SpacePost) => {
      haptic.light();
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

  return (
    <Screen>
      {/* Header สไตล์ Soft Bubble */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('space.eyebrow')}
          </AppText>
          <AppText variant="title">{t('space.title')}</AppText>
        </View>
        {profileQuery.data ? (
          <View
            style={[styles.aliasPill, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            <AliasAvatar
              alias={profileQuery.data.alias}
              color={profileQuery.data.alias_color}
              size={26}
            />
            <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
              {profileQuery.data.alias}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="muted">{t('space.subtitle')}</AppText>

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

      {/* เช็กอินอารมณ์ประจำวัน — ทรงฟองสบู่นุ่มนวล แนวนอน กะทัดรัด ไม่แย่งพื้นที่ฟีด */}
      <View style={styles.moodSection}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Row style={{ gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 15 }}>🫧</Text>
            <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
              {checkedMood
                ? `${t('space.moodCheckedIn')} ${t(`space.moods.${checkedMood}`)}`
                : t('space.moodTitle')}
            </AppText>
          </Row>
          {checkedMood ? <Badge label={t(`space.moods.${checkedMood}`)} tone="gold" /> : null}
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
                  }}
                >
                  {t(`space.moods.${m}`)}
                </AppText>
              </BouncyPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* กล่องเขียนโพสต์ไม่ระบุตัวตน สไตล์ Liquid Glass */}
      <View
        style={[
          styles.composerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.accentSoft,
            shadowColor: '#000',
          },
        ]}
      >
        <TextField
          label={`${body.trim().length}/${SPACE_LIMITS.postBody}`}
          hint={t('space.composeHint')}
          value={body}
          onChangeText={setBody}
          placeholder={t('space.composePlaceholder')}
          maxLength={SPACE_LIMITS.postBody}
          multiline
        />
        {composeHashtags.length > 0 ? (
          <Row style={{ gap: space.xs, marginTop: -4 }}>
            {composeHashtags.map((tag) => (
              <Badge key={tag} label={`#${tag}`} tone="gold" />
            ))}
          </Row>
        ) : null}
        {createPostMut.error ? (
          <AppText variant="error">{errorMessage(createPostMut.error)}</AppText>
        ) : null}
        <Row style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <Button
            variant="primary"
            size="md"
            label={t('space.postButton')}
            loading={createPostMut.isPending}
            disabled={body.trim().length === 0}
            onPress={() => createPostMut.mutate()}
          />
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
        <EmptyState badge="Space" title={t('space.emptyTitle')} body={t('space.emptyBody')} />
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
            <Card key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <AliasAvatar alias={post.alias} color={post.alias_color} size={38} />
                <View style={{ flex: 1 }}>
                  <Row>
                    <AppText variant="subheading">{post.alias}</AppText>
                    {post.is_mine ? <Badge label={t('space.mineTag')} tone="sage" /> : null}
                    {post.mood ? (
                      <Badge label={t(`space.moods.${post.mood}`)} tone="lilac" />
                    ) : null}
                  </Row>
                  <AppText variant="small">{metaParts.join(' · ')}</AppText>
                </View>
                {post.is_mine ? (
                  <BouncyPressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    hapticFeedback="medium"
                    onPress={() => setPostToDelete(post.id)}
                    style={[styles.iconBtn, { borderColor: colors.line }]}
                  >
                    <AppText variant="small" style={{ color: colors.muted }}>
                      {t('common.delete')}
                    </AppText>
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
                    <Text style={{ color: colors.muted, fontWeight: '700' }}>⋯</Text>
                  </BouncyPressable>
                )}
              </View>

              <AppText variant="body" style={styles.postBody}>
                {post.body}
              </AppText>

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
                      backgroundColor: post.liked_by_me ? colors.accentTint : colors.background,
                      borderColor: post.liked_by_me ? colors.accentSoft : colors.line,
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
                    ♥ {t('space.like', { count: post.like_count })}
                  </Text>
                </BouncyPressable>

                <BouncyPressable
                  accessibilityRole="button"
                  hapticFeedback="light"
                  onPress={() => setActiveReplyPost(post)}
                  style={[
                    styles.actionPill,
                    { backgroundColor: colors.background, borderColor: colors.line },
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
                      { backgroundColor: colors.lilacTint, borderColor: colors.lilac },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.lilacDeep }}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
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
    gap: space.xs,
  },
  moodScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  composerCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.md,
    gap: space.xs,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
    gap: space.sm,
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
});
