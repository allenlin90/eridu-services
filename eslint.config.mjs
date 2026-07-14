import createConfig from "./packages/eslint-config/create-config.js";

export default createConfig(
  {
    type: "app",
    markdown: true,
  },
  {
    ignores: [
      "**/*.md/*", // Ignore code blocks inside markdown files
    ],
  },
  {
    files: ["**/*.md"],
    rules: {
      "unicorn/filename-case": "off",
    },
  }
);
