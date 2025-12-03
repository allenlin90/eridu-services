import createConfig from '@eridu/eslint-config/create-config';

/** @type {import('eslint').Linter.Config} */
export default createConfig(
  {},
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
