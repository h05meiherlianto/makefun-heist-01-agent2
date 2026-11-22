// Patrolling guards. Each guard walks a waypoint loop, pauses at each
// stop to look around, and has a vision cone the player must read.
// Spotting fills the guard's suspicion; suspicion drives three moods:
// patrol -> suspicious (walk to the last seen spot) -> chase (run at
// the thief). Losing sight cools the guard back down.

import { TUNING } from './config.js';
import { angleDifference, distance, hasLineOfSight, insideCone, moveCircle } from './geometry.js';

export function createGuard(def, index) {
  const start = def.path[0];
  return {
    id: index,
    x: start.x,
    y: start.y,
    path: def.path,
    waypoint: 1,
    pauseSeconds: def.pauseSeconds || 1,
    pauseLeft: 0,
    facing: 0,
    suspicion: 0,
    mood: 'patrol', // patrol | suspicious | chase
    lastSeen: null,
    searchLeft: 0,
    scanPhase: index * 1.7,
    caughtPlayer: false,
  };
}

// Can this guard see the player right now? Sneaking shrinks the range
// and running (not sneaking, moving fast) makes the guard notice sooner.
export function guardSeesPlayer(guard, player, walls, smokeClouds) {
  const range = player.sneaking
    ? TUNING.guardVisionRange * 0.68
    : TUNING.guardVisionRange;
  if (!insideCone(guard.x, guard.y, guard.facing, TUNING.guardVisionHalfAngle, range, player.x, player.y)) {
    return false;
  }
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y, walls)) return false;
  for (const cloud of smokeClouds) {
    if (distance(player.x, player.y, cloud.x, cloud.y) < cloud.radius) return false;
    if (segmentThroughCloud(guard, player, cloud)) return false;
  }
  return true;
}

function segmentThroughCloud(guard, player, cloud) {
  // Approximate: the sight line is blocked if its midpoint sits in smoke.
  const mx = (guard.x + player.x) / 2;
  const my = (guard.y + player.y) / 2;
  return distance(mx, my, cloud.x, cloud.y) < cloud.radius * 0.8;
}

export function updateGuard(guard, dt, player, walls, smokeClouds, now) {
  const sees = guardSeesPlayer(guard, player, walls, smokeClouds);
  const dist = distance(guard.x, guard.y, player.x, player.y);

  if (sees) {
    // Closer and faster = noticed sooner. Standing still in the open
    // at full range still fills the meter, just slowly.
    const closeness = 1 - dist / (TUNING.guardVisionRange * 1.15);
    const rate = 0.55 + closeness * 1.5 + (player.sneaking ? -0.25 : 0.25);
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion > 0.75) guard.mood = 'chase';
    else if (guard.suspicion > 0.3) guard.mood = 'suspicious';
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - dt * 0.22);
    if (guard.mood === 'chase' && guard.suspicion < 0.25) {
      guard.mood = 'suspicious';
      guard.searchLeft = 4;
    } else if (guard.mood === 'suspicious' && guard.suspicion <= 0.01 && guard.searchLeft <= 0) {
      guard.mood = 'patrol';
    }
  }

  let target = null;
  let speed = TUNING.guardSpeed;
  if (guard.mood === 'chase' && guard.lastSeen) {
    target = guard.lastSeen;
    speed = TUNING.guardChaseSpeed;
  } else if (guard.mood === 'suspicious' && guard.lastSeen) {
    target = guard.lastSeen;
    speed = TUNING.guardSpeed * 1.15;
    guard.searchLeft -= dt;
  } else {
    // Patrol: walk the loop, pausing at each waypoint to scan.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.facing += Math.sin(now * 1.1 + guard.scanPhase) * dt * 1.4;
      return { sees, dist };
    }
    target = guard.path[guard.waypoint];
    if (distance(guard.x, guard.y, target.x, target.y) < 8) {
      guard.waypoint = (guard.waypoint + 1) % guard.path.length;
      guard.pauseLeft = guard.pauseSeconds;
      return { sees, dist };
    }
  }

  if (target) {
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = Math.min(speed * dt, d);
    const moved = moveCircle(guard.x, guard.y, 15, (dx / d) * step, (dy / d) * step, walls);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.facing = Math.atan2(dy, dx);
  }
  return { sees, dist };
}

// A guard close enough to an alerted thief makes the catch.
export function guardCatchesPlayer(guard, player) {
  return (
    guard.mood !== 'patrol' &&
    guard.suspicion > 0.4 &&
    distance(guard.x, guard.y, player.x, player.y) < TUNING.catchRadius
  );
}
