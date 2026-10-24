// ESLint flat config กลาง — app อื่น import ไป spread ต่อ แล้วเพิ่มกฎของตัวเอง
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export const base = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.bundled_*.mjs',
      '**/tsup.config.bundled_*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);

export default base;
