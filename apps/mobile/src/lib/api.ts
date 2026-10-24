import { createApi, createQueries, isApiError } from '@rukan/api';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/** API + query options ตัวเดียวของแอป — หน้าจอเรียกข้อมูลผ่านตรงนี้เท่านั้น (ไม่เรียก supabase ตรง) */
export const api = createApi(supabase);
export const queries = createQueries(api);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // ลองใหม่เฉพาะปัญหาเครือข่าย — error จาก server (ไม่มีสิทธิ์, ข้อมูลผิด) ลองซ้ำก็ไม่หาย
      retry: (count, error) => count < 2 && (!isApiError(error) || error.code === 'network'),
    },
    mutations: { retry: false },
  },
});
