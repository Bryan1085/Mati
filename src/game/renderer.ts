import { audioEngine } from './audio';
import { getCharacterDef } from './characters';
import { GameWorld } from './engine';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH, validateLevelData } from './levels';
import { BeatSnapshot, CharacterId, Enemy, TileKind } from './types';

export interface SprunkiDrawOptions {
  facing: -1 | 1;
  walkCycle: number;
  isJumping: boolean;
  isBlinking: boolean;
  isSinging: boolean;
  poweredUp: boolean;
  squashX: number;
  squashY: number;
  beatPulse: number;
  invincibleFlash?: boolean;
}

export function drawSprunkiCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  charId: CharacterId,
  opts: SprunkiDrawOptions
): void {
  if (opts.invincibleFlash) return;
  const char = getCharacterDef(charId);
  const scale = opts.poweredUp ? 1.15 : 1.0;

  ctx.save();
  const cx = x + w / 2;
  const bottomY = y + h;
  ctx.translate(cx, bottomY);
  ctx.scale(opts.squashX * scale, opts.squashY * scale);

  // Subtle bounce on beat when idle
  const idleBob = Math.abs(opts.walkCycle) < 0.01 && !opts.isJumping ? opts.beatPulse * 2 : 0;
  ctx.translate(0, idleBob);

  // Powered-up golden aura ring
  if (opts.poweredUp) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -h / 2, w * 0.85 + opts.beatPulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Little Mario-style animated feet
  const footSwing = opts.isJumping ? 5 : Math.sin(opts.walkCycle * 2.2) * 5;
  ctx.fillStyle = '#1E293B';
  // Back foot
  ctx.beginPath();
  ctx.ellipse(-5 - footSwing * 0.6, -3, 5.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Front foot
  ctx.beginPath();
  ctx.ellipse(5 + footSwing * 0.6, -3, 5.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sprunki trapezoidal/cylindrical torso
  ctx.fillStyle = char.bodyShadow;
  ctx.beginPath();
  ctx.moveTo(-7, -17);
  ctx.lineTo(7, -17);
  ctx.lineTo(10, -4);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = char.bodyColor;
  ctx.beginPath();
  ctx.moveTo(-6, -17);
  ctx.lineTo(6, -17);
  ctx.lineTo(8.5, -5);
  ctx.lineTo(-8.5, -5);
  ctx.closePath();
  ctx.fill();

  // Head accessories and custom skin features
  const headCenterY = -24;
  const headR = 11.5;
  const acc = char.accessory || (charId === 'oren' ? 'headphones' : charId === 'clukr' ? 'cap' : charId === 'pinky' ? 'bow' : charId === 'raddy' ? 'horns' : 'none');

  if (acc === 'horns') {
    ctx.fillStyle = char.bodyShadow;
    const angles = [-0.65, -0.32, 0, 0.32, 0.65];
    for (const ang of angles) {
      ctx.save();
      ctx.translate(0, headCenterY);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-2.5, -headR + 1);
      ctx.lineTo(0, -headR - 7);
      ctx.lineTo(2.5, -headR + 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (acc === 'bow') {
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.ellipse(-5.5, headCenterY - headR - 2, 5.5, 3.5, -0.35, 0, Math.PI * 2);
    ctx.ellipse(5.5, headCenterY - headR - 2, 5.5, 3.5, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = char.accentColor;
    ctx.beginPath();
    ctx.arc(0, headCenterY - headR - 2, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (acc === 'crown') {
    ctx.fillStyle = char.accentColor || '#FACC15';
    ctx.beginPath();
    ctx.moveTo(-7, headCenterY - headR);
    ctx.lineTo(-8, headCenterY - headR - 7);
    ctx.lineTo(-3, headCenterY - headR - 3);
    ctx.lineTo(0, headCenterY - headR - 8);
    ctx.lineTo(3, headCenterY - headR - 3);
    ctx.lineTo(8, headCenterY - headR - 7);
    ctx.lineTo(7, headCenterY - headR);
    ctx.closePath();
    ctx.fill();
  }

  // Round Sprunki Head
  ctx.fillStyle = char.bodyShadow;
  ctx.beginPath();
  ctx.arc(0, headCenterY, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = char.bodyColor;
  ctx.beginPath();
  ctx.arc(-0.8, headCenterY - 0.8, headR - 1, 0, Math.PI * 2);
  ctx.fill();

  // Top accessories
  if (charId === 'clukr') {
    ctx.fillStyle = '#64748B';
    ctx.fillRect(-1.5, headCenterY - headR - 5, 3, 6);
    ctx.fillStyle = char.accentColor || '#FACC15';
    ctx.beginPath();
    ctx.ellipse(0, headCenterY - headR - 5, 11, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (acc === 'cap') {
    ctx.fillStyle = char.accentColor || '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, headCenterY - 3, headR - 0.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-headR - 2, headCenterY - 4, headR * 2 + 4, 3);
  } else if (acc === 'headphones' || charId === 'oren') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, headCenterY, headR + 1.2, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    ctx.fillStyle = char.accentColor || '#FACC15';
    ctx.beginPath();
    ctx.roundRect(-headR - 2.5, headCenterY - 4, 4, 8, 2);
    ctx.roundRect(headR - 1.5, headCenterY - 4, 4, 8, 2);
    ctx.fill();
  }

  // Eyes shifted slightly toward facing direction
  const lookX = opts.facing * 2.2;
  const eyeY = headCenterY - 1.5;

  if (opts.isBlinking) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6.5 + lookX, eyeY);
    ctx.lineTo(-2 + lookX, eyeY);
    ctx.moveTo(2 + lookX, eyeY);
    ctx.lineTo(6.5 + lookX, eyeY);
    ctx.stroke();
  } else {
    // Expressive large Sprunki eyes
    ctx.fillStyle = char.eyeBg;
    ctx.beginPath();
    ctx.ellipse(-4.2 + lookX, eyeY, 3.3, 3.8, 0, 0, Math.PI * 2);
    ctx.ellipse(4.2 + lookX, eyeY, 3.3, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-4.2 + lookX + opts.facing * 0.9, eyeY, 1.8, 0, Math.PI * 2);
    ctx.arc(4.2 + lookX + opts.facing * 0.9, eyeY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-4.8 + lookX + opts.facing * 0.9, eyeY - 1, 0.7, 0, Math.PI * 2);
    ctx.arc(3.6 + lookX + opts.facing * 0.9, eyeY - 1, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth (singing open O on beat/jump or friendly smile)
  const mouthY = headCenterY + 5.2;
  if (opts.isSinging || opts.beatPulse > 0.72) {
    ctx.fillStyle = '#450A0A';
    ctx.beginPath();
    ctx.ellipse(lookX * 0.8, mouthY, 2.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lookX * 0.8, mouthY - 1, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  world: GameWorld
): void {
  const isValidLevel = validateLevelData(world.level);
  const beat = audioEngine.getBeatSnapshot(world.elapsedSec);
  const { theme } = world.level;

  ctx.save();

  // Subtle screen shake on impact
  if (world.shakeTimer > 0) {
    const mag = 4 * (world.shakeTimer / 0.2);
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
  }

  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  skyGrad.addColorStop(0, theme.skyTop);
  skyGrad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (!isValidLevel) {
    ctx.fillStyle = '#EF4444';
    ctx.font = '700 18px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Advertencia: Datos de nivel vacíos o inválidos', VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
    ctx.restore();
    return;
  }

  // 2. Parallax Clouds / Stars & Equalizer Hills pulsing to the beat!
  drawParallaxBackground(ctx, world, beat);

  ctx.save();
  ctx.translate(-Math.round(world.cameraX), 0);

  // 3. Draw Visible Tiles
  const startCol = Math.max(0, Math.floor(world.cameraX / TILE_SIZE) - 1);
  const endCol = Math.min(
    world.widthCols - 1,
    Math.ceil((world.cameraX + VIEW_WIDTH) / TILE_SIZE) + 1
  );

  for (let r = 0; r < world.heightRows; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tile = world.grid[r][c];
      if (tile === 'EMPTY') continue;
      const bounce = world.tileBounces.find((b) => b.col === c && b.row === r);
      const offsetY = bounce ? bounce.offsetY : 0;
      drawTile(ctx, world, tile, c * TILE_SIZE, r * TILE_SIZE + offsetY, beat);
    }
  }

  // 4. Draw Flag on Goal Pole
  drawGoalFlag(ctx, world, beat);

  // 4b. Draw Checkpoint Flag at halfway point
  if (world.checkpointX) {
    const cpx = world.checkpointX;
    const cpy = world.checkpointY - TILE_SIZE * 2;
    ctx.save();
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(cpx + TILE_SIZE / 2 - 2, cpy, 4, TILE_SIZE * 2);

    ctx.fillStyle = world.checkpointReached ? '#38BDF8' : '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(cpx + TILE_SIZE / 2 + 2, cpy + 4);
    ctx.lineTo(cpx + TILE_SIZE / 2 + 30, cpy + 15);
    ctx.lineTo(cpx + TILE_SIZE / 2 + 2, cpy + 26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px Fredoka, sans-serif';
    ctx.fillText('⚑', cpx + TILE_SIZE / 2 + 9, cpy + 18);
    ctx.restore();
  }

  // 5. Draw Collectibles
  for (const item of world.collectibles) {
    if (item.collected) continue;
    if (item.kind === 'note' || item.kind === 'pop_note') {
      const bob =
        item.kind === 'note'
          ? Math.sin(world.elapsedSec * 4.5 + item.bobPhase) * 3 + beat.pulse * 2
          : 0;
      drawMusicalNote(ctx, item.x + item.w / 2, item.y + item.h / 2 + bob, 11);
    } else if (item.kind === 'power_speaker') {
      drawPowerSpeaker(ctx, item.x, item.y, item.w, item.h, beat);
    }
  }

  // 6. Draw Enemies
  for (const enemy of world.enemies) {
    if (enemy.x + enemy.w < world.cameraX - 40 || enemy.x > world.cameraX + VIEW_WIDTH + 40) {
      continue;
    }
    drawEnemy(ctx, enemy, beat);
  }

  // 7. Draw Player Sprunki
  const p = world.player;
  const invFlash = p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 18) % 2 === 0;
  drawSprunkiCharacter(ctx, p.x, p.y, p.w, p.h, world.characterId, {
    facing: p.facing,
    walkCycle: p.walkCycle,
    isJumping: !p.onGround,
    isBlinking: p.blinkTimer < 0,
    isSinging: p.singTimer > 0,
    poweredUp: p.poweredUp,
    squashX: p.squashX,
    squashY: p.squashY,
    beatPulse: beat.pulse,
    invincibleFlash: invFlash,
  });

  // 8. Particles & Floating Texts
  for (const pt of world.particles) {
    ctx.save();
    ctx.globalAlpha = pt.alpha;
    ctx.fillStyle = pt.color;
    if (pt.shape === 'note') {
      ctx.font = 'bold 14px Fredoka, sans-serif';
      ctx.fillText('♪', pt.x - 4, pt.y + 4);
    } else if (pt.shape === 'square') {
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const ft of world.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.font = '700 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

function drawParallaxBackground(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  beat: BeatSnapshot
): void {
  const { theme } = world.level;

  // Stars or clouds
  if (theme.isDark) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 173 - world.cameraX * 0.12) % VIEW_WIDTH + VIEW_WIDTH) % VIEW_WIDTH;
      const sy = 36 + ((i * 67) % 210);
      const r = (i % 3 === 0 ? 2.2 : 1.3) + (i % 2 === 0 ? beat.pulse * 0.8 : 0);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 230 - world.cameraX * 0.18) % (VIEW_WIDTH + 160) + VIEW_WIDTH + 160) % (VIEW_WIDTH + 160) - 80;
      const cy = 58 + (i % 3) * 44;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 18, cy - 8, 24, 0, Math.PI * 2);
      ctx.arc(cx + 38, cy, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Far equalizer / musical hills pulsing gently to the beat
  ctx.fillStyle = theme.hillFar;
  const barWidth = 48;
  const numBars = Math.ceil(VIEW_WIDTH / barWidth) + 2;
  const scrollOffset = (world.cameraX * 0.22) % barWidth;
  for (let i = 0; i < numBars; i++) {
    const worldIdx = Math.floor((world.cameraX * 0.22) / barWidth) + i;
    const baseH = 95 + Math.sin(worldIdx * 0.9) * 45 + Math.cos(worldIdx * 0.45) * 25;
    const beatBoost = ((worldIdx + beat.beatIndex) % 2 === 0 ? 12 : 4) * beat.pulse;
    const bx = i * barWidth - scrollOffset;
    const h = baseH + beatBoost;
    ctx.beginPath();
    ctx.roundRect(bx + 2, VIEW_HEIGHT - h, barWidth - 4, h, [14, 14, 0, 0]);
    ctx.fill();
  }

  // Near rolling hills
  ctx.fillStyle = theme.hillNear;
  const hillSpacing = 260;
  const hillScroll = (world.cameraX * 0.4) % hillSpacing;
  for (let i = -1; i < 6; i++) {
    const hx = i * hillSpacing - hillScroll;
    ctx.beginPath();
    ctx.ellipse(hx + 120, VIEW_HEIGHT - 20, 145, 78 + beat.pulse * 6, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  tile: TileKind,
  x: number,
  y: number,
  beat: BeatSnapshot
): void {
  const { theme } = world.level;
  const s = TILE_SIZE;

  switch (tile) {
    case 'GROUND':
      ctx.fillStyle = theme.groundFill;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + 4, y + 6, 8, 6);
      ctx.fillRect(x + 20, y + 18, 10, 8);
      break;

    case 'GROUND_TOP':
      ctx.fillStyle = theme.groundFill;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = theme.groundTop;
      ctx.fillRect(x, y, s, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x, y, s, 3);
      break;

    case 'BRICK':
      ctx.fillStyle = theme.brickFill;
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = theme.brickMortar;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      ctx.beginPath();
      ctx.moveTo(x, y + s / 2);
      ctx.lineTo(x + s, y + s / 2);
      ctx.moveTo(x + s / 2, y);
      ctx.lineTo(x + s / 2, y + s / 2);
      ctx.moveTo(x + s / 4, y + s / 2);
      ctx.lineTo(x + s / 4, y + s);
      ctx.moveTo(x + (s * 3) / 4, y + s / 2);
      ctx.lineTo(x + (s * 3) / 4, y + s);
      ctx.stroke();
      break;

    case 'QUESTION_COIN':
    case 'QUESTION_POWER': {
      const pulse = beat.pulse * 2;
      ctx.fillStyle = tile === 'QUESTION_POWER' ? '#38BDF8' : '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1 - pulse * 0.5, s - 2, s - 2, 5);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFBEB';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tile === 'QUESTION_POWER' ? '♫' : '?', x + s / 2, y + s / 2 + 1 - pulse * 0.5);
      break;
    }

    case 'USED_BLOCK':
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, s - 2, s - 2, 4);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'PIPE_TL':
    case 'PIPE_TR': {
      const isLeft = tile === 'PIPE_TL';
      ctx.fillStyle = theme.pipeMain;
      ctx.fillRect(x + (isLeft ? -2 : 0), y, s + 2, s);
      ctx.fillStyle = theme.pipeHighlight;
      if (isLeft) ctx.fillRect(x + 3, y + 2, 7, s - 4);
      ctx.fillStyle = theme.pipeShadow;
      if (!isLeft) ctx.fillRect(x + s - 8, y + 2, 8, s - 4);
      ctx.strokeStyle = theme.pipeShadow;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + (isLeft ? -2 : 0), y + 1, s + 2, 14);
      break;
    }

    case 'PIPE_BL':
    case 'PIPE_BR': {
      const isLeft = tile === 'PIPE_BL';
      ctx.fillStyle = theme.pipeMain;
      ctx.fillRect(x + (isLeft ? 2 : 0), y, s - 2, s);
      ctx.fillStyle = theme.pipeHighlight;
      if (isLeft) ctx.fillRect(x + 6, y, 6, s);
      ctx.fillStyle = theme.pipeShadow;
      if (!isLeft) ctx.fillRect(x + s - 8, y, 6, s);
      break;
    }

    case 'BEAT_A':
    case 'BEAT_B': {
      const isA = tile === 'BEAT_A';
      const active = isA ? beat.isBeatA : beat.isBeatB;
      const color = isA ? theme.beatAColor : theme.beatBColor;
      ctx.save();
      if (active) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, 6);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Beat progress indicator bar on top
        const remaining = isA
          ? (beat.beatIndex === 0 ? 1 - beat.beatPhase * 0.5 : 0.5 - beat.beatPhase * 0.5)
          : (beat.beatIndex === 2 ? 1 - beat.beatPhase * 0.5 : 0.5 - beat.beatPhase * 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x + 5, y + 5, (s - 10) * Math.max(0.1, remaining), 4);
      } else {
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
      }
      ctx.fillStyle = active ? '#0F172A' : color;
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isA ? '1·2' : '3·4', x + s / 2, y + s / 2 + 3);
      ctx.restore();
      break;
    }

    case 'SPRING':
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 4, y + s - 8, s - 8, 8);
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + s - 18 - beat.pulse * 3, s - 4, 10, 4);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + 6, y + s - 16 - beat.pulse * 3, s - 12, 3);
      break;

    case 'SPIKE_BEAT': {
      const active = beat.isBeatB;
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 2, y + s - 6, s - 4, 6);
      if (active) {
        ctx.fillStyle = '#F43F5E';
        for (let i = 0; i < 3; i++) {
          const sx = x + 4 + i * 10;
          ctx.beginPath();
          ctx.moveTo(sx, y + s - 6);
          ctx.lineTo(sx + 5, y + 10);
          ctx.lineTo(sx + 10, y + s - 6);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Warning nubs on beat A before popping out
        ctx.fillStyle = beat.beatIndex === 1 ? '#FB7185' : '#64748B';
        for (let i = 0; i < 3; i++) {
          const sx = x + 4 + i * 10;
          ctx.beginPath();
          ctx.moveTo(sx, y + s - 6);
          ctx.lineTo(sx + 5, y + s - 12);
          ctx.lineTo(sx + 10, y + s - 6);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }

    case 'GOAL_POLE':
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(x + s / 2 - 3, y, 6, s);
      break;

    case 'GOAL_TOP':
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(x + s / 2 - 3, y + 12, 6, s - 12);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(x + s / 2, y + 12, 8 + beat.pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawGoalFlag(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  beat: BeatSnapshot
): void {
  const fx = world.goalX;
  const fy = world.player.goalReached ? world.player.flagY : world.goalTopY + 18;
  ctx.save();
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.moveTo(fx - 3, fy);
  ctx.lineTo(fx - 38, fy + 13 + Math.sin(world.elapsedSec * 5) * 2);
  ctx.lineTo(fx - 3, fy + 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 13px Fredoka, sans-serif';
  ctx.fillText('♪', fx - 22, fy + 17 + beat.pulse);
  ctx.restore();
}

function drawMusicalNote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
): void {
  ctx.save();
  // Outer golden disc
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner eighth-note symbol
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.ellipse(cx - 2, cy + 3, 3.2, 2.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx + 0.3, cy - 6, 2, 9);
  ctx.beginPath();
  ctx.moveTo(cx + 2.3, cy - 6);
  ctx.quadraticCurveTo(cx + 6.5, cy - 4, cx + 5.5, cy - 0.5);
  ctx.lineTo(cx + 2.3, cy - 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPowerSpeaker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  beat: BeatSnapshot
): void {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pulse = beat.pulse * 2.5;
  ctx.fillStyle = '#0EA5E9';
  ctx.beginPath();
  ctx.roundRect(x - pulse * 0.3, y - pulse * 0.3, w + pulse * 0.6, h + pulse * 0.6, 7);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 3.2 + beat.pulse * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  beat: BeatSnapshot
): void {
  ctx.save();
  const cx = enemy.x + enemy.w / 2;
  const bottomY = enemy.y + enemy.h + enemy.beatHopOffset;
  ctx.translate(cx, bottomY);

  if (!enemy.alive) {
    ctx.scale(1.25, 0.35);
  }

  if (enemy.kind === 'goombeat') {
    // Dark corrupted Sprunki-beat enemy (purple/slate with grumpy eyes)
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.ellipse(-6, -2.5, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -2.5, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4C1D95';
    ctx.beginPath();
    ctx.roundRect(-13, -27, 26, 23, [12, 12, 6, 6]);
    ctx.fill();
    ctx.strokeStyle = '#2E1065';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing angry eyes
    ctx.fillStyle = '#F43F5E';
    ctx.beginPath();
    ctx.arc(-5, -16, 2.8, 0, Math.PI * 2);
    ctx.arc(5, -16, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Angry brows
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-9, -20);
    ctx.lineTo(-2, -17.5);
    ctx.moveTo(9, -20);
    ctx.lineTo(2, -17.5);
    ctx.stroke();
  } else {
    // Koopa-Synth (vinyl/speaker shell enemy)
    if (enemy.inShell) {
      ctx.fillStyle = '#0D9488';
      ctx.beginPath();
      ctx.ellipse(0, -11, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#CCFBF1';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, -11, 4.5 + beat.pulse, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Feet
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.ellipse(-5, -2.5, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.ellipse(5, -2.5, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shell
      ctx.fillStyle = '#0D9488';
      ctx.beginPath();
      ctx.ellipse(-enemy.facing * 2, -14, 11, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#134E4A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Head
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(enemy.facing * 7, -23, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(enemy.facing * 9.5, -24, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
