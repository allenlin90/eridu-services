import createConfig from '@eridu/eslint-config/create-config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/** @type {import('eslint').Linter.Config} */
export default createConfig(
  {
    type: 'app',
    react: true,
  },
  {
    ignores: [
      'dist',
      'eslint.config.js',
      'tailwind.config.js',
      '*.config.js',
      'README.md',
      '**/*.md',
      '**/routeTree.gen.ts',
      '**/*.gen.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/frontend/**/*'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.server.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'eslint-comments/no-unlimited-disable': 'off', // Allow in generated files
      'node/no-process-env': 'off',
    },
  },
  {
    files: ['src/frontend/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'eslint-comments/no-unlimited-disable': 'off', // Allow in generated files
    },
  },
  {
    files: ['src/env.ts'],
    rules: {
      'node/no-process-env': 'off',
    },
  },
);
