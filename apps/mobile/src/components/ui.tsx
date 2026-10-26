/**
 * UI พื้นฐานของแอป (Soft Bubble) — เข้าชุดกับเว็บโปรโมท (apps/web/src/components/landing/)
 * ปรับแต่ง micro-interactions, responsive sizing, bouncy tactile press, และ haptic feedback
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { palette, radius, space } from '@/theme/tokens';

const GRID_SIZE = 56;

/** พื้นตารางบางๆ แบบเดียวกับเว็บ rukan.app (.bg-grid ใน apps/web/src/app/globals.css) */
export function GridBackground() {
  const { name } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const color = name === 'gold' ? 'rgba(242, 234, 219, 0.045)' : '#efeaee';
  const cols = Math.ceil(width / GRID_SIZE);
  const rows = Math.ceil(height / GRID_SIZE);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: cols }, (_, i) => (
        <View
          key={`c${i}`}
          style={[styles.gridLineV, { left: i * GRID_SIZE, backgroundColor: color }]}
        />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={`r${i}`}
          style={[styles.gridLineH, { top: i * GRID_SIZE, backgroundColor: color }]}
        />
      ))}
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  grid = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** พื้นตารางบางๆ ด้านหลัง (ค่าเริ่มต้น: เปิด) */
  grid?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const content = (
    <View style={[styles.content, !scroll ? styles.contentFixedBottom : null, style]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {grid ? <GridBackground /> : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'muted' | 'small' | 'error';

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const { colors } = useAppTheme();
  const color =
    variant === 'muted' || variant === 'small'
      ? colors.muted
      : variant === 'error'
        ? colors.danger
        : colors.text;
  return <Text {...props} style={[textStyles[variant], { color }, style]} />;
}

export type ButtonVariant = 'primary' | 'rose' | 'lilac' | 'sage' | 'ghost' | 'danger';

/**
 * ปุ่มกดที่มี haptic feedback และ tactile bounce scale
 */
export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.16,
          shadowRadius: 6,
          elevation: 2,
        }
      : variant === 'rose'
        ? {
            backgroundColor: colors.accentSoft,
            shadowColor: colors.accentSoft,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.22,
            shadowRadius: 6,
            elevation: 2,
          }
        : variant === 'lilac'
          ? { backgroundColor: colors.lilacTint, borderColor: colors.lilac, borderWidth: 1 }
          : variant === 'sage'
            ? { backgroundColor: colors.sageTint, borderColor: colors.sage, borderWidth: 1 }
            : variant === 'danger'
              ? { backgroundColor: colors.accentTint, borderColor: colors.danger, borderWidth: 1 }
              : { borderColor: colors.line, borderWidth: 1, backgroundColor: colors.card };

  const textColor =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'rose'
        ? palette.ink
        : variant === 'lilac'
          ? colors.lilacDeep
          : variant === 'sage'
            ? colors.sageDeep
            : variant === 'danger'
              ? colors.danger
              : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (!inactive) {
          if (variant === 'primary' || variant === 'rose') {
            haptic.medium();
          } else {
            haptic.light();
          }
          onPress();
        }
      }}
      style={({ pressed }) => [
        size === 'sm' ? styles.buttonSm : styles.button,
        variantStyle,
        {
          opacity: inactive ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !inactive ? 0.96 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[size === 'sm' ? styles.buttonLabelSm : styles.buttonLabel, { color: textColor }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Pressable ที่มีสปริงสเกลและสัมผัส haptic สำหรับคอมโพเนนต์คัสตอม
 */
export function BouncyPressable({
  children,
  onPress,
  style,
  disabled,
  hapticFeedback = 'light',
  activeScale = 0.96,
  ...props
}: PressableProps & {
  children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  hapticFeedback?: 'selection' | 'light' | 'medium' | 'heavy' | 'none';
  activeScale?: number;
}) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={(e) => {
        if (!disabled && hapticFeedback !== 'none') {
          if (hapticFeedback === 'selection') haptic.selection();
          else if (hapticFeedback === 'medium') haptic.medium();
          else if (hapticFeedback === 'heavy') haptic.heavy();
          else haptic.light();
        }
        onPress?.(e);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        {
          transform: [{ scale: state.pressed && !disabled ? activeScale : 1 }],
          opacity: state.pressed && !disabled ? 0.88 : 1,
        },
      ]}
    >
      {typeof children === 'function' ? children(props as any) : children}
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <AppText variant="small" style={{ fontWeight: '600' }}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        accessibilityLabel={label}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.card, borderColor: colors.line },
          props.multiline ? styles.inputMultiline : null,
        ]}
      />
      {hint ? <AppText variant="small">{hint}</AppText> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = 'rose',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'rose' | 'lilac' | 'sage';
}) {
  const { colors } = useAppTheme();
  const activeBg =
    tone === 'lilac' ? colors.lilacTint : tone === 'sage' ? colors.sageTint : colors.accentTint;
  const activeBorder =
    tone === 'lilac' ? colors.lilac : tone === 'sage' ? colors.sage : colors.accent;
  const activeText =
    tone === 'lilac' ? colors.lilacDeep : tone === 'sage' ? colors.sageDeep : colors.accent;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? activeBg : colors.card,
          borderColor: selected ? activeBorder : colors.line,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? activeText : colors.text,
          fontWeight: selected ? '700' : '500',
          fontSize: 13.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'cream' | 'rose' | 'lilac' | 'sage' | 'night';
}) {
  const { colors } = useAppTheme();
  const bg =
    tone === 'cream'
      ? colors.background
      : tone === 'rose'
        ? colors.accentTint
        : tone === 'lilac'
          ? colors.lilacTint
          : tone === 'sage'
            ? colors.sageTint
            : tone === 'night'
              ? palette.nightCard
              : colors.card;
  const border =
    tone === 'rose'
      ? colors.accentSoft
      : tone === 'lilac'
        ? colors.lilac
        : tone === 'sage'
          ? colors.sage
          : tone === 'night'
            ? '#2a2724'
            : colors.line;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/** ป้ายกำกับทรงแคปซูล (Soft Bubble badge เหมือนบนเว็บโปรโมท) */
export function Badge({
  label,
  tone = 'rose',
}: {
  label: string;
  tone?: 'rose' | 'lilac' | 'sage' | 'gold' | 'ink' | 'muted';
}) {
  const { colors } = useAppTheme();
  const bg =
    tone === 'rose'
      ? colors.accentTint
      : tone === 'lilac'
        ? colors.lilacTint
        : tone === 'sage'
          ? colors.sageTint
          : tone === 'gold'
            ? colors.goldTint
            : tone === 'ink'
              ? colors.primary
              : colors.subtle;
  const fg =
    tone === 'rose'
      ? colors.accent
      : tone === 'lilac'
        ? colors.lilacDeep
        : tone === 'sage'
          ? colors.sageDeep
          : tone === 'gold'
            ? palette.ink
            : tone === 'ink'
              ? colors.onPrimary
              : colors.muted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** ปุ่มสลับแท็บทรงแคปซูล (เหมือนสวิตช์ เพื่อน / เดท บนหน้าเว็บโปรโมท) */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; badge?: number }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.segmentedWrap, { backgroundColor: colors.card, borderColor: colors.line }]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (opt.value !== value) {
                haptic.selection();
                onChange(opt.value);
              }
            }}
            style={({ pressed }) => [
              styles.segmentedTab,
              active
                ? {
                    backgroundColor: colors.accentSoft,
                    shadowColor: colors.accentSoft,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 1,
                  }
                : null,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Text
              style={[
                styles.segmentedLabel,
                { color: active ? palette.ink : colors.muted },
                active ? styles.segmentedLabelActive : null,
              ]}
            >
              {opt.label}
              {opt.badge && opt.badge > 0 ? ` (${opt.badge})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** วงกลมสีประจำนามแฝง (Space / Bubble / แชทนามแฝง) */
export function AliasAvatar({
  alias,
  color,
  size = 38,
}: {
  alias: string;
  color?: string | null;
  size?: number;
}) {
  const firstChar = Array.from(alias.trim())[0] ?? '•';
  const bg = color || palette.lilac;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: bg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      }}
    >
      <Text style={{ color: palette.ink, fontWeight: '700', fontSize: Math.round(size * 0.44) }}>
        {firstChar}
      </Text>
    </View>
  );
}

/** แถบ 3 ช่องแสดงความคืบหน้าการเปิดรูป (0/3 → 1/3 → 2/3 → 3/3) เหมือนใน Phones ของเว็บโปรโมท */
export function RevealProgressBar({
  stage,
  label,
  subLabel,
}: {
  stage: number;
  label: string;
  subLabel?: string | null;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.revealBox, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <View style={styles.revealHeader}>
        <Row style={{ gap: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 14 }}>🔓</Text>
          <AppText variant="small" style={{ fontWeight: '700', color: colors.text }}>
            {label}
          </AppText>
        </Row>
        {subLabel ? <AppText variant="small">{subLabel}</AppText> : null}
      </View>
      <View style={styles.revealBars}>
        {[1, 2, 3].map((step) => {
          const filled = stage >= step;
          const nextUp = stage + 1 === step;
          return (
            <View
              key={step}
              style={[
                styles.revealBarItem,
                {
                  backgroundColor: filled
                    ? colors.accentSoft
                    : nextUp
                      ? colors.accentTint
                      : colors.line,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/** แผง Modal ด้านล่าง (Bottom Sheet สไตล์ Soft Bubble พร้อมแถบลากจับ) */
export function ModalSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.background, borderColor: colors.line },
          ]}
        >
          {/* iOS-style grab handle */}
          <View style={[styles.modalGrabHandle, { backgroundColor: colors.lineStrong }]} />

          <View style={styles.modalHeader}>
            <AppText variant="heading" style={{ flex: 1 }}>
              {title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => {
                haptic.selection();
                onClose();
              }}
              style={({ pressed }) => [
                styles.modalCloseBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.line,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <Text style={{ color: colors.muted, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** กล่องข้อความยืนยันการทำรายการ (Confirmation Alert Popup พร้อม Haptic และดีไซน์ Glassmorphism) */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.confirmCard,
            { backgroundColor: colors.background, borderColor: colors.line },
          ]}
        >
          <View
            style={[
              styles.confirmIconWrap,
              { backgroundColor: tone === 'danger' ? '#f43f5e18' : colors.accentTint },
            ]}
          >
            <Text style={{ fontSize: 24 }}>{tone === 'danger' ? '⚠️' : '🫧'}</Text>
          </View>
          <AppText variant="subheading" style={{ textAlign: 'center', marginTop: 12 }}>
            {title}
          </AppText>
          <AppText
            variant="muted"
            style={{ textAlign: 'center', marginTop: 6, fontSize: 13, lineHeight: 18 }}
          >
            {message}
          </AppText>
          <View style={styles.confirmActions}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                size="md"
                label={cancelLabel}
                onPress={() => {
                  haptic.light();
                  onCancel();
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant={tone === 'danger' ? 'rose' : 'primary'}
                size="md"
                label={confirmLabel}
                loading={loading}
                onPress={() => {
                  haptic.heavy();
                  onConfirm();
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({
  badge,
  title,
  body,
  actionLabel,
  onAction,
}: {
  badge?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card tone="cream" style={styles.emptyCard}>
      {badge ? <Badge label={badge} tone="lilac" /> : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <Button variant="rose" label={actionLabel} onPress={onAction} />
      ) : null}
    </Card>
  );
}

export function Loading() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 18.5, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 13.5, lineHeight: 20 },
  small: { fontSize: 12.5, lineHeight: 18 },
  error: { fontSize: 13.5, lineHeight: 19 },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1 },
  scroll: { flexGrow: 1, paddingBottom: 104 },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  contentFixedBottom: {
    paddingBottom: 84,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  buttonSm: {
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  buttonLabelSm: { fontSize: 13, fontWeight: '700' },
  field: { gap: space.xs },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
    shadowColor: '#2e2238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentedTab: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  segmentedLabelActive: {
    fontWeight: '700',
  },
  revealBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 6,
  },
  revealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  revealBars: {
    flexDirection: 'row',
    gap: 6,
  },
  revealBarItem: {
    flex: 1,
    height: 7,
    borderRadius: radius.pill,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 34, 56, 0.48)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: space.xl,
    paddingTop: space.md,
    gap: space.md,
  },
  modalGrabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: space.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalBody: {
    gap: space.md,
    paddingBottom: space.xl,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    gap: space.sm,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: space.sm,
    width: '100%',
    marginTop: space.lg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
});
