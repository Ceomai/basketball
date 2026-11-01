// Oyun kaynakları ES modülleri (src/). Testler Node (CommonJS) ve sayfa içinde çalışan betikler.
const globals = require("globals");
const rules = {
  "no-undef": "error",
  "no-redeclare": "error",
  "no-dupe-keys": "error",
  "no-unreachable": "error",
  "no-const-assign": "error",
  "valid-typeof": "error",
  "no-self-assign": "error",
  "no-dupe-args": "error",
  "no-import-assign": "error",
  "no-unused-vars": "off"
};
module.exports = [
  { ignores: ["node_modules/**", "dist/**"] },
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser } },
    rules
  },
  {
    files: ["public/sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.serviceworker } },
    rules
  },
  {
    files: ["vite.config.mjs"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
    rules
  },
  {
    files: ["tests/**/*.js", "tools/**/*.js", "eslint.config.js"],
    ignores: ["tests/sim-player.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser, Game: "readonly" }
    },
    rules
  },
  // sayfaya enjekte edilen simülasyon oyuncusu: adlar window.Game'den "with" ile gelir
  {
    files: ["tests/sim-player.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser } },
    rules: { ...rules, "no-undef": "off" }
  }
];
