export * from './constants/identity';
export * from './constants/provinces';
export * from './constants/supabase';
export * from './schemas/chat';
export * from './schemas/common';
export * from './schemas/health';
export * from './schemas/matching';
export * from './schemas/profile';
export * from './schemas/safety';
export * from './schemas/space';
export * from './schemas/waitlist';
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types';

import type { Tables } from './database.types';

/** แถวของตาราง profiles (generate จาก DB ด้วย `pnpm db:types`) */
export type Profile = Tables<'profiles'>;
