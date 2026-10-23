import { API_ROUTES, healthResponseSchema, type HealthResponse } from '@stumatch/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiRequestError, apiFetch } from '@/lib/api';

type State =
  { kind: 'loading' } | { kind: 'ok'; health: HealthResponse } | { kind: 'error'; message: string };

/** เรียก /health เพื่อเช็คว่าแอปต่อ API และ database ได้ */
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    apiFetch(API_ROUTES.health, healthResponseSchema)
      .then((health) => setState({ kind: 'ok', health }))
      .catch((error: unknown) =>
        setState({
          kind: 'error',
          message:
            error instanceof ApiRequestError
              ? `${error.body.statusCode} ${error.body.message}`
              : 'ติดต่อ API ไม่ได้',
        }),
      );
  }, []);

  const label =
    state.kind === 'loading'
      ? 'กำลังตรวจสอบ…'
      : state.kind === 'ok'
        ? `API: ${state.health.status} · Database: ${state.health.database}`
        : state.message;

  const color =
    state.kind === 'ok' && state.health.status === 'ok'
      ? '#10b981'
      : state.kind === 'loading'
        ? '#a1a1aa'
        : '#ef4444';

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
