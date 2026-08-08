import createConfig from "./packages/eslint-config/create-config.js";

export default createConfig(
  {
    type: "app",
    markdown: true,
  },
  {
    ignores: [
      "**/*.md/*", // Ignore code blocks inside markdown files
      // Byte-exact mirrors of Open WebUI skill content. Formatting these would
      // rewrite the live instance's own text and reintroduce the drift the
      // mirror exists to eliminate. README.md here is repo-authored and stays linted.
      "ai/openwebui/skills/!(README).md",
      // nao reads these markdown files as its own runtime instructions (RULES.md,
      // agent/skills/*.md, at any depth). Formatting would rewrite content nao interprets
      // directly. project/README.md is repo-authored and stays linted.
      "infra/nao/project/**/*.md",
      "!infra/nao/project/README.md",
    ],
  },
  {
    files: ["**/*.md"],
    rules: {
      "unicorn/filename-case": "off",
    },
  }
);
