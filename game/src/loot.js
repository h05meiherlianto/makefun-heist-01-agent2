// Loot: gems, gold bars and paintings are grabbed by walking over
// them; wall safes need the thief to stand close and hold E to crack
// (or spend a lockpick for an instant open). Each piece pays points.

import { LOOT_KINDS, TUNING } from './config.js';
import { distance } from './geometry.js';

export function createLoot(def, index) {
  return {
    id: index,
    kind: def.kind,
    x: def.x,
    y: def.y,
    value: LOOT_KINDS[def.kind].value,
    label: LOOT_KINDS[def.kind].label,
    taken: false,
    crackProgress: 0,
  };
}

// Returns the points earned this frame (0 when nothing was taken).
// `interactHeld` is true while the player holds E near a safe.
export function updateLoot(lootList, player, interactHeld, dt) {
  let earned = 0;
  let cracking = null;
  for (const item of lootList) {
    if (item.taken) continue;
    const d = distance(player.x, player.y, item.x, item.y);
    if (item.kind === 'safe') {
      if (d < TUNING.pickupRadius + 18 && interactHeld) {
        item.crackProgress += dt / TUNING.safeCrackSeconds;
        cracking = item;
        if (item.crackProgress >= 1) {
          item.taken = true;
          earned += item.value;
        }
      } else {
        item.crackProgress = Math.max(0, item.crackProgress - dt * 0.8);
      }
    } else if (d < TUNING.pickupRadius) {
      item.taken = true;
      earned += item.value;
    }
  }
  return { earned, cracking };
}

export function nearestSafe(lootList, player, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const item of lootList) {
    if (item.taken || item.kind !== 'safe') continue;
    const d = distance(player.x, player.y, item.x, item.y);
    if (d < bestDist) {
      best = item;
      bestDist = d;
    }
  }
  return best;
}

export function lootTakenCount(lootList) {
  return lootList.filter((item) => item.taken).length;
}

export function lootRemainingValue(lootList) {
  return lootList.filter((item) => !item.taken).reduce((sum, item) => sum + item.value, 0);
}
