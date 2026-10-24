import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // ให้แอปใช้ supabase-js / react-query ตัวเดียวกับของตัวเอง
  external: ['@supabase/supabase-js', '@tanstack/react-query'],
});
