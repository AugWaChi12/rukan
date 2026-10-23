'use client';

import { API_ROUTES, healthResponseSchema, type HealthResponse } from '@stumatch/shared';
import { useEffect, useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api';

type State =
  { kind: 'loading' } | { kind: 'ok'; health: HealthResponse } | { kind: 'error'; message: string };

/** เรียก /health จาก browser — เช็คทั้ง API, database และ CORS ไปพร้อมกัน */
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
      ? 'bg-emerald-500'
      : state.kind === 'loading'
        ? 'bg-zinc-400'
        : 'bg-red-500';

  return (
    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400" role="status">
      <span className={`inline-block size-2.5 rounded-full ${color}`} aria-hidden />
      {label}
    </p>
  );
}
