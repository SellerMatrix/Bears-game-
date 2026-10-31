// Copy the game (../marbella-run) into www/, which Capacitor bundles into the native apps.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, '..', 'marbella-run'), out = join(root, 'www');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// the service worker and web manifest are for the website only; the native app ships the files itself
cpSync(src, out, { recursive: true, filter: p => !/(sw\.js|manifest\.webmanifest|privacy\.html)$/.test(p) });
console.log('copied game into www/');
