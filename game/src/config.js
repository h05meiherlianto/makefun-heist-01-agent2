// Velvet Vault — level layouts and tuning constants.
// Every level is one big room: walls are rectangles that block both
// movement and line of sight, so each room offers several routes
// around the patrols. Coordinates are in game pixels (1280 x 720).

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const TUNING = {
  playerSpeed: 205,
  sneakSpeed: 115,
  guardSpeed: 95,
  guardChaseSpeed: 165,
  guardVisionRange: 235,
  guardVisionHalfAngle: 0.62, // radians either side of facing (~71 deg cone)
  cameraVisionRange: 260,
  cameraVisionHalfAngle: 0.55,
  catchRadius: 26,
  pickupRadius: 30,
  safeCrackSeconds: 2.6,
  alarmRisePerSecond: 14, // while any watcher is actively spotting the thief
  alarmDecayPerSecond: 2.2,
  alarmLockdownAt: 100,
  empCost: 150,
  empDurationSeconds: 8,
  smokeCost: 100,
  smokeDurationSeconds: 6,
  smokeRadius: 95,
  lockpickCost: 50,
};

export const LOOT_KINDS = {
  gem: { value: 120, radius: 12, label: 'Emerald' },
  gold: { value: 200, radius: 14, label: 'Gold Bar' },
  painting: { value: 300, radius: 16, label: 'Painting' },
  safe: { value: 500, radius: 18, label: 'Wall Safe' },
};

// A wall is { x, y, w, h }. Cover furniture doubles as a wall: it
// blocks sight lines, which is what makes flanking routes possible.
export const LEVELS = [
  {
    name: 'The Emerald Gallery',
    briefing:
      'Lift 3 pieces, then slip out the green door. Stay out of the cones.',
    requiredLoot: 3,
    playerStart: { x: 90, y: 640 },
    exit: { x: 1170, y: 40, w: 70, h: 60 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 18 },
      { x: 0, y: 702, w: 1280, h: 18 },
      { x: 0, y: 0, w: 18, h: 720 },
      { x: 1262, y: 0, w: 18, h: 720 },
      { x: 220, y: 150, w: 170, h: 26 }, // display case row
      { x: 220, y: 470, w: 170, h: 26 },
      { x: 540, y: 90, w: 26, h: 170 }, // statue plinth
      { x: 540, y: 470, w: 26, h: 170 },
      { x: 780, y: 150, w: 200, h: 26 },
      { x: 780, y: 470, w: 200, h: 26 },
      { x: 1040, y: 300, w: 26, h: 150 },
    ],
    guards: [
      {
        path: [
          { x: 300, y: 330 },
          { x: 620, y: 330 },
          { x: 620, y: 120 },
          { x: 300, y: 120 },
        ],
        pauseSeconds: 1.2,
      },
      {
        path: [
          { x: 900, y: 560 },
          { x: 900, y: 220 },
          { x: 1120, y: 220 },
          { x: 1120, y: 560 },
        ],
        pauseSeconds: 0.8,
      },
    ],
    cameras: [
      { x: 640, y: 58, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.5 },
      { x: 1270, y: 360, baseAngle: Math.PI, sweep: 0.7, speed: 0.65 },
    ],
    loot: [
      { kind: 'gem', x: 300, y: 90 },
      { kind: 'gem', x: 880, y: 90 },
      { kind: 'painting', x: 640, y: 640 },
      { kind: 'safe', x: 1180, y: 640 },
      { kind: 'gold', x: 120, y: 330 },
    ],
  },
  {
    name: 'The Gold Vault',
    briefing:
      'Heavier security, richer haul. Lift 4 pieces and reach the door.',
    requiredLoot: 4,
    playerStart: { x: 90, y: 90 },
    exit: { x: 1170, y: 620, w: 70, h: 60 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 18 },
      { x: 0, y: 702, w: 1280, h: 18 },
      { x: 0, y: 0, w: 18, h: 720 },
      { x: 1262, y: 0, w: 18, h: 720 },
      { x: 180, y: 200, w: 26, h: 320 },
      { x: 430, y: 120, w: 200, h: 26 },
      { x: 430, y: 560, w: 200, h: 26 },
      { x: 700, y: 200, w: 26, h: 320 },
      { x: 940, y: 120, w: 200, h: 26 },
      { x: 940, y: 560, w: 200, h: 26 },
      { x: 1060, y: 300, w: 120, h: 26 },
    ],
    guards: [
      {
        path: [
          { x: 300, y: 120 },
          { x: 300, y: 600 },
          { x: 560, y: 600 },
          { x: 560, y: 120 },
        ],
        pauseSeconds: 0.9,
      },
      {
        path: [
          { x: 830, y: 600 },
          { x: 830, y: 120 },
          { x: 1060, y: 120 },
          { x: 1060, y: 600 },
        ],
        pauseSeconds: 0.9,
      },
      {
        path: [
          { x: 640, y: 360 },
          { x: 1180, y: 360 },
          { x: 1180, y: 640 },
          { x: 640, y: 640 },
        ],
        pauseSeconds: 1.4,
      },
    ],
    cameras: [
      { x: 26, y: 360, baseAngle: 0, sweep: 0.8, speed: 0.6 },
      { x: 640, y: 58, baseAngle: Math.PI / 2, sweep: 1.0, speed: 0.45 },
      { x: 1270, y: 360, baseAngle: Math.PI, sweep: 0.8, speed: 0.6 },
    ],
    loot: [
      { kind: 'gold', x: 300, y: 60 },
      { kind: 'gem', x: 560, y: 360 },
      { kind: 'painting', x: 830, y: 60 },
      { kind: 'safe', x: 1180, y: 90 },
      { kind: 'gold', x: 120, y: 640 },
      { kind: 'gem', x: 640, y: 640 },
    ],
  },
  {
    name: 'The Crown Chamber',
    briefing:
      'The crown jewels. Lift 5 pieces — every cone in the house is watching.',
    requiredLoot: 5,
    playerStart: { x: 640, y: 650 },
    exit: { x: 1170, y: 40, w: 70, h: 60 },
    walls: [
      { x: 0, y: 0, w: 1280, h: 18 },
      { x: 0, y: 702, w: 1280, h: 18 },
      { x: 0, y: 0, w: 18, h: 720 },
      { x: 1262, y: 0, w: 18, h: 720 },
      { x: 200, y: 140, w: 180, h: 26 },
      { x: 200, y: 540, w: 180, h: 26 },
      { x: 560, y: 140, w: 26, h: 180 },
      { x: 560, y: 400, w: 26, h: 180 },
      { x: 900, y: 140, w: 180, h: 26 },
      { x: 900, y: 540, w: 180, h: 26 },
      { x: 760, y: 300, w: 180, h: 26 },
      { x: 340, y: 300, w: 120, h: 26 },
    ],
    guards: [
      {
        path: [
          { x: 280, y: 230 },
          { x: 480, y: 230 },
          { x: 480, y: 470 },
          { x: 280, y: 470 },
        ],
        pauseSeconds: 0.7,
      },
      {
        path: [
          { x: 800, y: 230 },
          { x: 1000, y: 230 },
          { x: 1000, y: 470 },
          { x: 800, y: 470 },
        ],
        pauseSeconds: 0.7,
      },
      {
        path: [
          { x: 640, y: 90 },
          { x: 640, y: 620 },
        ],
        pauseSeconds: 1.0,
      },
      {
        path: [
          { x: 120, y: 360 },
          { x: 1160, y: 360 },
        ],
        pauseSeconds: 1.6,
      },
    ],
    cameras: [
      { x: 26, y: 120, baseAngle: 0.5, sweep: 0.9, speed: 0.7 },
      { x: 640, y: 58, baseAngle: Math.PI / 2, sweep: 1.1, speed: 0.5 },
      { x: 1270, y: 120, baseAngle: Math.PI - 0.5, sweep: 0.9, speed: 0.7 },
      { x: 1270, y: 600, baseAngle: Math.PI, sweep: 0.8, speed: 0.55 },
    ],
    loot: [
      { kind: 'gem', x: 290, y: 80 },
      { kind: 'gold', x: 990, y: 80 },
      { kind: 'painting', x: 120, y: 640 },
      { kind: 'safe', x: 640, y: 360 },
      { kind: 'gem', x: 120, y: 90 },
      { kind: 'gold', x: 1180, y: 360 },
      { kind: 'painting', x: 850, y: 640 },
    ],
  },
];
