import createConfig from '@eridu/eslint-config/create-config';

/** @type {import('eslint').Linter.Config} */
export default createConfig(
  {
    type: 'library',
    project: './tsconfig.json',
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);

