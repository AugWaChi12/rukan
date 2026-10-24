import { queryKeys } from '@rukan/api';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { queryClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface SessionContextValue {
  session: Session | null;
  /** true ระหว่างอ่าน session ที่เก็บไว้ในเครื่องตอนเปิดแอป */
  initializing: boolean;
}

const SessionContext = createContext<SessionContextValue>({ session: null, initializing: true });

/**
 * ติดตาม session ของ Supabase Auth
 * ใช้ตัดสินแค่ว่า "จะพาไปหน้าไหน" — สิทธิ์จริงเช็คที่ server ทุกครั้ง (RLS + RPC)
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionContextValue>({ session: null, initializing: true });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, initializing: false });
    });
    let currentUserId: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, initializing: false });
      // ล้างข้อมูลของคนก่อนออกจาก cache เฉพาะตอน "เปลี่ยนคน" (login / logout / สลับบัญชี)
      // — บนเว็บ Supabase ส่ง SIGNED_IN ซ้ำทุกครั้งที่กลับมาที่แท็บ ถ้าล้างทุกครั้งแอปจะโหลดวนไม่จบ
      const userId = session?.user.id ?? null;
      if (currentUserId !== undefined && userId !== currentUserId) {
        queryClient.removeQueries({ queryKey: queryKeys.me });
      }
      currentUserId = userId;
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
