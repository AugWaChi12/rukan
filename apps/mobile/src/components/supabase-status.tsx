import { SUPABASE_RPC, healthResponseSchema, type HealthResponse } from '@stumatch/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

type State =
  { kind: 'loading' } | { kind: 'ok'; health: HealthResponse } | { kind: 'error'; message: string };

/** เรียก health() ใน database ผ่าน Supabase — เช็คว่าแอปต่อ Supabase ได้ */
export function SupabaseStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    supabase.rpc(SUPABASE_RPC.health).then(({ data, error }) => {
      if (error) return setState({ kind: 'error', message: error.message });
      const parsed = healthResponseSchema.safeParse(data);
      setState(
        parsed.success
          ? { kind: 'ok', health: parsed.data }
          : { kind: 'error', message: 'รูปแบบข้อมูลจาก health() ไม่ตรงกับ schema' },
      );
    });
  }, []);

  const label =
    state.kind === 'loading'
      ? 'กำลังตรวจสอบ…'
      : state.kind === 'ok'
        ? `Supabase: ${state.health.status} · Database: ${state.health.database}`
        : `Supabase: ${state.message}`;

  const color = state.kind === 'ok' ? '#10b981' : state.kind === 'loading' ? '#a1a1aa' : '#ef4444';

  return (
    <View style={styles.row} accessibilityRole="text">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 14, color: '#71717a' },
});
