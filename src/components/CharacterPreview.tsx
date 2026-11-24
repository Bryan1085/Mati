import { useEffect, useRef } from 'react';
import { drawSprunkiCharacter } from '../game/renderer';
import { CharacterId } from '../game/types';

interface CharacterPreviewProps {
  characterId: CharacterId;
  active: boolean;
  size?: number;
}

export function CharacterPreview({
  characterId,
  active,
  size = 64,
}: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const render = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dpr = window.devicePixelRatio || 1;
      const targetW = size * dpr;
      const targetH = size * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const beatPulse = active ? Math.max(0, Math.sin(elapsed * 7) * 0.8) : 0;
      const isBlinking = Math.sin(elapsed * 1.4) > 0.96;

      drawSprunkiCharacter(ctx, size / 2 - 14, size - 44, 28, 36, characterId, {
        facing: 1,
        walkCycle: active ? elapsed * 3.5 : 0,
        isJumping: false,
        isBlinking,
        isSinging: active && Math.sin(elapsed * 7) > 0.6,
        poweredUp: false,
        squashX: 1,
        squashY: 1,
        beatPulse,
      });

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [characterId, active, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}
