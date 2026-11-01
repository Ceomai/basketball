import { defineConfig } from "vite";
// İki derleme biçimi:
// - Varsayılan (npm run build → dist/): GitHub Pages ve Android uygulaması için. Kod parçalara bölünür;
//   İngilizce dil paketi ayrı dosyadır ve yalnızca İngilizce seçiliyse indirilir.
// - Tek dosya (npm run build:single → dist-single/): her şey tek index.html içinde. Dosyaya çift tıklayınca
//   (file://) açılır; testler ve önizleme bunu kullanır.
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    build: {
      target: "es2022",
      modulePreload: false,
      outDir: single ? "dist-single" : "dist",
      rollupOptions: single ? { output: { inlineDynamicImports: true } } : {}
    },
    plugins: single
      ? [
          {
            name: "tek-dosya",
            enforce: "post",
            generateBundle(_, bundle) {
              const html = Object.values(bundle).find(a => a.fileName.endsWith(".html"));
              for (const [name, chunk] of Object.entries(bundle)) {
                if (chunk.type !== "chunk" || !name.endsWith(".js")) continue;
                html.source = html.source
                  .replace(new RegExp(`<script[^>]*src="[^"]*${name.replace(/[.]/g, "\\.")}"[^>]*></script>\\s*`), "")
                  .replace("</body>", () => `<script type="module">\n${chunk.code.replace(/__VITE_PRELOAD__/g, "void 0").replace(/<\/script/gi, "<\\/script")}</script>\n</body>`);
                delete bundle[name];
              }
            }
          }
        ]
      : []
  };
});
