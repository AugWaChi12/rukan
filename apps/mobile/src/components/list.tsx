/**
 * รายการแบบเมนู (grouped list) + หัวหน้าย่อย — ใช้ในแท็บ "ฉัน" และหน้าตั้งค่าต่างๆ
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** กลุ่มของแถว มีหัวข้อเล็กด้านบน + เส้นคั่นระหว่างแถว */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? (
        <AppText variant="small" style={[styles.groupTitle, { color: colors.muted }]}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.groupBody, { backgroundColor: colors.card, borderColor: colors.line }]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.line }]} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function ListRow({
  icon,
  tint,
  label,
  value,
  onPress,
  destructive = false,
  checked,
}: {
  icon?: IconName;
  /** สีพื้นของไอคอน — ไม่ใส่ = สีเทาอ่อน */
  tint?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  /** ใช้เป็นตัวเลือก (radio): true = ติ๊กถูก, false = ว่าง, ไม่ใส่ = แถวเมนูปกติ (มีลูกศร) */
  checked?: boolean;
}) {
  const { colors } = useAppTheme();
  const textColor = destructive ? colors.danger : colors.text;
  const isOption = checked !== undefined;

  const body = (
    <>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: tint ?? colors.subtle }]}>
          <Ionicons name={icon} size={17} color={destructive ? colors.danger : colors.text} />
        </View>
      ) : null}
      <AppText style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="muted" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {isOption ? (
        checked ? (
          <Ionicons name="checkmark" size={20} color={colors.accent} />
        ) : null
      ) : onPress && !destructive ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole={isOption ? 'radio' : 'button'}
      accessibilityState={isOption ? { checked } : undefined}
      accessibilityLabel={label}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.subtle } : null]}
    >
      {body}
    </Pressable>
  );
}

/** หัวของหน้าย่อย: ปุ่มกลับ + ชื่อหน้า */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="back"
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [
          styles.backBtn,
          { backgroundColor: colors.card, borderColor: colors.line, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <AppText style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  groupTitle: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: space.xs,
  },
  groupBody: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 56 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 54,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15.5, fontWeight: '500' },
  value: { maxWidth: '45%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { minWidth: 38, alignItems: 'flex-end' },
});
