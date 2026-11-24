import { Heart, Music, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { CHARACTERS } from '../game/characters';
import { CharacterId, HudSnapshot, LevelDef } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  level: LevelDef;
  characterId: CharacterId;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export function GameHUD({
  hud,
  level,
  characterId,
  muted,
  onToggleMute,
  onPause,
  onRestart,
}: GameHUDProps) {
  const char = CHARACTERS[characterId];

  return (
    <header className="w-full flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100">
      {/* Left: Character & Level identity */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: char.bodyColor }}
            aria-hidden="true"
          />
          <span className="font-display font-bold text-base tracking-tight text-white">
            {char.name}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
          <span>Nivel {level.id}: {level.title}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">{hud.bpm} BPM</span>
          <span aria-hidden="true">·</span>
          <span>Pistas {hud.audioLayers}/4</span>
        </div>
      </div>

      {/* Center: Beat Metronome & Core Metrics */}
      <div className="flex items-center gap-5 sm:gap-6">
        {/* 4-Beat Visual Metronome */}
        <div
          className="flex items-center gap-1.5"
          title="Pulso musical: 1-2 activa bloques cálidos, 3-4 activa bloques fríos"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isActive = hud.beatIndex === idx;
            const isGroupA = idx < 2;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded flex items-center justify-center font-mono-num text-[11px] font-bold transition-transform duration-75 ${
                  isActive
                    ? isGroupA
                      ? 'bg-amber-400 text-slate-950 scale-110'
                      : 'bg-sky-400 text-slate-950 scale-110'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-slate-400">Puntos</span>
            <span className="font-mono-num font-bold text-white">
              {hud.score.toString().padStart(5, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="font-mono-num font-bold text-amber-300">
              {hud.notes}/{hud.totalNotes}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" aria-hidden="true" />
            <span className="font-mono-num font-bold text-rose-300">
              {hud.lives}
            </span>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-slate-400">Tiempo</span>
            <span
              className={`font-mono-num font-bold ${
                hud.timeLeft <= 20 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {hud.timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Right: Functional Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleMute}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
          title={muted ? 'Activar sonido (M)' : 'Silenciar sonido (M)'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
          aria-label="Reiniciar nivel"
          title="Reiniciar nivel (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onPause}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
          title="Pausar (P o Esc)"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pausa</span>
        </button>
      </div>
    </header>
  );
}
