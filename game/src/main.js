// Velvet Vault — game loop and state machine.
// States: title -> briefing -> playing -> levelClear -> caught / win.
// The thief moves with WASD/arrows, sneaks with Shift, cracks safes
// with E, and spends score on tools with 1/2/3. The goal each level:
// lift the required loot, then reach the green exit before the timer
// runs out or a guard lays a hand on the thief.

import { LEVELS, TUNING, VIEW_H, VIEW_W } from './config.js';
import { createInput, moveVector, isSneaking, wasPressed, endFrame } from './input.js';
import { createAudio } from './audio.js';
import { createGuard, updateGuard, guardCatchesPlayer } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { createLoot, updateLoot, lootTakenCount } from './loot.js';
import { createAlarm, updateAlarm, alarmBand } from './alarm.js';
import { createTools, updateTools, tryEmp, trySmoke, tryLockpick } from './tools.js';
import { moveCircle, distance } from './geometry.js';
import {
  drawFloor, drawWalls, drawVisionCones, drawExit, drawLoot,
  drawCameras, drawGuards, drawPlayer, drawSmoke, drawHud, drawCenterPanel,
} from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput();
const audio = createAudio();
const params = new URLSearchParams(window.location.search);

const game = {
  state: 'title', // title | briefing | playing | levelClear | caught | win
  levelIndex: 0,
  level: LEVELS[0],
  guards: [],
  cameras: [],
  lootList: [],
  alarm: createAlarm(),
  tools: createTools(),
  player: { x: 90, y: 640, radius: 13, sneaking: false },
  score: 0,
  lootTaken: 0,
  timeLeft: 240,
  elapsed: 0,
  message: '',
  messageLeft: 0,
  muted: false,
  paused: false,
  frozen: false, // screenshot staging: render one fixed frame, no updates
  banner: '',
  bannerLeft: 0,
};

function loadLevel(index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  game.guards = level.guards.map((def, i) => createGuard(def, i));
  game.cameras = level.cameras.map((def, i) => createCamera(def, i));
  game.lootList = level.loot.map((def, i) => createLoot(def, i));
  game.alarm = createAlarm();
  game.tools = createTools();
  game.player = { x: level.playerStart.x, y: level.playerStart.y, radius: 13, sneaking: false };
  game.lootTaken = 0;
  game.timeLeft = 240;
  game.banner = level.name.toUpperCase();
  game.bannerLeft = 3;
  game.message = level.briefing;
  game.messageLeft = 5;
}

function say(text, seconds = 3) {
  game.message = text;
  game.messageLeft = seconds;
}

function spendTool(result, label) {
  if (!result.ok) {
    say(result.reason || 'Cannot use that now');
    audio.denied();
    return;
  }
  game.score -= result.cost;
  audio.tool();
  say(label + ' used (−' + result.cost + ' pts)');
}

function updatePlaying(dt) {
  const level = game.level;
  const player = game.player;
  player.sneaking = isSneaking(input);
  const speed = player.sneaking ? TUNING.sneakSpeed : TUNING.playerSpeed;
  const vec = moveVector(input);
  const moved = moveCircle(player.x, player.y, player.radius, vec.x * speed * dt, vec.y * speed * dt, level.walls);
  player.x = moved.x;
  player.y = moved.y;
  game.elapsed += dt;
  game.timeLeft -= dt;

  // Tools.
  if (wasPressed(input, 'Digit1')) spendTool(tryEmp(game.tools, game.score, game.cameras), 'EMP');
  if (wasPressed(input, 'Digit2')) spendTool(trySmoke(game.tools, game.score, player), 'Smoke bomb');
  if (wasPressed(input, 'Digit3')) {
    const result = tryLockpick(game.tools, game.score, game.lootList, player);
    if (result.ok) {
      game.score -= result.cost;
      game.score += result.value;
      game.lootTaken = lootTakenCount(game.lootList);
      audio.safeCracked();
      say('Safe popped open! +' + result.value + ' pts');
    } else {
      say(result.reason || 'Cannot use that now');
      audio.denied();
    }
  }

  updateTools(game.tools, dt, game.cameras);

  // Loot: walk-overs auto-collect, safes crack while E is held.
  const interactHeld = input.keys.has('KeyE');
  const { earned, cracking } = updateLoot(game.lootList, player, interactHeld, dt);
  if (earned > 0) {
    game.score += earned;
    game.lootTaken = lootTakenCount(game.lootList);
    audio.pickup();
    say('Loot secured! +' + earned + ' pts  (' + game.lootTaken + '/' + level.requiredLoot + ' needed)');
  }
  if (cracking && !earned) {
    // Cracking hum is the pickup blip slowed by progress; keep it quiet.
  }

  // Watchers: guards and cameras.
  let anySpotting = false;
  let anyChase = false;
  let spottedNow = false;
  for (const guard of game.guards) {
    const { sees } = updateGuard(guard, dt, player, level.walls, game.tools.smokeClouds, game.elapsed);
    if (sees) {
      anySpotting = true;
      if (guard.mood === 'chase') anyChase = true;
      if (guard.suspicion > 0.3 && guard.suspicion < 0.45) spottedNow = true;
    }
    if (guardCatchesPlayer(guard, player)) {
      endGame(false, 'Caught by a guard!');
      return;
    }
  }
  for (const camera of game.cameras) {
    const sees = updateCamera(camera, dt, game.elapsed, player, level.walls, game.tools.smokeClouds);
    if (sees) {
      anySpotting = true;
      // A live camera tips the nearest guard off to the thief's spot.
      let nearest = null;
      let nearestDist = Infinity;
      for (const guard of game.guards) {
        const d = distance(guard.x, guard.y, player.x, player.y);
        if (d < nearestDist) {
          nearest = guard;
          nearestDist = d;
        }
      }
      if (nearest && nearest.mood === 'patrol') {
        nearest.mood = 'suspicious';
        nearest.lastSeen = { x: player.x, y: player.y };
        nearest.suspicion = Math.max(nearest.suspicion, 0.4);
      }
    }
  }
  if (spottedNow) audio.spotted();

  updateAlarm(game.alarm, dt, anySpotting, anyChase);
  const band = alarmBand(game.alarm);
  if (band >= 2) audio.startAlarmLoop();
  else audio.stopAlarmLoop();
  if (game.alarm.lockdown) {
    say('LOCKDOWN — exit sealed, guards converging!', 1);
    for (const guard of game.guards) {
      if (guard.mood === 'patrol') {
        guard.mood = 'suspicious';
        guard.lastSeen = { x: player.x, y: player.y };
      }
    }
  }

  // Exit: only open with enough loot and no lockdown.
  const e = level.exit;
  const insideExit =
    player.x > e.x - 6 && player.x < e.x + e.w + 6 && player.y > e.y - 6 && player.y < e.y + e.h + 6;
  if (insideExit) {
    if (game.lootTaken >= level.requiredLoot && !game.alarm.lockdown) {
      levelCleared();
      return;
    }
    if (game.alarm.lockdown) say('Exit sealed during lockdown!');
    else say('Need ' + (level.requiredLoot - game.lootTaken) + ' more loot before the exit opens');
  }

  if (game.timeLeft <= 0) {
    endGame(false, 'Out of time — the crew left without you.');
    return;
  }
}

function levelCleared() {
  const bonus = Math.max(0, Math.round(game.timeLeft)) * 2;
  game.score += bonus;
  audio.levelClear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'win';
  } else {
    game.state = 'levelClear';
    game._clearBonus = bonus;
  }
}

function endGame(won, reason) {
  game.state = won ? 'win' : 'caught';
  game._endReason = reason;
  audio.stopAlarmLoop();
  if (won) audio.win();
  else audio.caught();
}

function startGame() {
  game.score = 0;
  game.elapsed = 0;
  loadLevel(0);
  game.state = 'briefing';
}

function render(now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') {
    drawFloor(ctx, LEVELS[0]);
    drawWalls(ctx, LEVELS[0].walls);
    drawCenterPanel(
      ctx,
      'VELVET VAULT',
      [
        'A top-down stealth heist in three museum rooms.',
        'Lift the loot, dodge the cones, reach the green exit.',
        'WASD / arrows move · SHIFT sneak · E crack safes',
        '1 EMP · 2 smoke · 3 lockpick — every tool costs points',
        '',
        'Press ENTER or click to start',
      ],
      '#d4af37',
    );
    return;
  }
  const level = game.level;
  drawFloor(ctx, level);
  drawExit(ctx, level, game.alarm, game.lootTaken);
  drawVisionCones(ctx, game.guards, game.cameras);
  drawWalls(ctx, level.walls);
  drawLoot(ctx, game.lootList, now);
  drawCameras(ctx, game.cameras, now);
  drawGuards(ctx, game.guards);
  drawSmoke(ctx, game.tools.smokeClouds);
  drawPlayer(ctx, game.player, now);
  drawHud(ctx, game);

  if (game.bannerLeft > 0) {
    ctx.fillStyle = 'rgba(10, 14, 26, 0.8)';
    ctx.fillRect(340, 300, 600, 54);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 300, 600, 54);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.banner, VIEW_W / 2, 336);
    ctx.textAlign = 'left';
  }

  if (game.state === 'briefing') {
    drawCenterPanel(ctx, game.level.name.toUpperCase(), [
      game.level.briefing,
      'Loot needed: ' + game.level.requiredLoot + ' pieces · 240 seconds on the clock',
      'Guards patrol — their cones are your warning. Cameras sweep the room.',
      '',
      'Press ENTER or click to begin the heist',
    ]);
  } else if (game.state === 'levelClear') {
    drawCenterPanel(ctx, 'CLEAN GETAWAY', [
      game.level.name + ' cleared · time bonus +' + (game._clearBonus || 0) + ' pts',
      'Total score: ' + game.score,
      'Next: ' + LEVELS[game.levelIndex + 1].name,
      '',
      'Press ENTER for the next room',
    ]);
  } else if (game.state === 'caught') {
    drawCenterPanel(
      ctx,
      'CAUGHT!',
      [game._endReason || 'The guards got you.', 'Score: ' + game.score + ' · Loot: ' + game.lootTaken, '', 'Press ENTER to try the heist again'],
      '#ef4444',
    );
  } else if (game.state === 'win') {
    drawCenterPanel(ctx, 'THE PERFECT HEIST', [
      'All three rooms cleaned out. The crew is rich tonight.',
      'Final score: ' + game.score + ' · Time: ' + Math.round(game.elapsed) + 's',
      'Tools used — EMP ' + game.tools.used.emp + ' · smoke ' + game.tools.used.smoke + ' · lockpicks ' + game.tools.used.lockpick,
      '',
      'Press ENTER to run it back',
    ], '#4ade80');
  } else if (game.paused) {
    drawCenterPanel(ctx, 'PAUSED', ['Press P to keep moving', '', 'WASD move · SHIFT sneak · E crack safe'], '#94a3b8');
  }
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  audio.unlock();

  if (!game.frozen) {
    if (wasPressed(input, 'KeyM')) {
      game.muted = audio.toggleMute();
    }
    if (game.state === 'playing' && wasPressed(input, 'KeyP')) {
      game.paused = !game.paused;
    }
    if (game.messageLeft > 0) game.messageLeft -= dt;
    else game.message = '';
    if (game.bannerLeft > 0) game.bannerLeft -= dt;

    if (game.state === 'title') {
      if (wasPressed(input, 'Enter') || input.mouse.clicked) {
        audio.click();
        startGame();
      }
    } else if (game.state === 'briefing') {
      if (wasPressed(input, 'Enter') || input.mouse.clicked) {
        audio.click();
        game.state = 'playing';
      }
    } else if (game.state === 'levelClear') {
      if (wasPressed(input, 'Enter') || input.mouse.clicked) {
        audio.click();
        loadLevel(game.levelIndex + 1);
        game.state = 'briefing';
      }
    } else if (game.state === 'caught' || game.state === 'win') {
      if (wasPressed(input, 'Enter') || input.mouse.clicked) {
        audio.click();
        startGame();
      }
    } else if (game.state === 'playing' && !game.paused) {
      updatePlaying(dt);
    }
  }

  render(now / 1000);
  endFrame(input);
  requestAnimationFrame(frame);
}

// ---- Screenshot staging -------------------------------------------------
// ?shot=start|play|alert|win freezes a composed frame so the cover shows
// the room, a guard cone, a camera, loot and the alarm meter at once.
function applyShot(shot) {
  game.frozen = true;
  if (shot === 'win') {
    loadLevel(2);
    game.score = 2840;
    game.elapsed = 512;
    game.tools.used = { emp: 2, smoke: 1, lockpick: 1 };
    game.state = 'win';
    return;
  }
  if (shot === 'alert') {
    loadLevel(2);
    game.state = 'playing';
    game.score = 1420;
    game.lootTaken = 2;
    game.lootList[0].taken = true;
    game.lootList[1].taken = true;
    game.alarm.value = 78;
    game.player.x = 640;
    game.player.y = 470;
    const guard = game.guards[2];
    guard.x = 640;
    guard.y = 560;
    guard.facing = -Math.PI / 2;
    guard.mood = 'chase';
    guard.suspicion = 0.9;
    guard.lastSeen = { x: 640, y: 470 };
    game.guards[0].x = 380;
    game.guards[0].y = 230;
    game.guards[0].facing = 0.4;
    game.guards[1].x = 900;
    game.guards[1].y = 230;
    game.guards[1].facing = Math.PI - 0.4;
    game.tools.smokeClouds = [{ x: 700, y: 520, radius: 95, left: 4 }];
    game.bannerLeft = 0;
    game.message = 'LOCKDOWN WARNING — guard closing in!';
    game.messageLeft = 99;
    return;
  }
  if (shot === 'play') {
    loadLevel(1);
    game.state = 'playing';
    game.score = 860;
    game.lootTaken = 1;
    game.lootList[0].taken = true;
    game.alarm.value = 45;
    game.player.x = 500;
    game.player.y = 360;
    game.player.sneaking = true;
    game.guards[0].x = 430;
    game.guards[0].y = 300;
    game.guards[0].facing = Math.PI / 4;
    game.guards[0].mood = 'suspicious';
    game.guards[0].suspicion = 0.55;
    game.guards[0].lastSeen = { x: 500, y: 360 };
    game.guards[1].x = 960;
    game.guards[1].y = 400;
    game.guards[1].facing = Math.PI;
    game.guards[2].x = 830;
    game.guards[2].y = 200;
    game.guards[2].facing = Math.PI / 2;
    game.tools.smokeClouds = [{ x: 560, y: 420, radius: 95, left: 5 }];
    game.bannerLeft = 0;
    game.message = 'Sneaking past the patrol — grab the gold!';
    game.messageLeft = 99;
    return;
  }
  // Default: start — level 1, mid-room, everything visible.
  loadLevel(0);
  game.state = 'playing';
  game.score = 320;
  game.lootTaken = 1;
  game.lootList[4].taken = true;
  game.alarm.value = 25;
  game.player.x = 470;
  game.player.y = 360;
  game.guards[0].x = 460;
  game.guards[0].y = 300;
  game.guards[0].facing = Math.PI / 2;
  game.guards[1].x = 1000;
  game.guards[1].y = 360;
  game.guards[1].facing = Math.PI;
  game.bannerLeft = 0;
  game.message = 'Lift 3 pieces, then slip out the green door.';
  game.messageLeft = 99;
}

const shot = params.get('shot');
if (shot) applyShot(shot);
render(0);
requestAnimationFrame(frame);
