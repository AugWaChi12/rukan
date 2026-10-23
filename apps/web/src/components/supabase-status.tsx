'use client';

import { SUPABASE_RPC, healthResponseSchema, type HealthResponse } from '@stumatch/shared';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type State =
  { kind: 'loading' } | { kind: 'ok'; health: HealthResponse } | { kind: 'error'; message: string };

/** เรียก health() ใน database ผ่าน Supabase จาก browser — เช็คว่า URL/key ถูกและ DB ใช้งานได้ */
export function SupabaseStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    createClient()
      .rpc(SUPABASE_RPC.health)
      .then(({ data, error }) => {
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

  const color =
    state.kind === 'ok'
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
