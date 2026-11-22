// Velvet Vault — a top-down stealth heist game, entered for make.fun's
// "Make the best heist game" bounty (best-heist-game-20261122-0559).
//
// This program is the entrypoint the grader runs (Node 22, standard
// library only). It copies the static game in game/ and the screenshots
// in screenshots/ into the output directory, then writes dossier.json
// with the vendored make.fun library so the judge can read the entry.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.
// The program is deterministic: two runs write identical bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the gate's own limits, so an entry this program accepts
// is one the scorer accepts: at most 4 screenshots of 256 KiB each,
// at most 993 files / 48 MiB under game/, and a dossier text cap of
// 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log('Velvet Vault handed in to ' + outputDir);
