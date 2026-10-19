// Baut aus dist/ eine einzelne, selbstständige HTML-Datei (CSS und JS inline) zum Testen
// als privates Claude-Artifact. Ohne PWA-Teile: Service Worker und Manifest laufen dort nicht.
// Aufruf: npm run build:artifact  →  dist-artifact/fantasysoccer.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const asset = (re) => {
  const m = html.match(re);
  if (!m) throw new Error(`Asset nicht gefunden: ${re}`);
  return readFileSync(join(dist, m[1]), 'utf8');
};
const js = asset(/<script type="module" crossorigin src="\.\/([^"]+)"/);
const css = asset(/<link rel="stylesheet" crossorigin href="\.\/([^"]+)"/);
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '').trim();

const out = `<title>FantasySoccer</title>
<style>
:root { color-scheme: dark; }
${css}
/* Der Artifact-Rahmen polstert oben/unten schon um die Safe-Area. */
body { padding-top: 0; padding-bottom: 0; }
</style>
${body}
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;

mkdirSync('dist-artifact', { recursive: true });
writeFileSync('dist-artifact/fantasysoccer.html', out);
console.log(`dist-artifact/fantasysoccer.html (${(out.length / 1024).toFixed(1)} kB)`);
