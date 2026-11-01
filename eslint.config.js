// Oyun dosyaları klasik <script> olarak yüklenir ve üst düzey adları paylaşır.
// Bu yüzden her dosyanın üst düzey tanımları otomatik toplanıp diğerlerine "global" olarak tanıtılır;
// böylece no-undef gerçek yazım hatalarını (tanımsız değişken) yakalar.
const fs = require("fs");
const globals = require("globals");
const GAME = fs.readFileSync(__dirname + "/index.html", "utf8").match(/src="([a-z0-9]+\.js)"/g).map(s => s.slice(5, -1));
const shared = {};
const espree = require("espree");
for (const f of GAME) {
  const ast = espree.parse(fs.readFileSync(__dirname + "/" + f, "utf8"), { ecmaVersion: 2022, sourceType: "script" });
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") shared[n.id.name] = "writable";
    if (n.type === "VariableDeclaration") for (const d of n.declarations) if (d.id.type === "Identifier") shared[d.id.name] = "writable";
  }
}
const rules = {
  "no-undef": "error", "no-redeclare": "error", "no-dupe-keys": "error", "no-unreachable": "error",
  "no-const-assign": "error", "valid-typeof": "error", "no-self-assign": "error", "no-dupe-args": "error",
  "no-func-assign": "off", "no-unused-vars": "off"
};
module.exports = [
  { ignores: ["node_modules/**"] },
  { files: GAME, languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser, ...shared } }, rules: { ...rules, "no-redeclare": ["error", { builtinGlobals: false }] } },
  { files: ["tests/**/*.js", "eslint.config.js"], languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser, ...shared } }, rules }
];
