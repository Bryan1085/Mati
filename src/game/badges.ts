import { LevelSummary } from './types';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  effectLabel: string;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: 'rhythm_master',
    name: 'Maestro del Ritmo',
    description: 'Consigue 5 o más aciertos rítmicos perfectos en un nivel.',
    icon: '🎵',
    effectLabel: 'Bono extra por sincronía de compás',
  },
  {
    id: 'note_collector',
    name: 'Coleccionista 100%',
    description: 'Recoge todas las notas musicales de un nivel.',
    icon: '⭐',
    effectLabel: 'Imán automático de notas doradas',
  },
  {
    id: 'double_jumper',
    name: 'Acrobata Aéreo',
    description: 'Utiliza el doble salto en plena aventura.',
    icon: '🪶',
    effectLabel: 'Permite salto doble en el aire',
  },
  {
    id: 'magma_king',
    name: 'Rey del Magma',
    description: 'Completa el Nivel 2 (Volcán Magma) con éxito.',
    icon: '🌋',
    effectLabel: 'Escudo protector contra 1 daño',
  },
  {
    id: 'speed_runner',
    name: 'Velocidad Turbo',
    description: 'Termina un nivel con más de 60 segundos restantes.',
    icon: '⚡',
    effectLabel: 'Velocidad de movimiento aumentada un 20%',
  },
  {
    id: 'sprunki_virtuoso',
    name: 'Virtuoso Sprunki',
    description: 'Completa el Gran Concierto Final (Nivel 15).',
    icon: '🏆',
    effectLabel: 'Duplica todos los puntos obtenidos',
  },
];

export interface SavedProgress {
  bestScores: Record<number, number>;
  bestStars: Record<number, number>;
  unlockedBadges: string[];
  equippedBadge: string | null;
}

const STORAGE_KEY = 'super_sprunki_ritmo_progress_v4';

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestScores: {}, bestStars: {}, unlockedBadges: [], equippedBadge: null };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      bestScores: parsed.bestScores ?? {},
      bestStars: parsed.bestStars ?? {},
      unlockedBadges: parsed.unlockedBadges ?? [],
      equippedBadge: parsed.equippedBadge ?? null,
    };
  } catch {
    return { bestScores: {}, bestStars: {}, unlockedBadges: [], equippedBadge: null };
  }
}

export function saveEquippedBadge(badgeId: string | null): SavedProgress {
  const current = loadProgress();
  const next: SavedProgress = {
    ...current,
    equippedBadge: badgeId,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function evaluateBadges(
  progress: SavedProgress,
  summary: LevelSummary,
  timeLeft: number,
  usedDoubleJump: boolean
): string[] {
  const newlyUnlocked: string[] = [];
  const badges = new Set(progress.unlockedBadges);

  const unlock = (id: string) => {
    if (!badges.has(id)) {
      badges.add(id);
      newlyUnlocked.push(id);
    }
  };

  if (summary.rhythmHits >= 5) unlock('rhythm_master');
  if (summary.notesCollected >= summary.totalNotes && summary.totalNotes > 0) {
    unlock('note_collector');
  }
  if (usedDoubleJump) unlock('double_jumper');
  if (summary.levelId === 2) unlock('magma_king');
  if (timeLeft >= 60) unlock('speed_runner');
  if (summary.levelId === 15) unlock('sprunki_virtuoso');

  const nextProgress: SavedProgress = {
    ...progress,
    bestScores: {
      ...progress.bestScores,
      [summary.levelId]: Math.max(
        progress.bestScores[summary.levelId] ?? 0,
        summary.totalScore
      ),
    },
    bestStars: {
      ...progress.bestStars,
      [summary.levelId]: Math.max(
        progress.bestStars[summary.levelId] ?? 0,
        summary.stars
      ),
    },
    unlockedBadges: Array.from(badges),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
  } catch {
    // Ignore storage quota errors
  }

  return newlyUnlocked;
}
