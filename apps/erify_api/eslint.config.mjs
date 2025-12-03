import createConfig from '@eridu/eslint-config/create-config';
import globals from 'globals';

/** @type {import('eslint').Linter.Config} */
export default createConfig(
  {
    type: 'app',
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Allow namespace declarations for Express types
      'ts/no-namespace': 'off',
      // Allow process.env in main.ts (needed for config)
      'node/no-process-env': [
        'error',
        { allowedVariables: ['NODE_ENV', 'PORT', 'SHUTDOWN_TIMEOUT'] },
      ],
      // Disable rules that aren't available in antfu config
      // These are defined here so eslint-disable comments don't error
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Allow unused regex capturing groups
      'regexp/no-unused-capturing-group': 'off',
      // Allow eslint-disable comments for rules that don't exist (for compatibility)
      'eslint-comments/no-unlimited-disable': 'off',
      'eslint-comments/disable-enable-pair': 'off',
    },
  },
);