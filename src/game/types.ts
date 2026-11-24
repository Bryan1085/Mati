export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type CharacterId = string;

export interface CharacterDef {
  id: CharacterId;
  name: string;
  instrument: string;
  traitLabel: string;
  bodyColor: string;
  bodyShadow: string;
  accentColor: string;
  eyeBg: string;
  speedMultiplier: number;
  jumpMultiplier: number;
  gravityMultiplier: number;
  voicePitchOffset: number;
  accessory?: 'none' | 'headphones' | 'crown' | 'cap' | 'glasses' | 'horns' | 'bow' | 'cape';
  isCustom?: boolean;
}

export type TileKind =
  | 'EMPTY'
  | 'GROUND'
  | 'GROUND_TOP'
  | 'BRICK'
  | 'QUESTION_COIN'
  | 'QUESTION_POWER'
  | 'USED_BLOCK'
  | 'PIPE_TL'
  | 'PIPE_TR'
  | 'PIPE_BL'
  | 'PIPE_BR'
  | 'BEAT_A' // Solid on beats 0 & 1 (1-2)
  | 'BEAT_B' // Solid on beats 2 & 3 (3-4)
  | 'SPRING'
  | 'SPIKE_BEAT' // Active on beat 2 & 3, safe on 0 & 1
  | 'GOAL_POLE'
  | 'GOAL_TOP';

export interface TileBounce {
  col: number;
  row: number;
  offsetY: number;
  velY: number;
}

export type EnemyKind = 'goombeat' | 'koopasynth';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  alive: boolean;
  squashedTimer: number;
  inShell: boolean;
  shellMoving: boolean;
  beatHopOffset: number;
}

export type CollectibleKind = 'note' | 'power_speaker' | 'pop_note';

export interface Collectible {
  id: number;
  kind: CollectibleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  collected: boolean;
  bobPhase: number;
  lifeTimer?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: boolean;
  shape?: 'square' | 'circle' | 'note';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isHoldingJump: boolean;
  poweredUp: boolean;
  invincibleTimer: number;
  squashX: number;
  squashY: number;
  walkCycle: number;
  blinkTimer: number;
  singTimer: number;
  combo: number;
  goalReached: boolean;
  goalSlideDone: boolean;
  flagY: number;
  canDoubleJump: boolean;
  hasDoubleJumped: boolean;
}

export interface LevelTheme {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  groundFill: string;
  groundTop: string;
  brickFill: string;
  brickMortar: string;
  pipeMain: string;
  pipeHighlight: string;
  pipeShadow: string;
  beatAColor: string;
  beatBColor: string;
  isDark: boolean;
}

export interface LevelDef {
  id: number;
  title: string;
  subtitle: string;
  bpm: number;
  timeLimit: number;
  rootMidi: number;
  scaleIntervals: number[];
  theme: LevelTheme;
  rows: string[];
  totalNotes: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  run: boolean;
}

export interface BeatSnapshot {
  beatIndex: number; // 0, 1, 2, 3 repeating
  totalBeats: number;
  beatPhase: number; // 0.0 to 1.0 inside current quarter-note
  isBeatA: boolean; // beats 0 and 1
  isBeatB: boolean; // beats 2 and 3
  isOnBeatWindow: boolean; // true near beat start/end
  pulse: number; // 1.0 right on beat, decays smoothly to 0
}

export interface HudSnapshot {
  score: number;
  notes: number;
  totalNotes: number;
  lives: number;
  timeLeft: number;
  combo: number;
  rhythmHits: number;
  poweredUp: boolean;
  beatIndex: number;
  beatPhase: number;
  bpm: number;
  audioLayers: number;
}

export interface LevelSummary {
  levelId: number;
  levelTitle: string;
  baseScore: number;
  noteBonus: number;
  rhythmBonus: number;
  timeBonus: number;
  flagBonus: number;
  totalScore: number;
  notesCollected: number;
  totalNotes: number;
  rhythmHits: number;
  stars: 1 | 2 | 3;
}
