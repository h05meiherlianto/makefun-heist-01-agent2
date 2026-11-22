// Wall-mounted CCTV cameras. Each sweeps its cone back and forth on a
// fixed pivot; an EMP tool freezes them dark for a while. A camera
// never chases — it raises the alarm and points the guards at the thief.

import { TUNING } from './config.js';
import { distance, hasLineOfSight, insideCone } from './geometry.js';

export function createCamera(def, index) {
  return {
    id: index,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    phase: index * 2.1,
    angle: def.baseAngle,
    disabledLeft: 0,
    spotting: false,
  };
}

export function updateCamera(camera, dt, now, player, walls, smokeClouds) {
  if (camera.disabledLeft > 0) {
    camera.disabledLeft -= dt;
    camera.spotting = false;
    return false;
  }
  camera.angle =
    camera.baseAngle + Math.sin(now * camera.speed + camera.phase) * camera.sweep;
  const sees = cameraSeesPlayer(camera, player, walls, smokeClouds);
  camera.spotting = sees;
  return sees;
}

export function cameraSeesPlayer(camera, player, walls, smokeClouds) {
  if (camera.disabledLeft > 0) return false;
  if (
    !insideCone(camera.x, camera.y, camera.angle, TUNING.cameraVisionHalfAngle, TUNING.cameraVisionRange, player.x, player.y)
  ) {
    return false;
  }
  if (!hasLineOfSight(camera.x, camera.y, player.x, player.y, walls)) return false;
  for (const cloud of smokeClouds) {
    if (distance(player.x, player.y, cloud.x, cloud.y) < cloud.radius) return false;
  }
  return true;
}

// Where the camera is looking is where a guard should investigate.
export function cameraAlertPoint(camera, player) {
  return { x: player.x, y: player.y };
}
