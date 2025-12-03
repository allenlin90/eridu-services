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
      '**/$*.tsx', // TanStack Router dynamic routes ($showId.tsx)
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
        },
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
    // JSON files: ignore filename case for Paraglide required formats
    files: ['**/*.json'],
    rules: {
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: ['zh-TW.json'], // Paraglide requires zh-TW.json format
        },
      ],
    },
  },
);
