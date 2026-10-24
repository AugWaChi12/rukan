import {
  PROFILE_MODES,
  type DropCandidate,
  type ProfileMode,
  type SwipeDirection,
} from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafetySheet, type SafetyTarget } from '@/components/safety-sheet';
import {
  AppText,
  Badge,
  BouncyPressable,
  Button,
  Card,
  EmptyState,
  Loading,
  ModalSheet,
  Row,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';

export function DropScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();

  const [mode, setMode] = useState<ProfileMode>('friend');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [matchedCandidate, setMatchedCandidate] = useState<DropCandidate | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);

  const dropQuery = useQuery(queries.myDrop(mode));
  const areasQuery = useQuery(queries.areas());
  const interestsQuery = useQuery(queries.interests());
  const promptsQuery = useQuery(queries.prompts());

  const areaMap = new Map(
    (areasQuery.data ?? []).map((a) => [a.id, i18n.language === 'en' ? a.name_en : a.name_th]),
  );
  const interestMap = new Map(
    (interestsQuery.data ?? []).map((it) => [
      it.id,
      i18n.language === 'en' ? it.name_en : it.name_th,
    ]),
  );
  const promptMap = new Map(
    (promptsQuery.data ?? []).map((p) => [p.id, i18n.language === 'en' ? p.text_en : p.text_th]),
  );

  const swipeMut = useMutation({
    mutationFn: async (input: { candidate: DropCandidate; direction: SwipeDirection }) => {
      const res = await api.swipe({
        candidateId: input.candidate.candidate_id,
        mode,
        direction: input.direction,
      });
      return { res, candidate: input.candidate, direction: input.direction };
    },
    onSuccess: async ({ res, candidate, direction }) => {
      if (res.matched) {
        haptic.success();
        setMatchedCandidate(candidate);
      } else if (direction === 'like') {
        haptic.medium();
      } else {
        haptic.light();
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myDrop(mode) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myMatches }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
      ]);
    },
  });

  const candidates = dropQuery.data ?? [];
  const pendingCandidates = candidates.filter((c) => c.action === null);
  const remainingCount = pendingCandidates.length;

  // เลือกการ์ดที่จะแสดงใน Card View: ถ้าการ์ดปัจจุบัน swipe ไปแล้ว ให้กระโดดไปหาตัวที่ยังไม่ได้ swipe
  const currentCandidate =
    candidates[activeCardIndex]?.action === null
      ? candidates[activeCardIndex]
      : (pendingCandidates[0] ?? candidates[activeCardIndex] ?? candidates[0]);

  const modeOptions = PROFILE_MODES.map((m) => ({
    value: m,
    label: t(`modes.${m}`),
  }));

  const handleSwipe = (candidate: DropCandidate, direction: SwipeDirection) => {
    swipeMut.mutate({ candidate, direction });
    // เลื่อนไปการ์ดถัดไป
    const nextIdx = (activeCardIndex + 1) % Math.max(candidates.length, 1);
    setActiveCardIndex(nextIdx);
  };

  return (
    <Screen>
      {/* Header สไตล์หน้าเว็บโปรโมท */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('drop.eyebrow')}
          </AppText>
          <AppText variant="title">{t('drop.title')}</AppText>
        </View>
        <View style={styles.headerBadges}>
          <Badge label="🌙 19:00" tone="gold" />
          <Badge label={t('drop.remaining', { count: remainingCount })} tone="rose" />
        </View>
      </View>

      <AppText variant="muted">{t('drop.subtitle')}</AppText>

      {/* สวิตช์โหมด เพื่อน / เดท */}
      <SegmentedControl options={modeOptions} value={mode} onChange={setMode} />

      {/* แถบหลอดไฟความคืบหน้า 5 ใบต่อวัน (ถ้ามีคน) */}
      {candidates.length > 0 ? (
        <View style={styles.progressRow}>
          {candidates.map((c, idx) => {
            const isDone = c.action !== null;
            const isLiked = c.action === 'like';
            const isActive = currentCandidate?.candidate_id === c.candidate_id;
            return (
              <Pressable
                key={c.candidate_id}
                onPress={() => {
                  haptic.selection();
                  setActiveCardIndex(idx);
                }}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: isLiked
                      ? colors.accentSoft
                      : isDone
                        ? colors.lineStrong
                        : isActive
                          ? colors.accent
                          : colors.line,
                    opacity: isActive ? 1 : 0.65,
                    height: isActive ? 6 : 4,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}

      {swipeMut.error ? <AppText variant="error">{errorMessage(swipeMut.error)}</AppText> : null}

      {dropQuery.isPending ? (
        <Loading />
      ) : candidates.length === 0 ? (
        <EmptyState badge="19:00" title={t('drop.emptyTitle')} body={t('drop.emptyBody')} />
      ) : remainingCount === 0 && viewMode === 'card' ? (
        /* เมื่อเปิดครบทั้ง 5 ใบของวัน */
        <Card tone="rose" style={styles.allDoneCard}>
          <Text style={{ fontSize: 44, textAlign: 'center' }}>🎉</Text>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            ดูครบ 5 คนของวันนี้แล้ว!
          </AppText>
          <AppText variant="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
            การ์ดรอบใหม่จะส่งตรงถึงคุณทุกวันเวลา 19:00 น.
            ระหว่างนี้สามารถไปคุยกับเพื่อนใหม่ในห้องแชทได้เลย
          </AppText>
          <Row style={{ justifyContent: 'center', marginTop: space.sm }}>
            <Button
              variant="primary"
              label={t('drop.matchGoChat')}
              onPress={() => router.push('/(app)/(tabs)/chats')}
            />
            <Button variant="ghost" label="ดูสรุป 5 คนวันนี้" onPress={() => setViewMode('list')} />
          </Row>
        </Card>
      ) : viewMode === 'card' && currentCandidate ? (
        /* โหมดใบการ์ดเดี่ยว (Deck Experience) สวย สมูท เล่นสนุก */
        <View style={{ gap: space.md }}>
          <SingleCandidateCard
            candidate={currentCandidate}
            areaMap={areaMap}
            interestMap={interestMap}
            promptMap={promptMap}
            onOpenSafety={(target) => setSafetyTarget(target)}
            onLike={() => handleSwipe(currentCandidate, 'like')}
            onSkip={() => handleSwipe(currentCandidate, 'skip')}
            isPending={swipeMut.isPending}
          />
          {candidates.length > 1 ? (
            <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.sm }}>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  const prev = (activeCardIndex - 1 + candidates.length) % candidates.length;
                  setActiveCardIndex(prev);
                }}
              >
                <AppText variant="small" style={{ color: colors.muted }}>
                  ← ใบก่อนหน้า
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  setViewMode('list');
                }}
              >
                <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
                  ดูทั้ง 5 คน (List View)
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  const next = (activeCardIndex + 1) % candidates.length;
                  setActiveCardIndex(next);
                }}
              >
                <AppText variant="small" style={{ color: colors.muted }}>
                  ใบถัดไป →
                </AppText>
              </Pressable>
            </Row>
          ) : null}
        </View>
      ) : (
        /* โหมด List View ดูทั้ง 5 ใบ */
        <View style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="small" style={{ fontWeight: '700' }}>
              การ์ดทั้งหมด 5 ใบ
            </AppText>
            <Pressable
              onPress={() => {
                haptic.selection();
                setViewMode('card');
              }}
            >
              <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
                กลับสู่โหมดการ์ด (Deck)
              </AppText>
            </Pressable>
          </Row>
          {candidates.map((c) => (
            <SingleCandidateCard
              key={c.candidate_id}
              candidate={c}
              areaMap={areaMap}
              interestMap={interestMap}
              promptMap={promptMap}
              onOpenSafety={(target) => setSafetyTarget(target)}
              onLike={() => handleSwipe(c, 'like')}
              onSkip={() => handleSwipe(c, 'skip')}
              isPending={swipeMut.isPending}
            />
          ))}
        </View>
      )}

      {/* Modal แจ้งเตือนเมื่อเกิด Match ใหม่ — ปาร์ตี้ สนุก มีชีวิตชีวา */}
      <ModalSheet
        visible={matchedCandidate !== null}
        title="✨ It's a Match! ✨"
        onClose={() => setMatchedCandidate(null)}
      >
        <Card tone="rose" style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Text style={{ fontSize: 50 }}>🥳</Text>
          <AppText variant="heading" style={{ textAlign: 'center', marginTop: space.sm }}>
            {matchedCandidate
              ? t('drop.matchModalTitle', { name: matchedCandidate.display_name })
              : ''}
          </AppText>
          <Badge label="⏳ ตอบกลับภายใน 48 ชั่วโมง" tone="ink" />
          <AppText
            variant="body"
            style={{ textAlign: 'center', maxWidth: 320, marginTop: space.xs }}
          >
            {t('drop.matchModalBody')}
          </AppText>
        </Card>
        <Button
          variant="primary"
          label={t('drop.matchGoChat')}
          onPress={() => {
            setMatchedCandidate(null);
            router.push('/(app)/(tabs)/chats');
          }}
        />
      </ModalSheet>

      <SafetySheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />
    </Screen>
  );
}

function SingleCandidateCard({
  candidate: c,
  areaMap,
  interestMap,
  promptMap,
  onOpenSafety,
  onLike,
  onSkip,
  isPending,
}: {
  candidate: DropCandidate;
  areaMap: Map<string, string>;
  interestMap: Map<string, string>;
  promptMap: Map<string, string>;
  onOpenSafety: (target: SafetyTarget) => void;
  onLike: () => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const areaLabel = c.area_id ? (areaMap.get(c.area_id) ?? c.area_id) : null;
  const subtitleParts = [c.occupation, areaLabel].filter(Boolean);

  return (
    <Card style={styles.dropCard}>
      {/* กล่องรูปที่ยังล็อกอยู่ (Stage 0) เหมือนใน Phones ของเว็บโปรโมท */}
      <View style={[styles.lockedBox, { backgroundColor: colors.accentTint }]}>
        <View style={styles.fanRow}>
          <View
            style={[
              styles.fanCard,
              styles.fanLeft,
              { backgroundColor: colors.lilacTint, borderColor: colors.card },
            ]}
          />
          <View
            style={[styles.fanCard, { backgroundColor: colors.card, borderColor: colors.line }]}
          />
          <View
            style={[
              styles.fanCard,
              styles.fanRight,
              { backgroundColor: colors.sageTint, borderColor: colors.card },
            ]}
          />
        </View>

        <View
          style={[styles.lockedPill, { backgroundColor: colors.card, borderColor: colors.line }]}
        >
          <Text style={[styles.lockedPillText, { color: colors.text }]}>
            {t('drop.lockedBadge')}
          </Text>
        </View>
        <AppText variant="small" style={{ textAlign: 'center', paddingHorizontal: 16 }}>
          {t('drop.lockedSub')}
        </AppText>
      </View>

      {/* ข้อมูลหลักของการ์ด */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Row>
            <AppText variant="heading">
              {c.display_name}
              {c.age !== null ? `, ${c.age}` : ''}
            </AppText>
            {c.org_badge ? <Badge label={c.org_badge} tone="sage" /> : null}
          </Row>
          {subtitleParts.length > 0 ? (
            <AppText variant="muted">{subtitleParts.join(' · ')}</AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('safety.sheetTitle')}
          onPress={() =>
            onOpenSafety({
              targetType: 'profile',
              targetId: c.candidate_id,
              label: c.display_name,
            })
          }
          style={[styles.moreBtn, { borderColor: colors.line }]}
        >
          <Text style={{ color: colors.muted, fontWeight: '700' }}>⋯</Text>
        </Pressable>
      </View>

      {c.bio ? <AppText variant="body">{c.bio}</AppText> : null}

      {/* ความสนใจ */}
      {c.interests.length > 0 ? (
        <View style={styles.sectionBlock}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            {t('drop.interestsLabel')}
          </AppText>
          <Row>
            {c.interests.map((id) => (
              <Badge key={id} label={interestMap.get(id) ?? id} tone="lilac" />
            ))}
          </Row>
        </View>
      ) : null}

      {/* คำถามเปิดบทสนทนา (กรอบคำพูดทรง Soft Bubble เหมือนหน้าเว็บ) */}
      {c.prompts.length > 0 ? (
        <View style={styles.sectionBlock}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            {t('drop.promptsLabel')}
          </AppText>
          {c.prompts.map((pr) => (
            <View
              key={pr.prompt_id}
              style={[
                styles.promptBubble,
                { backgroundColor: colors.background, borderColor: colors.line },
              ]}
            >
              <AppText variant="small" style={{ fontWeight: '700', color: colors.accent }}>
                {promptMap.get(pr.prompt_id) ?? pr.prompt_id}
              </AppText>
              <AppText variant="body">{pr.answer}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      {/* ปุ่มปัด ข้าม / สนใจ — ขยายใหญ่ สัมผัสเด้งดึ๋ง สบายมือ */}
      {c.action === null ? (
        <View style={styles.actionRow}>
          <BouncyPressable
            accessibilityRole="button"
            accessibilityLabel={t('drop.skip')}
            disabled={isPending}
            hapticFeedback="heavy"
            activeScale={0.92}
            onPress={onSkip}
            style={[styles.skipCircle, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.muted }}>✕</Text>
          </BouncyPressable>

          <BouncyPressable
            accessibilityRole="button"
            accessibilityLabel={t('drop.like')}
            disabled={isPending}
            hapticFeedback="medium"
            activeScale={0.95}
            onPress={onLike}
            style={[
              styles.likePill,
              {
                backgroundColor: colors.accentSoft,
                shadowColor: colors.accentSoft,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: palette.ink }}>
              ♥ {t('drop.like')}
            </Text>
          </BouncyPressable>
        </View>
      ) : (
        <Row style={{ justifyContent: 'center', paddingVertical: space.xs }}>
          <Badge
            label={c.action === 'like' ? t('drop.likedBadge') : t('drop.passedBadge')}
            tone={c.action === 'like' ? 'rose' : 'muted'}
          />
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  progressBar: {
    flex: 1,
    borderRadius: radius.pill,
  },
  allDoneCard: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    gap: space.md,
  },
  dropCard: {
    gap: space.md,
    padding: space.lg,
  },
  lockedBox: {
    minHeight: 180,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.sm,
  },
  fanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fanCard: {
    width: 60,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  fanLeft: {
    transform: [{ rotate: '-12deg' }, { translateX: 8 }],
  },
  fanRight: {
    transform: [{ rotate: '12deg' }, { translateX: -8 }],
  },
  lockedPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  lockedPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {
    gap: space.xs,
  },
  promptBubble: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    marginTop: space.xs,
  },
  skipCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likePill: {
    flex: 1,
    maxWidth: 220,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
