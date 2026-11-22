// Paid tools. Points are the currency: every tool spends score, so
// using one is a real trade against the final payout.
//   1 EMP — all cameras go dark for 8 seconds.
//   2 Smoke bomb — a cloud at the thief's feet that blocks all vision.
//   3 Lockpick — the nearest wall safe within reach pops open at once.

import { TUNING } from './config.js';
import { nearestSafe } from './loot.js';

export function createTools() {
  return {
    empLeft: 0,
    smokeClouds: [], // { x, y, radius, left }
    used: { emp: 0, smoke: 0, lockpick: 0 },
  };
}

export function updateTools(tools, dt, cameras) {
  if (tools.empLeft > 0) {
    tools.empLeft -= dt;
    if (tools.empLeft <= 0) {
      for (const camera of cameras) camera.disabledLeft = 0;
    }
  }
  for (const cloud of tools.smokeClouds) cloud.left -= dt;
  tools.smokeClouds = tools.smokeClouds.filter((cloud) => cloud.left > 0);
}

export function tryEmp(tools, score, cameras) {
  if (score < TUNING.empCost) return { ok: false, reason: 'Need 150 pts' };
  tools.empLeft = TUNING.empDurationSeconds;
  for (const camera of cameras) camera.disabledLeft = TUNING.empDurationSeconds;
  tools.used.emp += 1;
  return { ok: true, cost: TUNING.empCost };
}

export function trySmoke(tools, score, player) {
  if (score < TUNING.smokeCost) return { ok: false, reason: 'Need 100 pts' };
  tools.smokeClouds.push({
    x: player.x,
    y: player.y,
    radius: TUNING.smokeRadius,
    left: TUNING.smokeDurationSeconds,
  });
  tools.used.smoke += 1;
  return { ok: true, cost: TUNING.smokeCost };
}

export function tryLockpick(tools, score, lootList, player) {
  if (score < TUNING.lockpickCost) return { ok: false, reason: 'Need 50 pts' };
  const safe = nearestSafe(lootList, player, 90);
  if (!safe) return { ok: false, reason: 'No safe nearby' };
  safe.taken = true;
  tools.used.lockpick += 1;
  return { ok: true, cost: TUNING.lockpickCost, value: safe.value };
}

export function empActive(tools) {
  return tools.empLeft > 0;
}
