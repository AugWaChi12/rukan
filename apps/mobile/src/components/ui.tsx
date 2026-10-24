/**
 * UI พื้นฐานของแอป (Soft Bubble) — ทุกหน้าจอประกอบจากชิ้นพวกนี้ สีมาจาก theme เสมอ
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useAppTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'error';

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

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const { colors } = useAppTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: colors.primary }
          : { borderColor: colors.line, borderWidth: 1, backgroundColor: colors.card },
        { opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onPrimary : colors.text} />
      ) : (
        <Text style={[styles.buttonLabel, { color: primary ? colors.onPrimary : colors.text }]}>
          {label}
        </Text>
      )}
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
      <AppText variant="small">{label}</AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        accessibilityLabel={label}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.card, borderColor: colors.line },
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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accentTint : colors.card,
          borderColor: selected ? colors.accent : colors.line,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.accent : colors.text,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      {children}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Loading() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  muted: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 14, lineHeight: 20 },
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    padding: space.xl,
    gap: space.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  field: { gap: space.xs },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    fontSize: 16,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
