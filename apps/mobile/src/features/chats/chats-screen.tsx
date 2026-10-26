import {
  POLITE_CLOSE_TEMPLATES,
  type ConversationListItem,
  type PoliteCloseTemplate,
} from '@rukan/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AiSparkleIcon } from '@/components/brand-icons';
import { SafetySheet, type SafetyTarget } from '@/components/safety-sheet';
import {
  AliasAvatar,
  AppText,
  Badge,
  BouncyPressable,
  Button,
  Card,
  Chip,
  EmptyState,
  Loading,
  ModalSheet,
  RevealProgressBar,
  Row,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, queries, queryClient, queryKeys } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/providers/session-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';

type SectionTab = 'chats' | 'bubbles' | 'matches';

export function ChatsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [section, setSection] = useState<SectionTab>('chats');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);

  const conversationsQuery = useQuery(queries.myConversations());
  const bubblesQuery = useQuery(queries.myBubbles());
  const matchesQuery = useQuery(queries.myMatches());

  useEffect(() => {
    if (!userId) return;
    return api.realtime.subscribeUserInbox(userId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myConversations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBubbles });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches });
    });
  }, [userId]);

  const respondBubbleMut = useMutation({
    mutationFn: (input: { bubbleId: string; accept: boolean }) => api.respondBubble(input),
    onSuccess: async (res) => {
      if (res.status === 'accepted') {
        haptic.success();
      } else {
        haptic.light();
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myBubbles }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
      ]);
      if (res.status === 'accepted' && res.conversation_id) {
        setSection('chats');
        setActiveConversationId(res.conversation_id);
      }
    },
  });

  if (activeConversationId) {
    return (
      <ChatRoomView
        conversationId={activeConversationId}
        onBack={() => setActiveConversationId(null)}
      />
    );
  }

  const conversations = conversationsQuery.data ?? [];
  const incomingBubbles = bubblesQuery.data?.incoming ?? [];
  const outgoingBubbles = bubblesQuery.data?.outgoing ?? [];
  const matches = matchesQuery.data ?? [];

  const pendingBubbleCount = incomingBubbles.filter((b) => b.status === 'pending').length;
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const sectionOptions = [
    { value: 'chats' as const, label: t('chats.sections.chats'), badge: unreadTotal },
    { value: 'bubbles' as const, label: t('chats.sections.bubbles'), badge: pendingBubbleCount },
    { value: 'matches' as const, label: t('chats.sections.matches'), badge: matches.length },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
          {t('chats.eyebrow')}
        </AppText>
        <AppText variant="title">{t('chats.title')}</AppText>
      </View>

      <SegmentedControl options={sectionOptions} value={section} onChange={setSection} />

      {/* แท็บ 1: ห้องแชททั้งหมด */}
      {section === 'chats' ? (
        conversationsQuery.isPending ? (
          <Loading />
        ) : (
          <View style={{ gap: space.md }}>
            {incomingBubbles.filter((b) => b.status === 'pending').length > 0 ? (
              <BubbleTray
                bubbles={incomingBubbles}
                onSelect={() => {
                  haptic.selection();
                  setSection('bubbles');
                }}
              />
            ) : null}

            {conversations.length === 0 ? (
              <EmptyState
                badge="Chat"
                title={t('chats.emptyChatsTitle')}
                body={t('chats.emptyChatsBody')}
              />
            ) : (
              conversations.map((conv) => (
                <ConversationRowCard
                  key={conv.id}
                  item={conv}
                  onOpen={() => {
                    haptic.selection();
                    setActiveConversationId(conv.id);
                  }}
                />
              ))
            )}
          </View>
        )
      ) : null}

      {/* แท็บ 2: Bubble ที่ทักมา / ส่งไป */}
      {section === 'bubbles' ? (
        bubblesQuery.isPending ? (
          <Loading />
        ) : incomingBubbles.length === 0 && outgoingBubbles.length === 0 ? (
          <EmptyState
            badge="Bubble"
            title={t('chats.emptyBubblesTitle')}
            body={t('chats.emptyBubblesBody')}
          />
        ) : (
          <View style={styles.listStack}>
            {incomingBubbles.length > 0 ? (
              <>
                <AppText variant="subheading">{t('chats.bubblesIncoming')}</AppText>
                {incomingBubbles.map((b) => (
                  <Card key={b.id} tone={b.status === 'pending' ? 'rose' : 'default'}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row>
                        <AliasAvatar
                          alias={b.sender_alias}
                          color={b.sender_alias_color}
                          size={36}
                        />
                        <View>
                          <AppText variant="heading">{b.sender_alias}</AppText>
                          <Badge
                            label={t(`chats.bubbleStatus.${b.status}`)}
                            tone={b.status === 'pending' ? 'rose' : 'muted'}
                          />
                        </View>
                      </Row>
                      <BouncyPressable
                        accessibilityRole="button"
                        hapticFeedback="selection"
                        onPress={() =>
                          setSafetyTarget({
                            targetType: 'bubble',
                            targetId: b.id,
                            label: b.sender_alias,
                          })
                        }
                        style={[styles.moreBtn, { borderColor: colors.line }]}
                      >
                        <Text style={{ color: colors.muted, fontWeight: '700' }}>⋯</Text>
                      </BouncyPressable>
                    </Row>

                    <AppText variant="body">{b.message}</AppText>

                    {b.status === 'pending' ? (
                      <Row style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          label={t('chats.bubbleDecline')}
                          disabled={respondBubbleMut.isPending}
                          onPress={() => respondBubbleMut.mutate({ bubbleId: b.id, accept: false })}
                        />
                        <Button
                          size="sm"
                          variant="rose"
                          label={t('chats.bubbleAccept')}
                          loading={respondBubbleMut.isPending}
                          onPress={() => respondBubbleMut.mutate({ bubbleId: b.id, accept: true })}
                        />
                      </Row>
                    ) : null}
                  </Card>
                ))}
              </>
            ) : null}

            {outgoingBubbles.length > 0 ? (
              <>
                <AppText variant="subheading" style={{ marginTop: space.sm }}>
                  {t('chats.bubblesOutgoing')}
                </AppText>
                {outgoingBubbles.map((b) => (
                  <Card key={b.id} tone="cream">
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Badge
                        label={t(`chats.bubbleStatus.${b.status}`)}
                        tone={b.status === 'accepted' ? 'sage' : 'muted'}
                      />
                      <AppText variant="small">
                        {new Date(b.created_at).toLocaleDateString()}
                      </AppText>
                    </Row>
                    <AppText variant="body">{b.message}</AppText>
                  </Card>
                ))}
              </>
            ) : null}
          </View>
        )
      ) : null}

      {/* แท็บ 3: รายการ Match */}
      {section === 'matches' ? (
        matchesQuery.isPending ? (
          <Loading />
        ) : matches.length === 0 ? (
          <EmptyState
            badge="Match"
            title={t('chats.emptyMatchesTitle')}
            body={t('chats.emptyMatchesBody')}
          />
        ) : (
          <View style={styles.listStack}>
            <AppText variant="small">{t('chats.matchesHint')}</AppText>
            {matches.map((m) => (
              <Card key={m.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Row>
                      <AppText variant="heading">
                        {m.peer.display_name}
                        {m.peer.age !== null ? `, ${m.peer.age}` : ''}
                      </AppText>
                      <Badge label={t(`modes.${m.mode}`)} tone="rose" />
                    </Row>
                    {m.peer.occupation ? (
                      <AppText variant="muted">{m.peer.occupation}</AppText>
                    ) : null}
                  </View>
                  <Badge
                    label={t('chats.room.revealProgress', { stage: m.reveal_stage })}
                    tone="lilac"
                  />
                </Row>

                <Row style={{ justifyContent: 'space-between' }}>
                  <Badge
                    label={m.expires_at ? t('chats.expiresSoon') : t('chats.activeChat')}
                    tone={m.expires_at ? 'gold' : 'sage'}
                  />
                  {m.conversation_id ? (
                    <Button
                      size="sm"
                      variant="rose"
                      label={t('drop.matchGoChat')}
                      onPress={() => {
                        haptic.selection();
                        setActiveConversationId(m.conversation_id);
                      }}
                    />
                  ) : null}
                </Row>
              </Card>
            ))}
          </View>
        )
      ) : null}

      <SafetySheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />
    </Screen>
  );
}

function BubbleTray({
  bubbles,
  onSelect,
}: {
  bubbles: {
    id: string;
    sender_alias: string;
    sender_alias_color: string;
    status: string;
    message: string;
  }[];
  onSelect: () => void;
}) {
  const { colors } = useAppTheme();
  const pending = bubbles.filter((b) => b.status === 'pending');
  if (pending.length === 0) return null;

  return (
    <View style={styles.bubbleTrayContainer}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <Row style={{ gap: 6 }}>
          <Text style={{ fontSize: 13 }}>💬</Text>
          <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
            ฟองข้อความรอตอบ ({pending.length})
          </AppText>
        </Row>
        <AppText variant="small" style={{ color: colors.accent, fontWeight: '700' }}>
          ดูทั้งหมด →
        </AppText>
      </Row>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 2 }}
      >
        {pending.map((b) => (
          <BouncyPressable
            key={b.id}
            accessibilityRole="button"
            hapticFeedback="selection"
            onPress={onSelect}
            style={styles.bubbleTrayItem}
          >
            <View
              style={[
                styles.bubbleTrayRing,
                { borderColor: colors.accent, backgroundColor: colors.accentTint },
              ]}
            >
              <AliasAvatar alias={b.sender_alias} color={b.sender_alias_color} size={48} />
              <View style={[styles.bubbleTrayBadge, { backgroundColor: colors.accent }]}>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '800' }}>NEW</Text>
              </View>
            </View>
            <AppText
              variant="small"
              numberOfLines={1}
              style={{
                maxWidth: 62,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              {b.sender_alias}
            </AppText>
          </BouncyPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ConversationRowCard({ item, onOpen }: { item: ConversationListItem; onOpen: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const title = item.is_anonymous ? item.peer.alias : (item.peer.display_name ?? item.peer.alias);
  const time = item.last_message_at
    ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <BouncyPressable
      accessibilityRole="button"
      hapticFeedback="selection"
      activeScale={0.98}
      onPress={onOpen}
      style={[
        styles.cleanRowCard,
        {
          backgroundColor: colors.card,
          borderColor: item.unread_count > 0 ? colors.accentSoft : colors.line,
        },
      ]}
    >
      <View style={{ position: 'relative' }}>
        <AliasAvatar alias={title} color={item.peer.alias_color} size={50} />
        {item.unread_count > 0 ? (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Row style={{ gap: 6, flex: 1 }}>
            <AppText
              variant="subheading"
              numberOfLines={1}
              style={{
                fontWeight: item.unread_count > 0 ? '800' : '600',
                maxWidth: 160,
                fontSize: 15,
              }}
            >
              {title}
            </AppText>
            <Badge
              label={item.is_anonymous ? t('chats.anonBadge') : t('chats.matchBadge')}
              tone={item.is_anonymous ? 'lilac' : 'sage'}
            />
          </Row>
          {time ? (
            <AppText variant="muted" style={{ fontSize: 11 }}>
              {time}
            </AppText>
          ) : null}
        </Row>

        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText
            variant="muted"
            numberOfLines={1}
            style={{
              flex: 1,
              color: item.unread_count > 0 ? colors.text : colors.muted,
              fontWeight: item.unread_count > 0 ? '600' : '400',
              fontSize: 13,
            }}
          >
            {item.last_message_preview ?? 'เริ่มบทสนทนา...'}
          </AppText>
          <Row style={{ gap: 6, marginLeft: 8 }}>
            <Badge
              label={`เลเวล ${item.reveal_stage}/3`}
              tone={item.reveal_stage > 0 ? 'rose' : 'muted'}
            />
            {item.unread_count > 0 ? (
              <View style={[styles.unreadPill, { backgroundColor: colors.accent }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                  {item.unread_count}
                </Text>
              </View>
            ) : null}
          </Row>
        </Row>
      </View>
    </BouncyPressable>
  );
}

const ICEBREAKERS = [
  '👋 ทักทายครับ ยินดีที่ได้รู้จัก!',
  '🎵 ช่วงนี้ฟังเพลงแนวไหนบ่อยสุด?',
  '☕ ชอบกินกาแฟหรือชานมมากกว่ากัน?',
  '✨ วันนี้เหนื่อยไหม พักผ่อนเยอะๆ นะ',
];

function ChatRoomView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [text, setText] = useState('');
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const [showProfileUserId, setShowProfileUserId] = useState<string | null>(null);
  const [showPoliteClose, setShowPoliteClose] = useState(false);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const detailQuery = useQuery(queries.conversation(conversationId));
  const messagesQuery = useQuery(queries.messages(conversationId));
  const subQuery = useQuery(queries.mySubscription());
  const isVip = subQuery.data?.limits.allow_ai_assistant ?? false;
  const aiCoinCost = subQuery.data?.limits.ai_coin_cost_per_use ?? 30;

  const aiMut = useMutation({
    mutationFn: () => {
      const lastPeer = (messagesQuery.data ?? []).find((m) => !m.is_mine && m.kind === 'text');
      return api.useAiWingman({
        contextType: 'chat',
        contextText: lastPeer?.body ?? detailQuery.data?.peer.alias ?? '',
      });
    },
    onSuccess: async (res) => {
      haptic.selection();
      setAiIdeas(res.suggestions);
      await queryClient.invalidateQueries({ queryKey: queryKeys.mySubscription });
    },
  });

  useEffect(() => {
    void api.markConversationRead(conversationId).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myConversations });
    });
  }, [conversationId]);

  useEffect(() => {
    return api.realtime.subscribeConversation(conversationId, (signal) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myConversations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches });
      if (signal.type === 'new_message') {
        void api.markConversationRead(conversationId);
      }
    });
  }, [conversationId]);

  const sendMut = useMutation({
    mutationFn: (customText?: string) =>
      api.sendMessage({ conversationId, body: customText ?? text }),
    onSuccess: async () => {
      haptic.medium();
      setText('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myMatches }),
      ]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    },
  });

  const revealMut = useMutation({
    mutationFn: () => api.requestReveal(conversationId),
    onSuccess: async () => {
      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myMatches }),
      ]);
    },
  });

  const unlockPhotosMut = useMutation({
    mutationFn: () => api.requestPhotoUnlock(conversationId),
    onSuccess: async () => {
      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
      ]);
    },
  });

  if (detailQuery.isPending) return <Loading />;

  const detail = detailQuery.data;
  if (!detail) {
    return (
      <Screen>
        <Button variant="ghost" label={t('chats.room.back')} onPress={onBack} />
      </Screen>
    );
  }

  const peerTitle = detail.is_anonymous
    ? detail.peer.alias
    : (detail.peer.display_name ?? detail.peer.alias);

  const revealSubLabel = detail.is_anonymous
    ? t('chats.room.revealAnonHint')
    : detail.reveal_stage >= 3
      ? t('chats.room.revealDone')
      : t('chats.room.revealNext', {
          myNeed: detail.my_messages_needed_for_next_stage ?? 0,
          peerNeed: detail.peer_messages_needed_for_next_stage ?? 0,
        });

  const chronologicalMessages = [...(messagesQuery.data ?? [])].reverse();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Screen scroll={false} style={{ paddingHorizontal: space.md, gap: space.xs }}>
        {/* Top Bar ติดแน่นด้านบน */}
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <BouncyPressable hapticFeedback="selection" onPress={onBack} style={styles.backBtn}>
            <AppText variant="subheading">{t('chats.room.back')}</AppText>
          </BouncyPressable>
          <Row>
            {detail.match_id && !detail.closed_at ? (
              <Button
                size="sm"
                variant="ghost"
                label={t('chats.room.politeCloseBtn')}
                onPress={() => setShowPoliteClose(true)}
              />
            ) : null}
            <BouncyPressable
              accessibilityRole="button"
              hapticFeedback="selection"
              onPress={() =>
                setSafetyTarget({
                  targetType: 'conversation',
                  reportTargetType: detail.peer.user_id ? 'profile' : undefined,
                  targetId: detail.peer.user_id ?? detail.id,
                  label: peerTitle,
                })
              }
              style={[styles.moreBtn, { borderColor: colors.line }]}
            >
              <Text style={{ color: colors.muted, fontWeight: '700' }}>⋯</Text>
            </BouncyPressable>
          </Row>
        </Row>

        {/* Peer Header & Reveal Bar */}
        <Card style={{ padding: space.sm, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <AliasAvatar alias={peerTitle} color={detail.peer.alias_color} size={36} />
              <View>
                <AppText variant="subheading">{peerTitle}</AppText>
                <Badge
                  label={detail.is_anonymous ? t('chats.anonBadge') : t('chats.matchBadge')}
                  tone={detail.is_anonymous ? 'lilac' : 'sage'}
                />
              </View>
            </Row>

            {!detail.is_anonymous && detail.peer.user_id ? (
              <Button
                size="sm"
                variant="lilac"
                label={t('chats.room.viewProfileBtn', { stage: detail.reveal_stage })}
                onPress={() => setShowProfileUserId(detail.peer.user_id)}
              />
            ) : null}
          </Row>

          <RevealProgressBar
            stage={detail.reveal_stage}
            label={t('chats.room.revealProgress', { stage: detail.reveal_stage })}
            subLabel={revealSubLabel}
          />

          {detail.is_anonymous && !detail.closed_at ? (
            <View style={{ gap: 4 }}>
              {detail.peer_wants_reveal ? (
                <Badge label={t('chats.room.peerWantsReveal')} tone="rose" />
              ) : null}
              <Button
                size="sm"
                variant={detail.my_wants_reveal ? 'ghost' : 'rose'}
                disabled={detail.my_wants_reveal}
                loading={revealMut.isPending}
                label={
                  detail.my_wants_reveal
                    ? t('chats.room.requestedRevealBtn')
                    : t('chats.room.requestRevealBtn')
                }
                onPress={() => revealMut.mutate()}
              />
            </View>
          ) : !detail.is_anonymous && detail.reveal_stage < 3 && !detail.closed_at ? (
            <Button
              size="sm"
              variant={detail.my_wants_photo_unlock ? 'ghost' : 'sage'}
              disabled={detail.my_wants_photo_unlock}
              loading={unlockPhotosMut.isPending}
              label={
                detail.my_wants_photo_unlock
                  ? t('chats.room.unlockAllRequested')
                  : t('chats.room.unlockAllBtn')
              }
              onPress={() => unlockPhotosMut.mutate()}
            />
          ) : null}
        </Card>

        {/* รายการข้อความแชท เลื่อนได้อย่างอิสระ */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {chronologicalMessages.map((msg) => {
            if (msg.kind === 'system' || msg.kind === 'polite_close') {
              return (
                <Card
                  key={msg.id}
                  tone={msg.kind === 'polite_close' ? 'rose' : 'cream'}
                  style={styles.systemBubble}
                >
                  <AppText variant="small" style={{ textAlign: 'center', color: colors.text }}>
                    {msg.body}
                  </AppText>
                </Card>
              );
            }

            return (
              <View
                key={msg.id}
                style={[styles.msgRow, msg.is_mine ? styles.msgRowMine : styles.msgRowPeer]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    msg.is_mine
                      ? [styles.msgBubbleMine, { backgroundColor: colors.accentSoft }]
                      : [
                          styles.msgBubblePeer,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.line,
                            borderWidth: 1,
                          },
                        ],
                  ]}
                >
                  <Text
                    style={{
                      color: palette.ink,
                      fontSize: 15,
                      lineHeight: 21,
                    }}
                  >
                    {msg.body}
                  </Text>
                </View>
                {msg.scam_warning ? (
                  <Card tone="night" style={styles.scamBanner}>
                    <AppText variant="small" style={{ color: palette.gold }}>
                      {t('chats.room.scamWarning')}
                    </AppText>
                  </Card>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {/* Icebreaker Prompts & AI Wingman ช่วยชวนคุยต่อ */}
        {!detail.closed_at ? (
          <View style={{ gap: 6 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.icebreakersRow}
            >
              <BouncyPressable
                hapticFeedback="selection"
                disabled={aiMut.isPending}
                onPress={() => aiMut.mutate()}
                style={[
                  styles.icebreakerChip,
                  {
                    backgroundColor: colors.accentTint,
                    borderColor: colors.accentSoft,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
              >
                <AiSparkleIcon size={15} />
                <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '700' }}>
                  {isVip
                    ? t('chats.room.aiChatFreeBtn')
                    : t('chats.room.aiChatCoinBtn', { coins: aiCoinCost })}
                </Text>
              </BouncyPressable>
              {(aiIdeas.length > 0
                ? aiIdeas
                : chronologicalMessages.length < 4
                  ? ICEBREAKERS
                  : []
              ).map((prompt) => (
                <BouncyPressable
                  key={prompt}
                  hapticFeedback="light"
                  onPress={() => {
                    if (aiIdeas.length > 0) {
                      setText(prompt);
                    } else {
                      sendMut.mutate(prompt);
                    }
                  }}
                  style={[
                    styles.icebreakerChip,
                    { backgroundColor: colors.card, borderColor: colors.line },
                  ]}
                >
                  <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
                    {prompt}
                  </Text>
                </BouncyPressable>
              ))}
            </ScrollView>
            {aiMut.error ? <AppText variant="error">{errorMessage(aiMut.error)}</AppText> : null}
          </View>
        ) : null}

        {/* แถบพิมพ์ข้อความสไตล์ Compact ปักด้านล่าง */}
        {detail.closed_at ? (
          <Card tone="cream" style={{ marginBottom: space.sm }}>
            <AppText variant="muted" style={{ textAlign: 'center' }}>
              {t('chats.room.closedBanner')}
            </AppText>
          </Card>
        ) : (
          <View
            style={[styles.composerBar, { backgroundColor: colors.card, borderColor: colors.line }]}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('chats.room.inputPlaceholder')}
              placeholderTextColor={colors.muted}
              maxLength={1000}
              style={[styles.composerInput, { color: colors.text }]}
              multiline
            />
            <BouncyPressable
              disabled={text.trim().length === 0 || sendMut.isPending}
              hapticFeedback="medium"
              onPress={() => sendMut.mutate()}
              style={[
                styles.sendBtnCircle,
                {
                  backgroundColor: text.trim().length === 0 ? colors.line : colors.primary,
                  opacity: text.trim().length === 0 ? 0.4 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 16 }}>↑</Text>
            </BouncyPressable>
          </View>
        )}

        {/* Modal ดูการ์ดโปรไฟล์และรูปที่ปลดล็อกตาม reveal_stage */}
        <ProfileCardSheet userId={showProfileUserId} onClose={() => setShowProfileUserId(null)} />

        {/* Modal จบอย่างสุภาพ (Polite Close) หรือ Unmatch */}
        <PoliteCloseSheet
          visible={showPoliteClose}
          matchId={detail.match_id}
          conversationId={conversationId}
          onClose={() => setShowPoliteClose(false)}
        />

        <SafetySheet
          target={safetyTarget}
          onClose={() => setSafetyTarget(null)}
          onBlocked={onBack}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ProfileCardSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();

  const cardQuery = useQuery({
    ...queries.profileCard(userId ?? '00000000-0000-4000-8000-000000000000'),
    enabled: userId !== null,
  });
  const interestsQuery = useQuery(queries.interests());
  const promptsQuery = useQuery(queries.prompts());

  const interestMap = new Map(
    (interestsQuery.data ?? []).map((it) => [
      it.id,
      i18n.language === 'en' ? it.name_en : it.name_th,
    ]),
  );
  const promptMap = new Map(
    (promptsQuery.data ?? []).map((p) => [p.id, i18n.language === 'en' ? p.text_en : p.text_th]),
  );

  const card = cardQuery.data;

  return (
    <ModalSheet
      visible={userId !== null}
      title={card ? t('chats.profileCard.title', { name: card.display_name }) : ''}
      onClose={onClose}
    >
      {cardQuery.isPending ? (
        <Loading />
      ) : card ? (
        <>
          <Badge
            label={t('chats.profileCard.stageBadge', { stage: card.reveal_stage })}
            tone="rose"
          />

          {/* รูปที่ปลดล็อกตามขั้น */}
          {card.unlocked_photo_urls.length === 0 ? (
            <Card tone="rose">
              <AppText variant="small" style={{ textAlign: 'center' }}>
                {t('chats.profileCard.noPhotosYet')}
              </AppText>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: space.sm }}>
              {card.unlocked_photo_urls.map((u, i) => (
                <Image
                  key={i}
                  source={{ uri: u }}
                  style={[styles.profilePhotoThumb, { borderColor: colors.line }]}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          )}

          <Row>
            <AppText variant="heading">{card.display_name}</AppText>
            {card.age !== null ? <AppText variant="heading">, {card.age}</AppText> : null}
            {card.org_badge ? <Badge label={card.org_badge} tone="sage" /> : null}
          </Row>

          {card.occupation ? <AppText variant="muted">{card.occupation}</AppText> : null}
          {card.bio ? <AppText variant="body">{card.bio}</AppText> : null}

          {card.interests.length > 0 ? (
            <View style={{ gap: space.xs }}>
              <AppText variant="small" style={{ fontWeight: '600' }}>
                {t('drop.interestsLabel')}
              </AppText>
              <Row>
                {card.interests.map((itId) => (
                  <Badge key={itId} label={interestMap.get(itId) ?? itId} tone="lilac" />
                ))}
              </Row>
            </View>
          ) : null}

          {card.prompts.length > 0 ? (
            <View style={{ gap: space.xs }}>
              <AppText variant="small" style={{ fontWeight: '600' }}>
                {t('drop.promptsLabel')}
              </AppText>
              {card.prompts.map((pr) => (
                <Card key={pr.prompt_id} tone="cream">
                  <AppText variant="small" style={{ fontWeight: '700', color: colors.accent }}>
                    {promptMap.get(pr.prompt_id) ?? pr.prompt_id}
                  </AppText>
                  <AppText variant="body">{pr.answer}</AppText>
                </Card>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState title={t('common.retry')} body="" />
      )}
    </ModalSheet>
  );
}

function PoliteCloseSheet({
  visible,
  matchId,
  conversationId,
  onClose,
}: {
  visible: boolean;
  matchId: string | null;
  conversationId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<PoliteCloseTemplate>('thanks');
  const [mode, setMode] = useState<'polite' | 'unmatch'>('polite');

  const closeMut = useMutation({
    mutationFn: () => {
      if (!matchId) throw new Error('no match');
      if (mode === 'polite') {
        return api.politeClose({ matchId, templateId: selectedTemplate });
      }
      return api.unmatch(matchId);
    },
    onSuccess: async () => {
      haptic.warning();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myConversations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myMatches }),
      ]);
      onClose();
    },
  });

  if (!matchId) return null;

  return (
    <ModalSheet visible={visible} title={t('chats.room.politeCloseTitle')} onClose={onClose}>
      <Card tone="rose">
        <AppText variant="body">{t('chats.room.politeCloseHint')}</AppText>
      </Card>

      <Row>
        <Chip
          label={t('chats.room.politeCloseBtn')}
          selected={mode === 'polite'}
          onPress={() => setMode('polite')}
          tone="rose"
        />
        <Chip
          label={t('chats.room.unmatchBtn')}
          selected={mode === 'unmatch'}
          onPress={() => setMode('unmatch')}
          tone="sage"
        />
      </Row>

      {mode === 'polite' ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small">{t('chats.room.politeCloseHint')}</AppText>
          {POLITE_CLOSE_TEMPLATES.map((tmpl) => (
            <BouncyPressable
              key={tmpl}
              hapticFeedback="selection"
              onPress={() => setSelectedTemplate(tmpl)}
            >
              <Card tone={selectedTemplate === tmpl ? 'rose' : 'cream'}>
                <AppText variant="body">{t(`chats.room.politeTemplates.${tmpl}`)}</AppText>
              </Card>
            </BouncyPressable>
          ))}
        </View>
      ) : null}

      {closeMut.error ? <AppText variant="error">{errorMessage(closeMut.error)}</AppText> : null}

      <Button
        variant={mode === 'unmatch' ? 'danger' : 'rose'}
        label={mode === 'polite' ? t('chats.room.politeCloseBtn') : t('chats.room.unmatchBtn')}
        loading={closeMut.isPending}
        onPress={() => closeMut.mutate()}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  listStack: { gap: space.sm },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  chatScroll: {
    flex: 1,
  },
  messagesList: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  msgRow: {
    flexDirection: 'column',
    maxWidth: '82%',
    gap: 4,
  },
  msgRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgRowPeer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: radius.lg,
    maxWidth: '100%',
  },
  msgBubbleMine: {
    borderBottomRightRadius: 4,
  },
  msgBubblePeer: {
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    padding: space.sm,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  scamBanner: {
    padding: space.xs,
    borderRadius: radius.md,
  },
  icebreakersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  icebreakerChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    marginBottom: space.xs,
  },
  composerInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    fontSize: 15,
    paddingVertical: 6,
  },
  sendBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoThumb: {
    width: 140,
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: space.sm,
  },
  bubbleTrayContainer: {
    paddingVertical: space.sm,
    marginBottom: space.xs,
  },
  bubbleTrayItem: {
    alignItems: 'center',
    gap: 4,
  },
  bubbleTrayRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubbleTrayBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  cleanRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadPill: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
});
