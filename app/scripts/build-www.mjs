// Builds app/www from ../captain-bear-2.html for the native app:
// every script and font is bundled locally so the game runs fully offline.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const www = join(app, 'www');
const nm = join(app, 'node_modules');
mkdirSync(join(www, 'vendor'), { recursive: true });
mkdirSync(join(www, 'fonts'), { recursive: true });

const vendor = {
  'three.min.js': 'three/build/three.min.js',
  'CopyShader.js': 'three/examples/js/shaders/CopyShader.js',
  'LuminosityHighPassShader.js': 'three/examples/js/shaders/LuminosityHighPassShader.js',
  'EffectComposer.js': 'three/examples/js/postprocessing/EffectComposer.js',
  'ShaderPass.js': 'three/examples/js/postprocessing/ShaderPass.js',
  'RenderPass.js': 'three/examples/js/postprocessing/RenderPass.js',
  'UnrealBloomPass.js': 'three/examples/js/postprocessing/UnrealBloomPass.js'
};
for (const [out, src] of Object.entries(vendor)) copyFileSync(join(nm, src), join(www, 'vendor', out));
for (const w of [500, 600, 700]) copyFileSync(join(nm, `@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`), join(www, 'fonts', `fredoka-${w}.woff2`));
if (existsSync(join(app, 'assets', 'www-extra'))) cpSync(join(app, 'assets', 'www-extra'), www, { recursive: true });

let html = readFileSync(join(app, '..', 'captain-bear-2.html'), 'utf8');
const fontFaces = [500, 600, 700].map(w => `@font-face { font-family: "Fredoka"; font-weight: ${w}; font-style: normal; font-display: block; src: url("fonts/fredoka-${w}.woff2") format("woff2"); }`).join('\n');
html = html
  .replace(/<meta name="claude:[^>]*>\n?/g, '')
  .replace(/<link rel="preconnect"[^>]*>\n?/, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, `<style>\n${fontFaces}\n</style>\n`)
  .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/, '<script src="vendor/three.min.js"></script>')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/examples\/js\/(?:shaders|postprocessing)\/([A-Za-z]+\.js)"><\/script>/g, '<script src="vendor/$1"></script>')
  .replace(/^<meta charset="utf-8">\n/, '');
if (/https?:\/\/(cdn|fonts)/.test(html.replace(/https:\/\/[^"']*\.(?:md|html)/g, ''))) throw new Error('A remote resource is still referenced; the app must work offline.');
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="theme-color" content="#8fd3ff">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">
`;
// the source page is a body fragment; lift its <title>/<meta>/<style> into <head>
const cut = html.indexOf('<div id="view">');
writeFileSync(join(www, 'index.html'), head + html.slice(0, cut) + '</head>\n<body>\n' + html.slice(cut) + '\n</body>\n</html>\n');
console.log('www built:', join(www, 'index.html'));
