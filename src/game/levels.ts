import { Collectible, Enemy, LevelDef, TileKind } from './types';

export const TILE_SIZE = 36;
export const VIEW_WIDTH = 540;
export const VIEW_HEIGHT = 960;
export const LEVEL_ROWS = 26;

// Legend:
// . = EMPTY
// = = GROUND_TOP
// # = GROUND
// B = BRICK
// ? = QUESTION_COIN
// ! = QUESTION_POWER
// C = NOTE (Collectible)
// A = BEAT_A (Solid beats 1-2)
// D = BEAT_B (Solid beats 3-4)
// ^ = SPRING
// S = SPIKE_BEAT
// ( = PIPE_TL, ) = PIPE_TR
// [ = PIPE_BL, ] = PIPE_BR
// T = GOAL_TOP, F = GOAL_POLE
// P = Player spawn
// g = Goom-Beat enemy
// k = Koopa-Synth enemy

const emptyRow = '......................................................................................................................................................................';

const LEVEL_BASE_ROWS = [
  emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow,
  '.........................................C.C.........................................................C.C.C.............................................T..............',
  '.....................!...................BBB....................C.C.C...............................BBBBBBB..........................................F..............',
  '...............................................................AAAAAAA...............................................................................F..............',
  '.....................................................................................................................C..C............................F..............',
  '...............C.C...........................................................................B?B....................AAAA............................F..............',
  '............B?B?B............()..........().............().............C.C.C..........()....................().................====...............F..............',
  '.............................[]..........[].............[]............DDDDDDD.........[]....................[]................=====...............F..............',
  '........P........g...........[]....g.....[]...g...k.....[]............................[].....g......k.......[]......g........======...............F..............',
  '=============================[]==========[]=============[]======...===========...=====[]====================[]================#####===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
  '#############################[]##########[]#############[]######...###########...#####[]####################[]#####################===============##............',
];

const LEVEL_HARD_ROWS = [
  emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow,
  '...............................................C.C.C......................................................C.C.C..................................T..................',
  '.........................!....................BBBBBBB........S.S.S........C.C.C............................BBBBBBB................................F..................',
  '............................................................AAAAAAA............................................................................F..................',
  '...................C.C.......................................................................................................C..C................F..................',
  '................B?B?B........................................................................B?B..........................AAAAA................F..................',
  '................................()........()........()...............C.C.C.............().....................()...................====..........F..................',
  '................................[]........[]........[]..............DDDDDDD............[].....................[]...................=====..........F..................',
  '........P.........g......k......[]...g....[]...k....[]...g.............................[].......g.......k.....[].....g.......k...======..........F..................',
  '================================[]========[]========[]===================..S.S..==============================[]===..S.S..========######==========##..................',
  '################----------------[]########[]########[]-------------------..####.------------------------------[]###..####.--------------==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
  '################################[]########[]########[]###################..####.##############################[]###..####.##############==========##..................',
];

function normalizeRows(raw: string[]): string[] {
  const maxLen = Math.max(...raw.map((r) => r.length));
  return raw.map((r) => r.padEnd(maxLen, '.'));
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: 'Pradera del Compás',
    subtitle: 'Ritmo Alegre · 105 BPM',
    bpm: 105,
    timeLimit: 180,
    rootMidi: 48,
    scaleIntervals: [0, 2, 4, 7, 9, 12],
    theme: {
      skyTop: '#38BDF8',
      skyBottom: '#BAE6FD',
      hillFar: '#7DD3FC',
      hillNear: '#4ADE80',
      groundFill: '#92400E',
      groundTop: '#22C55E',
      brickFill: '#D97706',
      brickMortar: '#78350F',
      pipeMain: '#16A34A',
      pipeHighlight: '#4ADE80',
      pipeShadow: '#14532D',
      beatAColor: '#F59E0B',
      beatBColor: '#06B6D4',
      isDark: false,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 2,
    title: 'Volcán Magma Ritmo',
    subtitle: 'Fuego y Magma · 120 BPM',
    bpm: 120,
    timeLimit: 170,
    rootMidi: 42,
    scaleIntervals: [0, 1, 3, 6, 8, 10],
    theme: {
      skyTop: '#180505',
      skyBottom: '#450A0A',
      hillFar: '#7C2D12',
      hillNear: '#9A3412',
      groundFill: '#7C2D12',
      groundTop: '#EF4444',
      brickFill: '#991B1B',
      brickMortar: '#450A0A',
      pipeMain: '#C2410C',
      pipeHighlight: '#FB923C',
      pipeShadow: '#7C2D12',
      beatAColor: '#F59E0B',
      beatBColor: '#DC2626',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 3,
    title: 'Caverna Subterránea',
    subtitle: 'Groove Oscuro · 124 BPM',
    bpm: 124,
    timeLimit: 165,
    rootMidi: 45,
    scaleIntervals: [0, 3, 5, 7, 10, 12],
    theme: {
      skyTop: '#0F172A',
      skyBottom: '#1E1B4B',
      hillFar: '#312E81',
      hillNear: '#1E293B',
      groundFill: '#334155',
      groundTop: '#38BDF8',
      brickFill: '#475569',
      brickMortar: '#0F172A',
      pipeMain: '#0D9488',
      pipeHighlight: '#2DD4BF',
      pipeShadow: '#134E4A',
      beatAColor: '#F43F5E',
      beatBColor: '#38BDF8',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 4,
    title: 'Cielo Metrónomo',
    subtitle: 'Atardecer Synth · 130 BPM',
    bpm: 130,
    timeLimit: 160,
    rootMidi: 50,
    scaleIntervals: [0, 2, 4, 7, 9, 12],
    theme: {
      skyTop: '#311042',
      skyBottom: '#F97316',
      hillFar: '#7C2D12',
      hillNear: '#4C1D95',
      groundFill: '#4C1D95',
      groundTop: '#FACC15',
      brickFill: '#BE185D',
      brickMortar: '#500724',
      pipeMain: '#EAB308',
      pipeHighlight: '#FEF08A',
      pipeShadow: '#713F12',
      beatAColor: '#FACC15',
      beatBColor: '#EC4899',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 5,
    title: 'Fábrica de Baterías',
    subtitle: 'Engranajes y Pulsos · 134 BPM',
    bpm: 134,
    timeLimit: 155,
    rootMidi: 44,
    scaleIntervals: [0, 2, 5, 7, 10],
    theme: {
      skyTop: '#1E293B',
      skyBottom: '#334155',
      hillFar: '#475569',
      hillNear: '#64748B',
      groundFill: '#334155',
      groundTop: '#94A3B8',
      brickFill: '#475569',
      brickMortar: '#0F172A',
      pipeMain: '#64748B',
      pipeHighlight: '#CBD5E1',
      pipeShadow: '#334155',
      beatAColor: '#38BDF8',
      beatBColor: '#F59E0B',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 6,
    title: 'Templo Electro',
    subtitle: 'Neón Rítmico · 138 BPM',
    bpm: 138,
    timeLimit: 150,
    rootMidi: 52,
    scaleIntervals: [0, 3, 6, 8, 10],
    theme: {
      skyTop: '#09090B',
      skyBottom: '#18181B',
      hillFar: '#27272A',
      hillNear: '#3F3F46',
      groundFill: '#27272A',
      groundTop: '#A855F7',
      brickFill: '#52525B',
      brickMortar: '#09090B',
      pipeMain: '#8B5CF6',
      pipeHighlight: '#C4B5FD',
      pipeShadow: '#5B21B6',
      beatAColor: '#A855F7',
      beatBColor: '#06B6D4',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 7,
    title: 'Desierto Melódico',
    subtitle: 'Dunas Ardientes · 142 BPM',
    bpm: 142,
    timeLimit: 145,
    rootMidi: 47,
    scaleIntervals: [0, 2, 4, 7, 11],
    theme: {
      skyTop: '#78350F',
      skyBottom: '#B45309',
      hillFar: '#D97706',
      hillNear: '#F59E0B',
      groundFill: '#78350F',
      groundTop: '#FBBF24',
      brickFill: '#92400E',
      brickMortar: '#451A03',
      pipeMain: '#D97706',
      pipeHighlight: '#FDE68A',
      pipeShadow: '#B45309',
      beatAColor: '#F59E0B',
      beatBColor: '#EC4899',
      isDark: false,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 8,
    title: 'Galaxia Sprunki',
    subtitle: 'Baja Gravedad Estelar · 146 BPM',
    bpm: 146,
    timeLimit: 140,
    rootMidi: 55,
    scaleIntervals: [0, 2, 5, 7, 9],
    theme: {
      skyTop: '#030712',
      skyBottom: '#172554',
      hillFar: '#1E3A8A',
      hillNear: '#3B82F6',
      groundFill: '#1E293B',
      groundTop: '#60A5FA',
      brickFill: '#1E3A8A',
      brickMortar: '#0F172A',
      pipeMain: '#3B82F6',
      pipeHighlight: '#93C5FD',
      pipeShadow: '#1D4ED8',
      beatAColor: '#60A5FA',
      beatBColor: '#F43F5E',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 9,
    title: 'Castillo de Acordes',
    subtitle: 'Mazmorra Armónica · 150 BPM',
    bpm: 150,
    timeLimit: 135,
    rootMidi: 40,
    scaleIntervals: [0, 1, 4, 7, 8],
    theme: {
      skyTop: '#262626',
      skyBottom: '#171717',
      hillFar: '#404040',
      hillNear: '#525252',
      groundFill: '#262626',
      groundTop: '#737373',
      brickFill: '#525252',
      brickMortar: '#0A0A0A',
      pipeMain: '#737373',
      pipeHighlight: '#D4D4D4',
      pipeShadow: '#262626',
      beatAColor: '#FACC15',
      beatBColor: '#EF4444',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 10,
    title: 'Abismo Rítmico',
    subtitle: 'Saltos de Precisión · 154 BPM',
    bpm: 154,
    timeLimit: 130,
    rootMidi: 43,
    scaleIntervals: [0, 3, 6, 9],
    theme: {
      skyTop: '#3B0764',
      skyBottom: '#581C87',
      hillFar: '#6B21A8',
      hillNear: '#7E22CE',
      groundFill: '#581C87',
      groundTop: '#C084FC',
      brickFill: '#7E22CE',
      brickMortar: '#2E1065',
      pipeMain: '#9333EA',
      pipeHighlight: '#E9D5FF',
      pipeShadow: '#581C87',
      beatAColor: '#C084FC',
      beatBColor: '#38BDF8',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 11,
    title: 'Selva de Percusión',
    subtitle: 'Tambores Salvajes · 158 BPM',
    bpm: 158,
    timeLimit: 125,
    rootMidi: 46,
    scaleIntervals: [0, 2, 5, 7, 10],
    theme: {
      skyTop: '#064E3B',
      skyBottom: '#022C22',
      hillFar: '#047857',
      hillNear: '#059669',
      groundFill: '#064E3B',
      groundTop: '#34D399',
      brickFill: '#047857',
      brickMortar: '#022C22',
      pipeMain: '#059669',
      pipeHighlight: '#A7F3D0',
      pipeShadow: '#064E3B',
      beatAColor: '#34D399',
      beatBColor: '#F59E0B',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 12,
    title: 'Tormenta de Cobre',
    subtitle: 'Relámpagos y Metales · 162 BPM',
    bpm: 162,
    timeLimit: 120,
    rootMidi: 49,
    scaleIntervals: [0, 3, 7, 10],
    theme: {
      skyTop: '#1E3A8A',
      skyBottom: '#172554',
      hillFar: '#1D4ED8',
      hillNear: '#2563EB',
      groundFill: '#1E3A8A',
      groundTop: '#93C5FD',
      brickFill: '#2563EB',
      brickMortar: '#0F172A',
      pipeMain: '#3B82F6',
      pipeHighlight: '#BFDBFE',
      pipeShadow: '#1E40AF',
      beatAColor: '#FACC15',
      beatBColor: '#38BDF8',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 13,
    title: 'Laberinto de Vinilo',
    subtitle: 'Surcos Giratorios · 166 BPM',
    bpm: 166,
    timeLimit: 115,
    rootMidi: 51,
    scaleIntervals: [0, 2, 4, 8, 10],
    theme: {
      skyTop: '#18181B',
      skyBottom: '#09090B',
      hillFar: '#27272A',
      hillNear: '#3F3F46',
      groundFill: '#18181B',
      groundTop: '#E4E4E7',
      brickFill: '#3F3F46',
      brickMortar: '#000000',
      pipeMain: '#52525B',
      pipeHighlight: '#FAFAFA',
      pipeShadow: '#27272A',
      beatAColor: '#EC4899',
      beatBColor: '#38BDF8',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_BASE_ROWS),
    totalNotes: 0,
  },
  {
    id: 14,
    title: 'Infierno Armónico',
    subtitle: 'Extrema Dificultad · 170 BPM',
    bpm: 170,
    timeLimit: 110,
    rootMidi: 41,
    scaleIntervals: [0, 1, 3, 6, 9],
    theme: {
      skyTop: '#450A0A',
      skyBottom: '#2B0B0B',
      hillFar: '#7F1D1D',
      hillNear: '#991B1B',
      groundFill: '#7F1D1D',
      groundTop: '#F87171',
      brickFill: '#991B1B',
      brickMortar: '#1A0505',
      pipeMain: '#DC2626',
      pipeHighlight: '#FECACA',
      pipeShadow: '#991B1B',
      beatAColor: '#FACC15',
      beatBColor: '#EF4444',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
  {
    id: 15,
    title: 'Gran Concierto Final',
    subtitle: 'La Apoteosis de Sprunki · 176 BPM',
    bpm: 176,
    timeLimit: 100,
    rootMidi: 60,
    scaleIntervals: [0, 2, 4, 7, 9, 12],
    theme: {
      skyTop: '#311042',
      skyBottom: '#0F172A',
      hillFar: '#7C2D12',
      hillNear: '#4C1D95',
      groundFill: '#4C1D95',
      groundTop: '#FACC15',
      brickFill: '#BE185D',
      brickMortar: '#500724',
      pipeMain: '#EAB308',
      pipeHighlight: '#FEF08A',
      pipeShadow: '#713F12',
      beatAColor: '#FACC15',
      beatBColor: '#38BDF8',
      isDark: true,
    },
    rows: normalizeRows(LEVEL_HARD_ROWS),
    totalNotes: 0,
  },
];

// Compute note counts upfront
LEVELS.forEach((lvl) => {
  let count = 0;
  for (const row of lvl.rows) {
    for (const ch of row) {
      if (ch === 'C' || ch === '?') count++;
    }
  }
  lvl.totalNotes = count;
});

export interface ParsedLevel {
  grid: TileKind[][];
  widthCols: number;
  heightRows: number;
  spawnX: number;
  spawnY: number;
  enemies: Enemy[];
  collectibles: Collectible[];
  goalX: number;
  goalTopY: number;
  goalBottomY: number;
  checkpointX: number;
  checkpointY: number;
}

export function parseLevel(level: LevelDef): ParsedLevel {
  const heightRows = level.rows.length;
  const widthCols = level.rows[0].length;
  const grid: TileKind[][] = [];
  const enemies: Enemy[] = [];
  const collectibles: Collectible[] = [];

  let spawnX = TILE_SIZE * 4;
  let spawnY = TILE_SIZE * 18;
  let goalX = TILE_SIZE * (widthCols - 10);
  let goalTopY = TILE_SIZE * 10;
  let goalBottomY = TILE_SIZE * 22;
  let nextId = 1;

  for (let r = 0; r < heightRows; r++) {
    const rowArr: TileKind[] = [];
    const line = level.rows[r];
    for (let c = 0; c < widthCols; c++) {
      const ch = line[c];
      let tile: TileKind = 'EMPTY';
      const wx = c * TILE_SIZE;
      const wy = r * TILE_SIZE;

      switch (ch) {
        case '#':
          tile = 'GROUND';
          break;
        case '=':
          tile = 'GROUND_TOP';
          break;
        case 'B':
          tile = 'BRICK';
          break;
        case '?':
          tile = 'QUESTION_COIN';
          break;
        case '!':
          tile = 'QUESTION_POWER';
          break;
        case 'A':
          tile = 'BEAT_A';
          break;
        case 'D':
          tile = 'BEAT_B';
          break;
        case '^':
          tile = 'SPRING';
          break;
        case 'S':
          tile = 'SPIKE_BEAT';
          break;
        case '(':
          tile = 'PIPE_TL';
          break;
        case ')':
          tile = 'PIPE_TR';
          break;
        case '[':
          tile = 'PIPE_BL';
          break;
        case ']':
          tile = 'PIPE_BR';
          break;
        case 'T':
          tile = 'GOAL_TOP';
          goalX = wx + TILE_SIZE / 2;
          goalTopY = wy;
          break;
        case 'F':
          tile = 'GOAL_POLE';
          goalBottomY = wy + TILE_SIZE;
          break;
        case 'P':
          spawnX = wx;
          spawnY = wy;
          break;
        case 'C':
          collectibles.push({
            id: nextId++,
            kind: 'note',
            x: wx + 6,
            y: wy + 6,
            w: 24,
            h: 24,
            vx: 0,
            vy: 0,
            collected: false,
            bobPhase: c * 0.45,
          });
          break;
        case 'g':
          enemies.push({
            id: nextId++,
            kind: 'goombeat',
            x: wx + 3,
            y: wy + 6,
            w: 30,
            h: 30,
            vx: -72 - level.id * 3,
            vy: 0,
            facing: -1,
            alive: true,
            squashedTimer: 0,
            inShell: false,
            shellMoving: false,
            beatHopOffset: 0,
          });
          break;
        case 'k':
          enemies.push({
            id: nextId++,
            kind: 'koopasynth',
            x: wx + 3,
            y: wy + 2,
            w: 30,
            h: 34,
            vx: -85 - level.id * 3,
            vy: 0,
            facing: -1,
            alive: true,
            squashedTimer: 0,
            inShell: false,
            shellMoving: false,
            beatHopOffset: 0,
          });
          break;
        default:
          tile = 'EMPTY';
      }
      rowArr.push(tile);
    }
    grid.push(rowArr);
  }

  const checkpointCol = Math.floor(widthCols / 2);
  let checkpointY = TILE_SIZE * 18;
  for (let r = 0; r < heightRows; r++) {
    if (grid[r][checkpointCol] === 'GROUND' || grid[r][checkpointCol] === 'GROUND_TOP') {
      checkpointY = r * TILE_SIZE;
      break;
    }
  }

  return {
    grid,
    widthCols,
    heightRows,
    spawnX,
    spawnY,
    checkpointX: checkpointCol * TILE_SIZE,
    checkpointY,
    enemies,
    collectibles,
    goalX,
    goalTopY,
    goalBottomY,
  };
}

export function validateLevelData(_level?: unknown): boolean {
  return true;
}
