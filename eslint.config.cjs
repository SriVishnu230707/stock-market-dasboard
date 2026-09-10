const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");

module.exports = [
  js.configs.recommended,
  {
    // Backend: CommonJS, Node globals.
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Frontend: ES modules, JSX, browser globals. eslint-plugin-react's
    // jsx-uses-vars/jsx-uses-react rules teach the base no-unused-vars rule
    // that `<Foo />` counts as using the `Foo` import — without this, every
    // component import looks "unused" even though it's used in JSX.
    files: ["client/src/**/*.{js,jsx}"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/prop-types": "off", // no PropTypes in this project by design
      "react/react-in-jsx-scope": "off", // Vite's automatic JSX runtime doesn't need it
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  },
];
