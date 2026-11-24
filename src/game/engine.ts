import { audioEngine } from './audio';
import { loadProgress } from './badges';
import { CHARACTERS, getCharacterDef } from './characters';
import { LEVEL_ROWS, ParsedLevel, TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH, parseLevel } from './levels';
import {
  BeatSnapshot,
  CharacterId,
  Collectible,
  Enemy,
  FloatingText,
  HudSnapshot,
  InputState,
  LevelDef,
  LevelSummary,
  Particle,
  PlayerState,
  TileBounce,
  TileKind,
} from './types';

export interface GameWorld {
  level: LevelDef;
  characterId: CharacterId;
  grid: TileKind[][];
  widthCols: number;
  heightRows: number;
  player: PlayerState;
  enemies: Enemy[];
  collectibles: Collectible[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  tileBounces: TileBounce[];
  cameraX: number;
  score: number;
  notesCollected: number;
  lives: number;
  timeLeft: number;
  rhythmHits: number;
  elapsedSec: number;
  checkpointX: number;
  checkpointY: number;
  checkpointReached: boolean;
  goalX: number;
  goalTopY: number;
  goalBottomY: number;
  nextEntityId: number;
  lastBeatIndex: number;
  levelFinished: boolean;
  playerDead: boolean;
  deathTimer: number;
  shakeTimer: number;
  summary: LevelSummary | null;
}

export function createGameWorld(
  level: LevelDef,
  characterId: CharacterId,
  carryLives = 3,
  carryScore = 0,
  preserveCheckpoint = false,
  prevCheckpointReached = false
): GameWorld {
  const parsed: ParsedLevel = parseLevel(level);
  const startX = preserveCheckpoint && prevCheckpointReached ? parsed.checkpointX : parsed.spawnX;
  const startY = preserveCheckpoint && prevCheckpointReached ? parsed.checkpointY - 36 : parsed.spawnY;

  const prog = loadProgress();
  const initialLives = prog.equippedBadge === 'corazon_extra' ? Math.max(carryLives, 5) : carryLives;
  const isMagmaShield = prog.equippedBadge === 'magma_king';

  const player: PlayerState = {
    x: startX,
    y: startY,
    w: 26,
    h: 34,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    isHoldingJump: false,
    poweredUp: isMagmaShield,
    invincibleTimer: 0,
    squashX: 1,
    squashY: 1,
    walkCycle: 0,
    blinkTimer: 2.5,
    singTimer: 0,
    combo: 0,
    goalReached: false,
    goalSlideDone: false,
    flagY: parsed.goalTopY + 12,
    canDoubleJump: true,
    hasDoubleJumped: false,
  };

  return {
    level,
    characterId,
    grid: parsed.grid,
    widthCols: parsed.widthCols,
    heightRows: parsed.heightRows,
    player,
    enemies: parsed.enemies,
    collectibles: parsed.collectibles,
    particles: [],
    floatingTexts: [],
    tileBounces: [],
    cameraX: Math.max(0, startX - VIEW_WIDTH * 0.35),
    score: carryScore,
    notesCollected: 0,
    lives: initialLives,
    timeLeft: level.timeLimit,
    rhythmHits: 0,
    elapsedSec: 0,
    checkpointX: parsed.checkpointX,
    checkpointY: parsed.checkpointY,
    checkpointReached: prevCheckpointReached,
    goalX: parsed.goalX,
    goalTopY: parsed.goalTopY,
    goalBottomY: parsed.goalBottomY,
    nextEntityId: 5000,
    lastBeatIndex: -1,
    levelFinished: false,
    playerDead: false,
    deathTimer: 0,
    shakeTimer: 0,
    summary: null,
  };
}

export function isTileSolid(tile: TileKind, beat: BeatSnapshot): boolean {
  switch (tile) {
    case 'GROUND':
    case 'GROUND_TOP':
    case 'BRICK':
    case 'QUESTION_COIN':
    case 'QUESTION_POWER':
    case 'USED_BLOCK':
    case 'PIPE_TL':
    case 'PIPE_TR':
    case 'PIPE_BL':
    case 'PIPE_BR':
    case 'SPRING':
      return true;
    case 'BEAT_A':
      return beat.isBeatA;
    case 'BEAT_B':
      return beat.isBeatB;
    default:
      return false;
  }
}

function getTileAt(world: GameWorld, col: number, row: number): TileKind {
  if (col < 0 || col >= world.widthCols || row < 0 || row >= world.heightRows) {
    return 'EMPTY';
  }
  return world.grid[row][col];
}

function spawnParticles(
  world: GameWorld,
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 160,
  shape: Particle['shape'] = 'circle'
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const mag = speed * (0.45 + Math.random() * 0.65);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag - 80,
      size: shape === 'note' ? 9 : 4 + Math.random() * 4,
      color,
      alpha: 1,
      life: 0.45 + Math.random() * 0.25,
      maxLife: 0.7,
      gravity: true,
      shape,
    });
  }
}

function addFloatingText(
  world: GameWorld,
  x: number,
  y: number,
  text: string,
  color = '#FACC15'
): void {
  world.floatingTexts.push({
    x,
    y,
    vy: -48,
    text,
    color,
    life: 0.85,
    maxLife: 0.85,
  });
}

function bumpTile(world: GameWorld, col: number, row: number, beat: BeatSnapshot): void {
  const tile = getTileAt(world, col, row);
  const wx = col * TILE_SIZE;
  const wy = row * TILE_SIZE;

  if (tile === 'BRICK') {
    if (world.player.poweredUp) {
      world.grid[row][col] = 'EMPTY';
      world.score += 50;
      audioEngine.sfxBreakBrick();
      spawnParticles(
        world,
        wx + TILE_SIZE / 2,
        wy + TILE_SIZE / 2,
        world.level.theme.brickFill,
        10,
        220,
        'square'
      );
      world.shakeTimer = 0.08;
    } else {
      audioEngine.sfxBump();
      world.tileBounces.push({ col, row, offsetY: -6, velY: -60 });
    }
    return;
  }

  if (tile === 'QUESTION_COIN') {
    world.grid[row][col] = 'USED_BLOCK';
    world.tileBounces.push({ col, row, offsetY: -8, velY: -70 });
    world.notesCollected += 1;
    const bonus = beat.isOnBeatWindow ? 150 : 100;
    if (beat.isOnBeatWindow) {
      world.rhythmHits += 1;
      addFloatingText(world, wx + 18, wy - 12, '¡+RITMO! 150', '#38BDF8');
    } else {
      addFloatingText(world, wx + 18, wy - 12, '+100', '#FACC15');
    }
    world.score += bonus;
    world.player.singTimer = 0.25;
    audioEngine.sfxNote(world.notesCollected, world.level.rootMidi);

    world.collectibles.push({
      id: world.nextEntityId++,
      kind: 'pop_note',
      x: wx + 8,
      y: wy - 20,
      w: 20,
      h: 20,
      vx: 0,
      vy: -240,
      collected: false,
      bobPhase: 0,
      lifeTimer: 0.45,
    });
    updateAudioLayers(world);
    return;
  }

  if (tile === 'QUESTION_POWER') {
    world.grid[row][col] = 'USED_BLOCK';
    world.tileBounces.push({ col, row, offsetY: -8, velY: -70 });
    audioEngine.sfxPowerUp();
    world.collectibles.push({
      id: world.nextEntityId++,
      kind: 'power_speaker',
      x: wx + 4,
      y: wy - TILE_SIZE,
      w: 28,
      h: 28,
      vx: 95,
      vy: -120,
      collected: false,
      bobPhase: 0,
    });
  }
}

function updateAudioLayers(world: GameWorld): void {
  // Unlock progressive Sprunki instrument layers as notes are collected!
  const ratio = world.notesCollected / Math.max(1, world.level.totalNotes);
  let layers = 2; // Drums + Bass active from start
  if (world.notesCollected >= 3 || ratio >= 0.15) layers = 3; // Add Chords
  if (world.notesCollected >= 7 || ratio >= 0.35 || world.player.poweredUp) layers = 4; // Full Melody!
  audioEngine.setLayers(layers);
}

export function getUnlockedLayers(world: GameWorld): number {
  const ratio = world.notesCollected / Math.max(1, world.level.totalNotes);
  if (world.notesCollected >= 7 || ratio >= 0.35 || world.player.poweredUp) return 4;
  if (world.notesCollected >= 3 || ratio >= 0.15) return 3;
  return 2;
}

function hurtPlayer(world: GameWorld): void {
  const p = world.player;
  if (p.invincibleTimer > 0 || world.playerDead || world.levelFinished) return;

  if (p.poweredUp) {
    p.poweredUp = false;
    p.invincibleTimer = 1.6;
    p.vy = -260;
    p.combo = 0;
    world.shakeTimer = 0.14;
    audioEngine.sfxHurt();
    spawnParticles(world, p.x + p.w / 2, p.y + p.h / 2, '#FACC15', 10, 180);
    addFloatingText(world, p.x + p.w / 2, p.y - 10, '¡Escudo roto!', '#FB7185');
  } else {
    triggerPlayerDeath(world);
  }
}

function triggerPlayerDeath(world: GameWorld): void {
  if (world.playerDead) return;
  world.playerDead = true;
  world.deathTimer = 1.15;
  world.player.vy = -420;
  world.player.vx = 0;
  world.player.combo = 0;
  world.lives -= 1;
  world.shakeTimer = 0.2;
  audioEngine.sfxHurt();
  audioEngine.stopMusic();
}

export interface StepResult {
  hud: HudSnapshot;
  event: 'NONE' | 'RESPAWN' | 'GAME_OVER' | 'LEVEL_CLEAR';
}

export function stepGameWorld(
  world: GameWorld,
  input: InputState,
  dtRaw: number
): StepResult {
  const dt = Math.min(dtRaw, 0.033);
  world.elapsedSec += dt;
  const beat = audioEngine.getBeatSnapshot(world.elapsedSec);

  if (world.shakeTimer > 0) {
    world.shakeTimer = Math.max(0, world.shakeTimer - dt);
  }

  // Detect beat transition for subtle enemy beat hops
  if (beat.beatIndex !== world.lastBeatIndex) {
    world.lastBeatIndex = beat.beatIndex;
    for (const enemy of world.enemies) {
      if (enemy.alive && !enemy.inShell) {
        enemy.beatHopOffset = -5;
      }
    }
  }

  // Update particles & floating texts even during death/goal
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) {
      world.particles.splice(i, 1);
      continue;
    }
    if (pt.gravity) pt.vy += 680 * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.alpha = Math.max(0, pt.life / pt.maxLife);
  }

  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.life -= dt;
    if (ft.life <= 0) {
      world.floatingTexts.splice(i, 1);
      continue;
    }
    ft.y += ft.vy * dt;
  }

  // Tile bounces
  for (let i = world.tileBounces.length - 1; i >= 0; i--) {
    const tb = world.tileBounces[i];
    tb.offsetY += tb.velY * dt;
    tb.velY += 520 * dt;
    if (tb.offsetY >= 0) {
      world.tileBounces.splice(i, 1);
    }
  }

  // Handle death animation
  if (world.playerDead) {
    world.deathTimer -= dt;
    world.player.vy += 1100 * dt;
    world.player.y += world.player.vy * dt;
    if (world.deathTimer <= 0) {
      return {
        hud: buildHud(world, beat),
        event: world.lives <= 0 ? 'GAME_OVER' : 'RESPAWN',
      };
    }
    return { hud: buildHud(world, beat), event: 'NONE' };
  }

  // Handle goal slide celebration
  if (world.player.goalReached) {
    const p = world.player;
    if (!p.goalSlideDone) {
      p.vx = 0;
      p.x = world.goalX - p.w / 2;
      p.y += 220 * dt;
      p.flagY = Math.min(world.goalBottomY - 34, p.flagY + 220 * dt);
      if (p.y + p.h >= world.goalBottomY) {
        p.y = world.goalBottomY - p.h;
        p.goalSlideDone = true;
        world.levelFinished = true;
        buildSummary(world);
        return { hud: buildHud(world, beat), event: 'LEVEL_CLEAR' };
      }
    }
    return { hud: buildHud(world, beat), event: 'NONE' };
  }

  // Countdown timer
  world.timeLeft = Math.max(0, world.timeLeft - dt);
  if (world.timeLeft <= 0) {
    triggerPlayerDeath(world);
    return { hud: buildHud(world, beat), event: 'NONE' };
  }

  updatePlayer(world, input, beat, dt);
  updateCollectibles(world, beat, dt);
  updateEnemies(world, beat, dt);
  checkGoal(world);
  updateCamera(world, dt);

  return { hud: buildHud(world, beat), event: 'NONE' };
}

function updatePlayer(
  world: GameWorld,
  input: InputState,
  beat: BeatSnapshot,
  dt: number
): void {
  const p = world.player;
  const charDef = getCharacterDef(world.characterId);
  const prog = loadProgress();
  const isSpeedRunner = prog.equippedBadge === 'speed_runner';
  const hasDoubleJumpBadge = prog.equippedBadge === 'double_jumper';

  if (p.invincibleTimer > 0) p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  if (p.singTimer > 0) p.singTimer = Math.max(0, p.singTimer - dt);

  // Blink timer
  p.blinkTimer -= dt;
  if (p.blinkTimer < -0.12) {
    p.blinkTimer = 2.2 + Math.random() * 2.5;
  }

  // Recover squash & stretch smoothly
  p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
  p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

  // Horizontal movement (classic Mario inertia)
  const speedMod = charDef.speedMultiplier * (isSpeedRunner ? 1.25 : 1.0);
  const maxSpeed = (input.run ? 315 : 235) * speedMod;
  const accel = p.onGround ? 1550 : 980;
  const friction = p.onGround ? 1350 : 220;

  if (input.left && !input.right) {
    p.vx = Math.max(-maxSpeed, p.vx - accel * dt);
    p.facing = -1;
  } else if (input.right && !input.left) {
    p.vx = Math.min(maxSpeed, p.vx + accel * dt);
    p.facing = 1;
  } else {
    if (Math.abs(p.vx) <= friction * dt) {
      p.vx = 0;
    } else {
      p.vx -= Math.sign(p.vx) * friction * dt;
    }
  }

  if (p.onGround && Math.abs(p.vx) > 15) {
    p.walkCycle += Math.abs(p.vx) * dt * 0.065;
  } else if (!p.onGround) {
    p.walkCycle = 0;
  }

  // Coyote & Jump Buffer
  if (p.onGround) {
    p.coyoteTimer = 0.095;
    p.canDoubleJump = true;
    p.hasDoubleJumped = false;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }

  if (input.jumpJustPressed) {
    p.jumpBufferTimer = 0.115;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
    const jumpPower = 635 * charDef.jumpMultiplier;
    p.vy = -jumpPower;
    p.onGround = false;
    p.coyoteTimer = 0;
    p.jumpBufferTimer = 0;
    p.isHoldingJump = true;
    p.squashX = 0.8;
    p.squashY = 1.24;

    const onBeat = beat.isOnBeatWindow;
    audioEngine.sfxJump(charDef.voicePitchOffset, onBeat);

    if (onBeat) {
      p.singTimer = 0.25;
      world.rhythmHits += 1;
      world.score += 25;
      spawnParticles(world, p.x + p.w / 2, p.y + p.h, charDef.accentColor, 6, 120, 'note');
      addFloatingText(world, p.x + p.w / 2, p.y - 8, '♪ +25', charDef.accentColor);
    }
  } else if (input.jumpJustPressed && (p.canDoubleJump || hasDoubleJumpBadge) && !p.hasDoubleJumped && !p.onGround) {
    // Gesture Double Jump!
    p.vy = -560 * charDef.jumpMultiplier;
    p.hasDoubleJumped = true;
    p.jumpBufferTimer = 0;
    p.isHoldingJump = true;
    p.squashX = 0.82;
    p.squashY = 1.2;

    audioEngine.sfxJump(charDef.voicePitchOffset + 4, true);
    spawnParticles(world, p.x + p.w / 2, p.y + p.h / 2, charDef.accentColor, 8, 150, 'note');
    addFloatingText(world, p.x + p.w / 2, p.y - 12, '¡Doble Salto!', '#38BDF8');
  }

  if (!input.jump) {
    p.isHoldingJump = false;
  }

  // Variable jump height (cut upward velocity if jump button released early)
  let gravity = 1480 * charDef.gravityMultiplier;
  if (p.vy < 0 && !p.isHoldingJump) {
    gravity *= 2.15;
  }
  p.vy = Math.min(720, p.vy + gravity * dt);

  // Move X & resolve tile collisions
  p.x += p.vx * dt;
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  const maxWorldX = world.widthCols * TILE_SIZE - p.w;
  if (p.x > maxWorldX) {
    p.x = maxWorldX;
    p.vx = 0;
  }
  resolveHorizontalTiles(world, p, beat);

  // Move Y & resolve tile collisions
  const wasOnGround = p.onGround;
  p.y += p.vy * dt;
  p.onGround = false;
  resolveVerticalTiles(world, p, beat);

  if (!wasOnGround && p.onGround) {
    p.squashX = 1.22;
    p.squashY = 0.8;
  }

  // Check rhythm spikes & spring tiles overlapping player
  checkHazardAndSpecialTiles(world, p, beat);

  // Fall into pit
  if (p.y > VIEW_HEIGHT + 40) {
    triggerPlayerDeath(world);
  }

  // Checkpoint flag reach
  if (!world.checkpointReached && p.x >= world.checkpointX) {
    world.checkpointReached = true;
    audioEngine.sfxPowerUp();
    addFloatingText(world, world.checkpointX + 18, world.checkpointY - 20, '¡Bandera de Control!', '#38BDF8');
    spawnParticles(world, world.checkpointX + 18, world.checkpointY, '#38BDF8', 12, 180);
  }
}

function resolveHorizontalTiles(
  world: GameWorld,
  ent: { x: number; y: number; w: number; h: number; vx: number },
  beat: BeatSnapshot
): void {
  const topRow = Math.floor((ent.y + 3) / TILE_SIZE);
  const bottomRow = Math.floor((ent.y + ent.h - 3) / TILE_SIZE);

  if (ent.vx > 0) {
    const rightCol = Math.floor((ent.x + ent.w) / TILE_SIZE);
    for (let r = topRow; r <= bottomRow; r++) {
      const tile = getTileAt(world, rightCol, r);
      if (isTileSolid(tile, beat)) {
        ent.x = rightCol * TILE_SIZE - ent.w;
        ent.vx = 0;
        break;
      }
    }
  } else if (ent.vx < 0) {
    const leftCol = Math.floor(ent.x / TILE_SIZE);
    for (let r = topRow; r <= bottomRow; r++) {
      const tile = getTileAt(world, leftCol, r);
      if (isTileSolid(tile, beat)) {
        ent.x = (leftCol + 1) * TILE_SIZE;
        ent.vx = 0;
        break;
      }
    }
  }
}

function resolveVerticalTiles(
  world: GameWorld,
  p: PlayerState,
  beat: BeatSnapshot
): void {
  const leftCol = Math.floor((p.x + 3) / TILE_SIZE);
  const rightCol = Math.floor((p.x + p.w - 3) / TILE_SIZE);

  if (p.vy >= 0) {
    const bottomRow = Math.floor((p.y + p.h) / TILE_SIZE);
    for (let c = leftCol; c <= rightCol; c++) {
      const tile = getTileAt(world, c, bottomRow);
      if (isTileSolid(tile, beat)) {
        if (tile === 'SPRING') {
          p.y = bottomRow * TILE_SIZE - p.h;
          p.vy = -710;
          p.onGround = false;
          p.squashX = 0.72;
          p.squashY = 1.32;
          audioEngine.sfxSpring();
          world.tileBounces.push({ col: c, row: bottomRow, offsetY: 5, velY: -90 });
          if (beat.isOnBeatWindow) {
            world.rhythmHits += 1;
            world.score += 50;
            addFloatingText(world, p.x + p.w / 2, p.y - 10, '¡BOMBO +50!', '#FACC15');
          }
          return;
        }
        p.y = bottomRow * TILE_SIZE - p.h;
        p.vy = 0;
        p.onGround = true;
        break;
      }
    }
  } else {
    const topRow = Math.floor(p.y / TILE_SIZE);
    let bumped = false;
    for (let c = leftCol; c <= rightCol; c++) {
      const tile = getTileAt(world, c, topRow);
      if (isTileSolid(tile, beat)) {
        p.y = (topRow + 1) * TILE_SIZE;
        p.vy = 0;
        if (!bumped) {
          bumpTile(world, c, topRow, beat);
          bumped = true;
        }
      }
    }
  }
}

function checkHazardAndSpecialTiles(
  world: GameWorld,
  p: PlayerState,
  beat: BeatSnapshot
): void {
  // Beat spikes are active on beat B (beats 2 & 3)
  if (!beat.isBeatB) return;

  const leftCol = Math.floor((p.x + 5) / TILE_SIZE);
  const rightCol = Math.floor((p.x + p.w - 5) / TILE_SIZE);
  const topRow = Math.floor((p.y + 8) / TILE_SIZE);
  const bottomRow = Math.floor((p.y + p.h - 2) / TILE_SIZE);

  for (let r = topRow; r <= bottomRow; r++) {
    for (let c = leftCol; c <= rightCol; c++) {
      if (getTileAt(world, c, r) === 'SPIKE_BEAT') {
        hurtPlayer(world);
        return;
      }
    }
  }
}

function updateCollectibles(
  world: GameWorld,
  beat: BeatSnapshot,
  dt: number
): void {
  const p = world.player;
  for (let i = world.collectibles.length - 1; i >= 0; i--) {
    const item = world.collectibles[i];
    if (item.collected) {
      world.collectibles.splice(i, 1);
      continue;
    }

    if (item.kind === 'pop_note') {
      item.vy += 900 * dt;
      item.y += item.vy * dt;
      item.lifeTimer = (item.lifeTimer ?? 0.4) - dt;
      if (item.lifeTimer <= 0) {
        item.collected = true;
      }
      continue;
    }

    if (item.kind === 'power_speaker') {
      item.vy = Math.min(550, item.vy + 1100 * dt);
      item.x += item.vx * dt;

      // Bounce off walls
      const topRow = Math.floor((item.y + 3) / TILE_SIZE);
      const bottomRow = Math.floor((item.y + item.h - 3) / TILE_SIZE);
      if (item.vx > 0) {
        const rightCol = Math.floor((item.x + item.w) / TILE_SIZE);
        for (let r = topRow; r <= bottomRow; r++) {
          if (isTileSolid(getTileAt(world, rightCol, r), beat)) {
            item.x = rightCol * TILE_SIZE - item.w;
            item.vx = -item.vx;
            break;
          }
        }
      } else {
        const leftCol = Math.floor(item.x / TILE_SIZE);
        for (let r = topRow; r <= bottomRow; r++) {
          if (isTileSolid(getTileAt(world, leftCol, r), beat)) {
            item.x = (leftCol + 1) * TILE_SIZE;
            item.vx = -item.vx;
            break;
          }
        }
      }

      item.y += item.vy * dt;
      if (item.vy >= 0) {
        const bRow = Math.floor((item.y + item.h) / TILE_SIZE);
        const lCol = Math.floor((item.x + 2) / TILE_SIZE);
        const rCol = Math.floor((item.x + item.w - 2) / TILE_SIZE);
        for (let c = lCol; c <= rCol; c++) {
          if (isTileSolid(getTileAt(world, c, bRow), beat)) {
            item.y = bRow * TILE_SIZE - item.h;
            item.vy = 0;
            break;
          }
        }
      }
    }

    // Player pickup AABB
    if (
      p.x < item.x + item.w &&
      p.x + p.w > item.x &&
      p.y < item.y + item.h &&
      p.y + p.h > item.y
    ) {
      item.collected = true;
      if (item.kind === 'note') {
        world.notesCollected += 1;
        world.score += 50;
        p.singTimer = 0.2;
        audioEngine.sfxNote(world.notesCollected, world.level.rootMidi);
        spawnParticles(
          world,
          item.x + item.w / 2,
          item.y + item.h / 2,
          '#FACC15',
          5,
          120,
          'note'
        );
        updateAudioLayers(world);
      } else if (item.kind === 'power_speaker') {
        p.poweredUp = true;
        p.singTimer = 0.4;
        world.score += 500;
        audioEngine.sfxPowerUp();
        spawnParticles(
          world,
          item.x + item.w / 2,
          item.y + item.h / 2,
          '#38BDF8',
          12,
          190
        );
        addFloatingText(world, item.x + 14, item.y - 10, '¡MEGA SPRUNKI!', '#38BDF8');
        updateAudioLayers(world);
      }
    }
  }
}

function updateEnemies(
  world: GameWorld,
  beat: BeatSnapshot,
  dt: number
): void {
  const p = world.player;

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const e = world.enemies[i];
    if (e.beatHopOffset < 0) {
      e.beatHopOffset = Math.min(0, e.beatHopOffset + 28 * dt);
    }

    if (!e.alive) {
      e.squashedTimer -= dt;
      if (e.squashedTimer <= 0) {
        world.enemies.splice(i, 1);
      }
      continue;
    }

    // Activate only when reasonably near camera
    if (e.x > world.cameraX + VIEW_WIDTH + 180 || e.x + e.w < world.cameraX - 240) {
      continue;
    }

    e.vy = Math.min(600, e.vy + 1250 * dt);
    e.x += e.vx * dt;

    // Horizontal wall collision
    const topRow = Math.floor((e.y + 3) / TILE_SIZE);
    const bottomRow = Math.floor((e.y + e.h - 4) / TILE_SIZE);
    let hitWall = false;
    if (e.vx > 0) {
      const rightCol = Math.floor((e.x + e.w) / TILE_SIZE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (isTileSolid(getTileAt(world, rightCol, r), beat)) {
          e.x = rightCol * TILE_SIZE - e.w;
          e.vx = -e.vx;
          e.facing = -1;
          hitWall = true;
          break;
        }
      }
    } else if (e.vx < 0) {
      const leftCol = Math.floor(e.x / TILE_SIZE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (isTileSolid(getTileAt(world, leftCol, r), beat)) {
          e.x = (leftCol + 1) * TILE_SIZE;
          e.vx = -e.vx;
          e.facing = 1;
          hitWall = true;
          break;
        }
      }
    }
    void hitWall;

    e.y += e.vy * dt;
    let onGround = false;
    if (e.vy >= 0) {
      const bRow = Math.floor((e.y + e.h) / TILE_SIZE);
      const lCol = Math.floor((e.x + 3) / TILE_SIZE);
      const rCol = Math.floor((e.x + e.w - 3) / TILE_SIZE);
      for (let c = lCol; c <= rCol; c++) {
        if (isTileSolid(getTileAt(world, c, bRow), beat)) {
          e.y = bRow * TILE_SIZE - e.h;
          e.vy = 0;
          onGround = true;
          break;
        }
      }
    }

    // Turn around at ledges (only for non-moving-shell enemies so Koopas stay on platforms nicely)
    if (onGround && !e.shellMoving && Math.abs(e.vx) > 1) {
      const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const aheadCol = Math.floor(aheadX / TILE_SIZE);
      const belowRow = Math.floor((e.y + e.h + 4) / TILE_SIZE);
      if (
        belowRow < LEVEL_ROWS &&
        !isTileSolid(getTileAt(world, aheadCol, belowRow), beat)
      ) {
        e.vx = -e.vx;
        e.facing = e.vx > 0 ? 1 : -1;
      }
    }

    if (e.y > VIEW_HEIGHT + 60) {
      world.enemies.splice(i, 1);
      continue;
    }

    // Shell hitting other enemies
    if (e.inShell && e.shellMoving) {
      for (const other of world.enemies) {
        if (other.id === e.id || !other.alive) continue;
        if (
          e.x < other.x + other.w &&
          e.x + e.w > other.x &&
          e.y < other.y + other.h &&
          e.y + e.h > other.y
        ) {
          other.alive = false;
          other.squashedTimer = 0.35;
          world.score += 200;
          audioEngine.sfxStomp(true);
          spawnParticles(world, other.x + 15, other.y + 15, '#A855F7', 8, 170);
          addFloatingText(world, other.x + 15, other.y - 8, '+200', '#FACC15');
        }
      }
    }

    // Player-Enemy Collision
    if (
      p.x < e.x + e.w - 2 &&
      p.x + p.w > e.x + 2 &&
      p.y < e.y + e.h &&
      p.y + p.h > e.y + 2
    ) {
      const playerBottom = p.y + p.h;
      const stompThreshold = e.y + e.h * 0.58;
      const isStomp = p.vy > 0 && playerBottom <= stompThreshold + 10;

      if (e.inShell && !e.shellMoving) {
        // Kick stationary shell!
        e.shellMoving = true;
        e.vx = p.x + p.w / 2 < e.x + e.w / 2 ? 330 : -330;
        e.x += e.vx > 0 ? 8 : -8;
        p.vy = isStomp ? -350 : p.vy;
        audioEngine.sfxBump();
        addFloatingText(world, e.x + 15, e.y - 10, '¡DISPARO!', '#38BDF8');
        continue;
      }

      if (isStomp) {
        p.vy = -390;
        p.onGround = false;
        p.combo += 1;
        p.squashX = 1.25;
        p.squashY = 0.78;
        const onBeat = beat.isOnBeatWindow;
        audioEngine.sfxStomp(onBeat);

        if (e.kind === 'koopasynth' && !e.inShell) {
          e.inShell = true;
          e.shellMoving = false;
          e.vx = 0;
          e.h = 24;
          e.y += 10;
          world.score += 100;
          addFloatingText(world, e.x + 15, e.y - 8, '+100', '#38BDF8');
        } else {
          e.alive = false;
          e.squashedTimer = 0.35;
          const pts = (100 + Math.min(p.combo - 1, 4) * 50) * (onBeat ? 2 : 1);
          world.score += pts;
          if (onBeat) {
            world.rhythmHits += 1;
            addFloatingText(world, e.x + 15, e.y - 12, `¡RITMO x2! +${pts}`, '#FACC15');
          } else {
            addFloatingText(world, e.x + 15, e.y - 12, `+${pts}`, '#FFFFFF');
          }
          spawnParticles(world, e.x + 15, e.y + 15, '#A855F7', 8, 160);
        }
      } else {
        hurtPlayer(world);
      }
    }
  }
}

function checkGoal(world: GameWorld): void {
  const p = world.player;
  if (p.goalReached) return;
  if (
    p.x + p.w >= world.goalX - 10 &&
    p.x <= world.goalX + 10 &&
    p.y + p.h >= world.goalTopY
  ) {
    p.goalReached = true;
    p.flagY = Math.max(world.goalTopY + 12, Math.min(p.y, world.goalBottomY - 36));
    audioEngine.stopMusic();
    audioEngine.sfxLevelClear();
    spawnParticles(world, world.goalX, p.y, '#FACC15', 16, 220, 'note');
  }
}

function buildSummary(world: GameWorld): void {
  const heightRatio = Math.max(
    0,
    Math.min(1, (world.goalBottomY - world.player.flagY) / Math.max(1, world.goalBottomY - world.goalTopY))
  );
  const flagBonus = Math.round(200 + heightRatio * 800);
  const timeBonus = Math.floor(world.timeLeft) * 10;
  const rhythmBonus = world.rhythmHits * 40;
  const noteBonus = world.notesCollected * 25;
  const totalAdd = flagBonus + timeBonus;
  world.score += totalAdd;

  const noteRatio = world.notesCollected / Math.max(1, world.level.totalNotes);
  let stars: 1 | 2 | 3 = 1;
  if (noteRatio >= 0.45 || world.rhythmHits >= 4) stars = 2;
  if (noteRatio >= 0.72 && (world.rhythmHits >= 6 || world.player.poweredUp)) stars = 3;

  world.summary = {
    levelId: world.level.id,
    levelTitle: world.level.title,
    baseScore: world.score - totalAdd,
    noteBonus,
    rhythmBonus,
    timeBonus,
    flagBonus,
    totalScore: world.score,
    notesCollected: world.notesCollected,
    totalNotes: world.level.totalNotes,
    rhythmHits: world.rhythmHits,
    stars,
  };
}

function updateCamera(world: GameWorld, dt: number): void {
  const targetX = world.player.x - VIEW_WIDTH * 0.36;
  const maxCam = world.widthCols * TILE_SIZE - VIEW_WIDTH;
  const clamped = Math.max(0, Math.min(maxCam, targetX));
  world.cameraX += (clamped - world.cameraX) * Math.min(1, dt * 8.5);
}

function buildHud(world: GameWorld, beat: BeatSnapshot): HudSnapshot {
  return {
    score: world.score,
    notes: world.notesCollected,
    totalNotes: world.level.totalNotes,
    lives: world.lives,
    timeLeft: Math.ceil(world.timeLeft),
    combo: world.player.combo,
    rhythmHits: world.rhythmHits,
    poweredUp: world.player.poweredUp,
    beatIndex: beat.beatIndex,
    beatPhase: beat.beatPhase,
    bpm: world.level.bpm,
    audioLayers: getUnlockedLayers(world),
  };
}
