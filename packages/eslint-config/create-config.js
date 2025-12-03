import antfu from "@antfu/eslint-config";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default function createConfig(options, ...userConfigs) {
  // Configure formatters: enable for all file types except JSON
  // JSON formatting is disabled because JSON doesn't support trailing commas,
  // and dprint/formatters may apply JavaScript-style formatting that breaks JSON syntax
  const formattersConfig = options?.formatters !== undefined 
    ? options.formatters 
    : {
        // When formatters is an object, we can selectively enable/disable formatters
        // Setting json: false disables JSON formatting while keeping others enabled
        json: false,
      };
  
  return antfu(
    {
      type: "app",
      formatters: formattersConfig === true ? true : (formattersConfig === false ? false : formattersConfig),
      typescript: true,
      stylistic: {
        indent: 2,
        semi: true,
        quotes: "single",
        arrowParens: "always", // Require parentheses for single argument arrow functions
      },
      ...(options ? { ...options, formatters: undefined } : {}),
    },
    {
      plugins: {
        "simple-import-sort": simpleImportSort,
      },
      rules: {
        "ts/consistent-type-definitions": ["error", "type"],
        "no-console": ["warn"],
        "antfu/no-top-level-await": ["off"],
        "node/prefer-global/process": ["off"],
        "node/no-process-env": ["error"],
        "perfectionist/sort-imports": "off",
        "perfectionist/sort-exports": "off",
        "simple-import-sort/imports": [
          "error",
          {
            groups: [
              // Side effect imports
              ["^\\u0000"],
              // Node.js builtins
              ["^node:"],
              // External packages
              ["^@?\\w"],
              // Internal packages (workspace packages)
              ["^@eridu/"],
              // Parent imports
              ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
              // Other relative imports
              ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
              // Style imports
              ["^.+\\.s?css$"],
            ],
          },
        ],
        "simple-import-sort/exports": "error",
        "unicorn/filename-case": [
          "error",
          {
            case: "kebabCase",
            ignore: ["README.md"],
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_",
            "caughtErrorsIgnorePattern": "^_"
          }
        ],
        // Require parentheses for single argument arrow functions
        "style/arrow-parens": ["error", "always"],
        // Enforce 1tbs brace style: } catch (err) { on same line
        "style/brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      },
    },
    {
      // JSON files: disable trailing comma rule (JSON doesn't support trailing commas)
      // Formatting is already disabled at the top level via formatters config
      files: ["**/*.json"],
      rules: {
        "style/comma-dangle": "off",
        "antfu/top-level-function": "off",
      },
    },
    ...userConfigs
  );
}
