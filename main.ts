// Hands in Lantern Noodle Bar: copies the game (game/) and its screenshots (screenshots/) to the output
// folder and writes dossier.json, the summary the judge reads, with make.fun's vendored library.
// The game itself is plain static files: serve game/ (node serve.ts) and open it in desktop Chrome.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The grader collects /output as another user: every folder 0755 and every file 0644. */
function makeReadable(dir: string): void {
  chmodSync(dir, 0o755);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) makeReadable(path);
    else chmodSync(path, 0o644);
  }
}

mkdirSync(output, { recursive: true });
cpSync(join(repo, 'game'), join(output, 'game'), { recursive: true });
cpSync(join(repo, 'screenshots'), join(output, 'screenshots'), { recursive: true });
const shots = readdirSync(join(output, 'screenshots')).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) throw new Error(`screenshots/ needs 3 or 4 images, found ${shots.length}`);

// The scorer's caps: 160 KiB of source text, 3-4 screenshots of at most 256 KiB, and game/ within
// 993 entries, 48 MiB and 1000-byte paths.
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
makeReadable(output);
