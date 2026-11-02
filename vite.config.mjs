import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
// İki derleme biçimi:
// - Varsayılan (npm run build → dist/): GitHub Pages ve Android uygulaması için. Kod parçalara bölünür;
//   İngilizce dil paketi ayrı dosyadır ve yalnızca İngilizce seçiliyse indirilir.
// - Tek dosya (npm run build:single → dist-single/): her şey tek index.html içinde. Dosyaya çift tıklayınca
//   (file://) açılır; testler ve önizleme bunu kullanır.
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    resolve: single
      ? {
          alias: [
            {
              find: /^\.\/pack-load\.js$/,
              replacement: fileURLToPath(new URL("./src/i18n/pack-load.single.js", import.meta.url))
            }
          ]
        }
      : {},
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
                  .replace(
                    "</body>",
                    () =>
                      `<script type="module">\n${chunk.code.replace(/__VITE_PRELOAD__/g, "void 0").replace(/<\/script/gi, "<\\/script")}</script>\n</body>`
                  );
                delete bundle[name];
              }
            }
          }
        ]
      : [
          {
            // İçerik güvenlik politikası (Pages ve Android derlemesi): satır içi betik ve olay işleyicisi çalışmaz,
            // dış kaynaklar yalnızca yazı tipi ve (yapılandırılırsa) Google girişi / Firebase / Sentry
            name: "csp",
            transformIndexHtml(html) {
              const csp = [
                "default-src 'self'",
                "script-src 'self' https://accounts.google.com/gsi/client",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
                "font-src 'self' https://fonts.gstatic.com data:",
                "img-src 'self' data: blob:",
                "connect-src 'self' https://*.googleapis.com https://accounts.google.com https://*.sentry.io",
                "frame-src https://accounts.google.com",
                "object-src 'none'",
                "base-uri 'self'"
              ].join("; ");
              return html.replace("<head>", `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
            }
          }
        ]
  };
});
