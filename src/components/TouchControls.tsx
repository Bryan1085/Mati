import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { InputState } from '../game/types';

interface TouchControlsProps {
  onInputChange: (key: keyof InputState, pressed: boolean) => void;
  onToggleRun: () => void;
  isRunning: boolean;
}

export function TouchControls({
  onInputChange,
  onToggleRun,
  isRunning,
}: TouchControlsProps) {
  const bindTouch = (key: keyof InputState) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onInputChange(key, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onInputChange(key, false);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.stopPropagation();
      onInputChange(key, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      onInputChange(key, false);
    },
  });

  return (
    <div className="absolute inset-x-0 bottom-3 px-4 flex items-end justify-between pointer-events-none select-none touch-none z-20">
      {/* Bottom-left corner: Directional D-pad */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          {...bindTouch('left')}
          className="w-16 h-16 rounded-2xl bg-slate-900/80 backdrop-blur-sm active:bg-amber-500/80 border border-slate-700 flex items-center justify-center text-slate-100 shadow-lg"
          aria-label="Mover izquierda"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>
        <button
          type="button"
          {...bindTouch('right')}
          className="w-16 h-16 rounded-2xl bg-slate-900/80 backdrop-blur-sm active:bg-amber-500/80 border border-slate-700 flex items-center justify-center text-slate-100 shadow-lg"
          aria-label="Mover derecha"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom-right: Run toggle button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRun();
          }}
          className={`w-14 h-14 rounded-2xl backdrop-blur-sm border flex items-center justify-center transition-colors shadow-lg ${
            isRunning
              ? 'bg-amber-400 border-amber-300 text-slate-950 font-bold'
              : 'bg-slate-900/80 border-slate-700 text-amber-400'
          }`}
          aria-label="Alternar carrera"
          title="Correr (Shift)"
        >
          <Zap className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
