import base from '@stumatch/eslint-config/base';
import globals from 'globals';

export default [
  ...base,
  { ignores: ['src/generated/**'] },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
];
