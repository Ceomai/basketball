import { defineConfig } from "vite";
// Derleme çıktısı tek bir dist/index.html dosyası: tüm JavaScript sayfanın sonuna klasik betik (IIFE) olarak gömülür.
// Böylece oyun dosyaya çift tıklanarak (file://) da açılır; web, Capacitor ve önizleme için tek dosya yeter.
// public/ klasöründeki service worker, manifest ve ikonlar dist/ içine olduğu gibi kopyalanır.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    modulePreload: false,
    rollupOptions: { output: { format: "iife", inlineDynamicImports: true } }
  },
  plugins: [{
    name: "tek-dosya",
    enforce: "post",
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find(a => a.fileName.endsWith(".html"));
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk" || !name.endsWith(".js")) continue;
        html.source = html.source.replace(new RegExp(`<script[^>]*src="[^"]*${name.replace(/[.]/g, "\\.")}"[^>]*></script>\\s*`), "")
          .replace("</body>", () => `<script>\n${chunk.code.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`);
        delete bundle[name];
      }
    }
  }]
});
