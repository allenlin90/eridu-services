import createConfig from "@eridu/eslint-config/create-config";

export default createConfig(
  {
    react: true,
  },
  {
    plugins: {},
    rules: {
      "antfu/top-level-function": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
);
