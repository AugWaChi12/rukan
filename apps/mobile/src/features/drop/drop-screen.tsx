import type { DeckCard, SwipeDeck, SwipeDirection } from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
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
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';

const FLING_MS = 280;
const SWIPE_DISTANCE = 110;
const SKIP_RED = '#e5566d';
const SKIP_PINK = '#f4a3b3';
const LIKE_COLORS = [palette.rose, '#f7d4e0', '#f2bdd0'];
const SKIP_COLORS = [SKIP_RED, SKIP_PINK, '#ff8da1'];
const BURST_PARTICLES = 14;

type FlingFn = (direction: SwipeDirection) => void;

interface SwipeVars {
  card: DeckCard;
  direction: SwipeDirection;
  startedAt: number;
}

export function DropScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();

  const deckQuery = useQuery(queries.myDeck());
  const areasQuery = useQuery(queries.areas());
  const interestsQuery = useQuery(queries.interests());
  const promptsQuery = useQuery(queries.prompts());
  const refetchDeck = deckQuery.refetch;

  const [busy, setBusy] = useState(false);
  const [cardNonce, setCardNonce] = useState(0);
  const [burst, setBurst] = useState<{ seed: number; direction: SwipeDirection } | null>(null);
  const [matchedCard, setMatchedCard] = useState<DeckCard | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const flingRef = useRef<FlingFn | null>(null);

  const registerFling = useCallback((fn: FlingFn | null) => {
    flingRef.current = fn;
  }, []);
  const clearBurst = useCallback(() => setBurst(null), []);

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

  const quota = deckQuery.data?.quota;
  const remaining = quota?.remaining ?? 0;
  // cache อาจยังมีการ์ดค้างเกินโควตาที่เหลือ — แสดงเท่าที่ยังปัดได้
  const visibleCards = (deckQuery.data?.cards ?? []).slice(0, remaining);
  const topCard = visibleCards[0];
  const quotaFull = quota !== undefined && quota.remaining === 0;

  const msLeft = useCountdown(quota?.resets_at);
  useEffect(() => {
    if (msLeft !== 0) return;
    void refetchDeck();
    const id = setInterval(() => void refetchDeck(), 15_000);
    return () => clearInterval(id);
  }, [msLeft, refetchDeck]);

  const swipeMut = useMutation({
    mutationFn: (v: SwipeVars) =>
      api.swipe({ candidateId: v.card.candidate_id, direction: v.direction }),
    onSuccess: (res, v) => {
      // รอให้ภาพการ์ดบินออกจบก่อนค่อยเอาออกจากกอง
      const wait = Math.max(0, FLING_MS - (Date.now() - v.startedAt));
      setTimeout(() => {
        queryClient.setQueryData<SwipeDeck>(queryKeys.myDeck, (deck) =>
          deck
            ? {
                quota: res.quota,
                cards: deck.cards.filter((c) => c.candidate_id !== v.card.candidate_id),
              }
            : deck,
        );
        setBusy(false);
        if (res.matched) {
          haptic.success();
          setMatchedCard(v.card);
          void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches });
          void queryClient.invalidateQueries({ queryKey: queryKeys.myConversations });
        }
        const left = queryClient.getQueryData<SwipeDeck>(queryKeys.myDeck)?.cards.length ?? 0;
        if (left < 3 && res.quota.remaining > left) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.myDeck });
        }
      }, wait);
    },
    onError: () => {
      setBusy(false);
      setCardNonce((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myDeck });
    },
  });

  const commit = (direction: SwipeDirection) => {
    if (!topCard || busy) return;
    setBusy(true);
    setBurst((prev) => ({ seed: (prev?.seed ?? 0) + 1, direction }));
    if (direction === 'like') haptic.medium();
    else haptic.light();
    swipeMut.mutate({ card: topCard, direction, startedAt: Date.now() });
  };

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  const stableCommit = useCallback((direction: SwipeDirection) => commitRef.current(direction), []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
            {t('drop.eyebrow')}
          </AppText>
          <AppText variant="title">{t('drop.title')}</AppText>
        </View>
        {quota ? <Badge label={t('drop.remaining', { count: remaining })} tone="rose" /> : null}
      </View>

      <AppText variant="muted">{t('drop.subtitle')}</AppText>

      {quota ? (
        <View style={{ gap: 4 }}>
          <View style={[styles.quotaTrack, { backgroundColor: colors.line }]}>
            <View
              style={[
                styles.quotaFill,
                {
                  backgroundColor: colors.accentSoft,
                  width: `${Math.min(100, (quota.used / Math.max(quota.batch_size, 1)) * 100)}%`,
                },
              ]}
            />
          </View>
          {quota.resets_at && msLeft !== null ? (
            <AppText variant="small">
              {t('drop.resetsIn', { time: formatDuration(msLeft) })}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {swipeMut.error ? <AppText variant="error">{errorMessage(swipeMut.error)}</AppText> : null}

      {deckQuery.isPending ? (
        <Loading />
      ) : deckQuery.isError ? (
        <EmptyState
          title={errorMessage(deckQuery.error)}
          body=""
          actionLabel={t('drop.refresh')}
          onAction={() => void refetchDeck()}
        />
      ) : quotaFull && quota ? (
        <Card tone="rose" style={styles.fullCard}>
          <Text style={{ fontSize: 44, textAlign: 'center' }}>🫧</Text>
          <AppText variant="heading" style={{ textAlign: 'center' }}>
            {t('drop.quotaFullTitle', { count: quota.batch_size })}
          </AppText>
          <AppText variant="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
            {t('drop.quotaFullBody', {
              count: quota.batch_size,
              time: msLeft !== null ? formatDuration(msLeft) : '—',
            })}
          </AppText>
          <Button
            variant="primary"
            label={t('drop.matchGoChat')}
            onPress={() => router.push('/(app)/(tabs)/chats')}
          />
        </Card>
      ) : !topCard ? (
        <EmptyState
          badge="Drop"
          title={t('drop.poolEmptyTitle')}
          body={t('drop.poolEmptyBody')}
          actionLabel={t('drop.refresh')}
          onAction={() => void refetchDeck()}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <View>
            <SwipeableCard
              key={`${topCard.candidate_id}-${cardNonce}`}
              disabled={busy}
              onCommit={stableCommit}
              registerFling={registerFling}
            >
              <CandidateCard
                card={topCard}
                areaMap={areaMap}
                interestMap={interestMap}
                promptMap={promptMap}
                onOpenSafety={setSafetyTarget}
              />
            </SwipeableCard>
            {burst ? (
              <BubbleBurst
                key={burst.seed}
                seed={burst.seed}
                direction={burst.direction}
                onDone={clearBurst}
              />
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <BouncyPressable
              accessibilityRole="button"
              accessibilityLabel={t('drop.skip')}
              disabled={busy}
              hapticFeedback="none"
              activeScale={0.92}
              onPress={() => flingRef.current?.('skip')}
              style={[styles.skipCircle, { borderColor: SKIP_RED, backgroundColor: colors.card }]}
            >
              <Text style={{ fontSize: 20, fontWeight: '800', color: SKIP_RED }}>✕</Text>
            </BouncyPressable>

            <BouncyPressable
              accessibilityRole="button"
              accessibilityLabel={t('drop.like')}
              disabled={busy}
              hapticFeedback="none"
              activeScale={0.95}
              onPress={() => flingRef.current?.('like')}
              style={[styles.likePill, { backgroundColor: colors.accentSoft }]}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: palette.ink }}>
                ♥ {t('drop.like')}
              </Text>
            </BouncyPressable>
          </View>
        </View>
      )}

      <ModalSheet
        visible={matchedCard !== null}
        title="✨ It's a Match! ✨"
        onClose={() => setMatchedCard(null)}
      >
        <Card tone="rose" style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Text style={{ fontSize: 50 }}>🥳</Text>
          <AppText variant="heading" style={{ textAlign: 'center', marginTop: space.sm }}>
            {matchedCard ? t('drop.matchModalTitle', { name: matchedCard.display_name }) : ''}
          </AppText>
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
            setMatchedCard(null);
            router.push('/(app)/(tabs)/chats');
          }}
        />
      </ModalSheet>

      <SafetySheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />
    </Screen>
  );
}

/** เวลาที่เหลือ (ms) จนถึง resetsAt — null เมื่อไม่มีรอบที่กำลังนับ */
function useCountdown(resetsAt: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!resetsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resetsAt]);
  if (!resetsAt) return null;
  return Math.max(0, new Date(resetsAt).getTime() - now);
}

function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** การ์ดที่ลากปัดได้: ขวา = สนใจ (ชมพูพาสเทล), ซ้าย = ข้าม (แดงชมพู) */
function SwipeableCard({
  children,
  disabled,
  onCommit,
  registerFling,
}: {
  children: ReactNode;
  disabled: boolean;
  onCommit: (direction: SwipeDirection) => void;
  registerFling: (fn: FlingFn | null) => void;
}) {
  const { width } = useWindowDimensions();
  const [pan] = useState(() => new Animated.ValueXY());
  const [fade] = useState(() => new Animated.Value(1));

  const fling = useCallback<FlingFn>(
    (direction) => {
      if (disabled) return;
      onCommit(direction);
      const toX = (direction === 'like' ? 1 : -1) * width * 0.9;
      Animated.parallel([
        Animated.timing(pan.x, {
          toValue: toX,
          duration: FLING_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(fade, { toValue: 0, duration: FLING_MS, useNativeDriver: false }),
      ]).start();
    },
    [pan, fade, disabled, onCommit, width],
  );

  useEffect(() => {
    registerFling(fling);
    return () => registerFling(null);
  }, [registerFling, fling]);

  const responder = useMemo(() => {
    const springBack = () =>
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 6,
        useNativeDriver: false,
      }).start();

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        !disabled && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => pan.setValue({ x: g.dx, y: g.dy * 0.25 }),
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_DISTANCE || g.vx > 0.9) fling('like');
        else if (g.dx < -SWIPE_DISTANCE || g.vx < -0.9) fling('skip');
        else springBack();
      },
      onPanResponderTerminate: springBack,
    });
  }, [pan, disabled, fling]);

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-14deg', '0deg', '14deg'],
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 0.55],
    extrapolate: 'clamp',
  });
  const skipOpacity = pan.x.interpolate({
    inputRange: [-120, 0],
    outputRange: [0.6, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        opacity: fade,
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
      }}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.tint, { backgroundColor: palette.rose, opacity: likeOpacity }]}
      >
        <Text style={styles.tintGlyph}>♥</Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.tint, { backgroundColor: SKIP_RED, opacity: skipOpacity }]}
      >
        <Text style={styles.tintGlyph}>✕</Text>
      </Animated.View>
    </Animated.View>
  );
}

interface Particle {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  color: string;
}

function seededRandom(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticles(seed: number, direction: SwipeDirection): Particle[] {
  const rand = seededRandom(seed);
  const sign = direction === 'like' ? 1 : -1;
  const palettes = direction === 'like' ? LIKE_COLORS : SKIP_COLORS;
  return Array.from({ length: BURST_PARTICLES }, () => {
    const angle = (rand() - 0.5) * Math.PI * 0.9;
    const distance = 120 + rand() * 200;
    return {
      dx: Math.cos(angle) * distance * sign,
      dy: Math.sin(angle) * distance - 20,
      size: 8 + rand() * 28,
      delay: 0.02 + rand() * 0.22,
      color: palettes[Math.floor(rand() * palettes.length)] ?? palettes[0]!,
    };
  });
}

/** ฟองสบู่แตกกระจายไปตามทิศทางที่ปัด */
function BubbleBurst({
  seed,
  direction,
  onDone,
}: {
  seed: number;
  direction: SwipeDirection;
  onDone: () => void;
}) {
  const [t] = useState(() => new Animated.Value(0));
  const particles = useMemo(() => makeParticles(seed, direction), [seed, direction]);

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [t, onDone]);

  return (
    <View pointerEvents="none" style={styles.burstAnchor}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: -p.size / 2,
            top: -p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            borderWidth: 1.5,
            borderColor: p.color,
            backgroundColor: `${p.color}88`,
            opacity: t.interpolate({ inputRange: [0, p.delay, 1], outputRange: [0, 1, 0] }),
            transform: [
              {
                translateX: t.interpolate({
                  inputRange: [0, p.delay, 1],
                  outputRange: [0, 0, p.dx],
                }),
              },
              {
                translateY: t.interpolate({
                  inputRange: [0, p.delay, 1],
                  outputRange: [0, 0, p.dy],
                }),
              },
              {
                scale: t.interpolate({ inputRange: [0, p.delay, 1], outputRange: [0.4, 0.6, 1.3] }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function CandidateCard({
  card: c,
  areaMap,
  interestMap,
  promptMap,
  onOpenSafety,
}: {
  card: DeckCard;
  areaMap: Map<string, string>;
  interestMap: Map<string, string>;
  promptMap: Map<string, string>;
  onOpenSafety: (target: SafetyTarget) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const areaLabel = c.area_id ? (areaMap.get(c.area_id) ?? c.area_id) : null;
  const subtitleParts = [c.occupation, areaLabel].filter(Boolean);

  return (
    <Card style={styles.dropCard}>
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
  quotaTrack: {
    height: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  quotaFill: {
    height: 5,
    borderRadius: radius.pill,
  },
  fullCard: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    gap: space.md,
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tintGlyph: {
    fontSize: 72,
    fontWeight: '800',
    color: '#ffffff',
  },
  burstAnchor: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    width: 0,
    height: 0,
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
    borderWidth: 1.5,
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
