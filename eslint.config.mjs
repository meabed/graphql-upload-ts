import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/dist', '**/node_modules', '**/.vscode', '**/e2e', '**/.git'],
  },
  ...compat.extends('plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'),
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      'space-before-function-paren': 'off',
      'no-unreachable-loop': 'off',
      'no-unreachable': 'off',
      semi: 'off',
      'comma-dangle': 'off',
      'no-prototype-builtins': 0,
      'handle-callback-err': 'off',
      'node/handle-callback-err': 'off',
      'no-var': 'off',
      'array-callback-return': 'off',
      'multiline-ternary': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-spread': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
