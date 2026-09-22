import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules, // React 17+ automatic JSX runtime — no `import React` needed
      ...reactHooks.configs.recommended.rules
    },
    settings: { react: { version: "detect" } }
  },
  {
    ignores: ["dist/", "dev-dist/", "node_modules/"]
  }
);
