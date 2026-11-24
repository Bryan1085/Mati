import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Lock,
  Play,
  RotateCcw,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  Plus,
  Sparkles,
  Trash2,
  Palette,
  Shield,
  Zap,
} from 'lucide-react';
import { BADGE_DEFINITIONS, SavedProgress, evaluateBadges, loadProgress, saveEquippedBadge } from './game/badges';
import { CharacterPreview } from './components/CharacterPreview';
import { GameHUD } from './components/GameHUD';
import { TouchControls } from './components/TouchControls';
import { audioEngine } from './game/audio';
import { getAllCharacters, saveCustomCharacter, deleteCustomCharacter } from './game/characters';
import {
  GameWorld,
  createGameWorld,
  stepGameWorld,
} from './game/engine';
import { LEVELS, VIEW_HEIGHT, VIEW_WIDTH } from './game/levels';
import { renderGameWorld } from './game/renderer';
import {
  CharacterId,
  GameState,
  HudSnapshot,
  InputState,
  LevelSummary,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  notes: 0,
  totalNotes: LEVELS[0].totalNotes,
  lives: 3,
  timeLeft: LEVELS[0].timeLimit,
  combo: 0,
  rhythmHits: 0,
  poweredUp: false,
  beatIndex: 0,
  beatPhase: 0,
  bpm: LEVELS[0].bpm,
  audioLayers: 2,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [selectedChar, setSelectedChar] = useState<CharacterId>('oren');
  const [selectedLevelIdx, setSelectedLevelIdx] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const [totalRunScore, setTotalRunScore] = useState<number>(0);
  const [progress, setProgress] = useState<SavedProgress>(() => loadProgress());
  const [characterList, setCharacterList] = useState(() => getAllCharacters());
  const [showCreatorModal, setShowCreatorModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('MatiBeat');
  const [customInstrument, setCustomInstrument] = useState<string>('Sintetizador Custom');
  const [customTrait, setCustomTrait] = useState<string>('Energético · Creado por ti');
  const [customBodyColor, setCustomBodyColor] = useState<string>('#8B5CF6');
  const [customShadowColor, setCustomShadowColor] = useState<string>('#5B21B6');
  const [customAccentColor, setCustomAccentColor] = useState<string>('#F43F5E');
  const [customAccessory, setCustomAccessory] = useState<'headphones' | 'crown' | 'cap' | 'glasses' | 'horns' | 'bow' | 'cape' | 'none'>('crown');
  const [customSpeed, setCustomSpeed] = useState<number>(1.05);
  const [customJump, setCustomJump] = useState<number>(1.05);

  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<string | null>(null);

  const handleSaveCustomSprunki = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom_${Date.now()}`;
    const newChar = {
      id,
      name: customName || 'Sprunki Custom',
      instrument: customInstrument || 'Instrumento Único',
      traitLabel: customTrait || 'Personalizado',
      bodyColor: customBodyColor,
      bodyShadow: customShadowColor,
      accentColor: customAccentColor,
      eyeBg: '#FFFFFF',
      speedMultiplier: Number(customSpeed),
      jumpMultiplier: Number(customJump),
      gravityMultiplier: 1.0,
      voicePitchOffset: Math.floor(Math.random() * 12) - 6,
      accessory: customAccessory,
      isCustom: true,
    };
    saveCustomCharacter(newChar);
    const updated = getAllCharacters();
    setCharacterList(updated);
    setSelectedChar(id);
    setShowCreatorModal(false);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomCharacter(id);
    const updated = getAllCharacters();
    setCharacterList(updated);
    setSelectedChar(updated[0]?.id ?? 'oren');
  };

  const handleEquipBadge = (badgeId: string | null) => {
    const updated = saveEquippedBadge(badgeId);
    setProgress(updated);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false,
    run: false,
  });
  const jumpQueuedRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const currentLevel = LEVELS[selectedLevelIdx] ?? LEVELS[0];

  // Level unlocking check: Level N is unlocked if N === 1 or N-1 has a recorded score > 0
  const isLevelUnlocked = useCallback(
    (idx: number) => {
      if (idx === 0) return true;
      const prevLevelId = LEVELS[idx - 1].id;
      return (progress.bestScores[prevLevelId] ?? 0) > 0;
    },
    [progress.bestScores]
  );

  const clearInputs = useCallback(() => {
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.jump = false;
    inputRef.current.jumpJustPressed = false;
    inputRef.current.run = false;
    jumpQueuedRef.current = false;
  }, []);

  const startLevel = useCallback(
    (levelIdx: number, carryLives = 3, carryScore = 0) => {
      if (!isLevelUnlocked(levelIdx)) return;
      const level = LEVELS[levelIdx] ?? LEVELS[0];
      clearInputs();
      const world = createGameWorld(level, selectedChar, carryLives, carryScore);
      worldRef.current = world;
      setSelectedLevelIdx(levelIdx);
      setSummary(null);
      setHud({
        score: world.score,
        notes: 0,
        totalNotes: level.totalNotes,
        lives: world.lives,
        timeLeft: level.timeLimit,
        combo: 0,
        rhythmHits: 0,
        poweredUp: false,
        beatIndex: 0,
        beatPhase: 0,
        bpm: level.bpm,
        audioLayers: 2,
      });
      audioEngine.setLayers(2);
      audioEngine.startMusic(level.id, level.bpm);
      setGameState('PLAYING');
    },
    [clearInputs, isLevelUnlocked, selectedChar]
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (gameStateRef.current === 'PLAYING') {
      audioEngine.pauseMusic();
      clearInputs();
      setGameState('PAUSED');
    } else if (gameStateRef.current === 'PAUSED') {
      const world = worldRef.current;
      if (world) {
        audioEngine.startMusic(world.level.id, world.level.bpm);
      }
      setGameState('PLAYING');
    }
  }, [clearInputs]);

  const handleReturnToMenu = useCallback(() => {
    audioEngine.stopMusic();
    clearInputs();
    setGameState('TITLE_MENU');
  }, [clearInputs]);

  const handleTouchInput = useCallback(
    (key: keyof InputState, pressed: boolean) => {
      if (key === 'jump' && pressed) {
        jumpQueuedRef.current = true;
      }
      inputRef.current[key] = pressed;
    },
    []
  );

  // Gesture Jump Tap
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.pointer-events-auto')) return;
    if (e.clientX < 180 && e.clientY > window.innerHeight - 160) return;
    if (gameStateRef.current !== 'PLAYING') return;

    const now = performance.now();
    lastTapTimeRef.current = now;

    jumpQueuedRef.current = true;
    inputRef.current.jump = true;
  }, []);

  const handleCanvasPointerUp = useCallback(() => {
    inputRef.current.jump = false;
  }, []);

  // Keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED') {
          e.preventDefault();
          handlePauseToggle();
        }
        return;
      }
      if (e.code === 'KeyR' && gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        startLevel(selectedLevelIdx, 3, 0);
        return;
      }

      if (gameStateRef.current !== 'PLAYING') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = true;
      } else if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        e.preventDefault();
        if (!inputRef.current.jump) {
          jumpQueuedRef.current = true;
        }
        inputRef.current.jump = true;
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyX'
      ) {
        inputRef.current.run = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = false;
      } else if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        inputRef.current.jump = false;
      } else if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyX'
      ) {
        inputRef.current.run = false;
      }
    };

    const onBlur = () => clearInputs();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [clearInputs, handlePauseToggle, handleToggleMute, selectedLevelIdx, startLevel]);

  // Main 60fps Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED' && gameState !== 'LEVEL_CLEAR' && gameState !== 'GAME_OVER') {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();
    let lastHudKey = '';

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const world = worldRef.current;
      const canvas = canvasRef.current;
      if (world && canvas) {
        if (gameStateRef.current === 'PLAYING') {
          inputRef.current.jumpJustPressed = jumpQueuedRef.current;
          jumpQueuedRef.current = false;

          const result = stepGameWorld(world, inputRef.current, dt);

          const hudKey = `${result.hud.score}|${result.hud.notes}|${result.hud.lives}|${result.hud.timeLeft}|${result.hud.beatIndex}|${result.hud.audioLayers}|${result.hud.poweredUp}`;
          if (hudKey !== lastHudKey) {
            lastHudKey = hudKey;
            setHud(result.hud);
          }

          if (result.event === 'RESPAWN') {
            const nextWorld = createGameWorld(
              world.level,
              world.characterId,
              world.lives,
              world.score,
              true,
              world.checkpointReached
            );
            worldRef.current = nextWorld;
            audioEngine.setLayers(2);
            audioEngine.startMusic(world.level.id, world.level.bpm);
          } else if (result.event === 'GAME_OVER') {
            audioEngine.stopMusic();
            setGameState('GAME_OVER');
          } else if (result.event === 'LEVEL_CLEAR' && world.summary) {
            setSummary(world.summary);
            setTotalRunScore(world.summary.totalScore);

            const usedDoubleJump = world.player.hasDoubleJumped;
            const newBadges = evaluateBadges(
              progress,
              world.summary,
              world.timeLeft,
              usedDoubleJump
            );
            const updatedProg = loadProgress();
            setProgress(updatedProg);

            if (newBadges.length > 0) {
              const def = BADGE_DEFINITIONS.find((b) => b.id === newBadges[0]);
              if (def) {
                setNewlyUnlockedBadge(`${def.icon} ¡Insignia desbloqueada: ${def.name}!`);
                setTimeout(() => setNewlyUnlockedBadge(null), 3500);
              }
            }

            if (selectedLevelIdx >= LEVELS.length - 1) {
              setGameState('VICTORY');
            } else {
              setGameState('LEVEL_CLEAR');
            }
          }
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGameWorld(ctx, world);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, progress, selectedLevelIdx]);

  // Stop music cleanly on unmount
  useEffect(() => {
    return () => audioEngine.stopMusic();
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-2 sm:p-4">
      {gameState === 'TITLE_MENU' ? (
        <main className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Super Sprunki Ritmo
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBadgeModal(true)}
                  className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="Insignias estilo Mario Wonder"
                >
                  <Award className="w-4 h-4" />
                  <span>{progress.unlockedBadges.length}/{BADGE_DEFINITIONS.length}</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm">
              15 niveles musicales progresivos. Desbloquea cada mundo superando el anterior y colecciona insignias.
            </p>
          </div>

          {/* Equipped Badge Banner */}
          {progress.equippedBadge && (() => {
            const b = BADGE_DEFINITIONS.find((def) => def.id === progress.equippedBadge);
            if (!b) return null;
            return (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{b.icon}</span>
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Insignia Equipada</div>
                    <div className="font-display font-bold text-xs text-white">{b.name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEquipBadge(null)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                >
                  Quitar
                </button>
              </div>
            );
          })()}

          {/* Character Picker */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                Personaje Sprunki
              </h2>
              <button
                type="button"
                onClick={() => setShowCreatorModal(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Sprunki</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {characterList.map((char) => {
                const isSelected = selectedChar === char.id;
                return (
                  <div
                    key={char.id}
                    className={`relative p-2 rounded-xl border flex items-center gap-2 transition-colors group ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.ensureContext();
                        audioEngine.sfxNote(0, 60 + char.voicePitchOffset);
                        setSelectedChar(char.id);
                      }}
                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                    >
                      <CharacterPreview characterId={char.id} active={isSelected} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-xs text-white truncate flex items-center gap-1">
                          <span>{char.name}</span>
                          {char.isCustom && (
                            <span className="text-[9px] bg-purple-500 text-white px-1 rounded font-normal">Custom</span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-300 truncate">
                          {char.instrument}
                        </div>
                      </div>
                    </button>
                    {char.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(char.id, e)}
                        className="opacity-60 hover:opacity-100 text-rose-400 p-1 transition-opacity"
                        title="Eliminar personaje custom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Level Picker (Scrollable 15 levels with locks) */}
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
              Selecciona Nivel (1 - 15)
            </h2>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {LEVELS.map((lvl, idx) => {
                const isSelected = selectedLevelIdx === idx;
                const unlocked = isLevelUnlocked(idx);
                const bestScore = progress.bestScores[lvl.id] ?? 0;
                const bestStars = progress.bestStars[lvl.id] ?? 0;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedLevelIdx(idx)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                      !unlocked
                        ? 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-num text-xs font-bold ${
                          unlocked ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {unlocked ? lvl.id : <Lock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-bold text-xs text-white truncate">
                          {lvl.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {lvl.subtitle}
                        </div>
                      </div>
                    </div>

                    {unlocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= bestStars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        {bestScore > 0 && (
                          <span className="font-mono-num text-[10px] text-slate-300 ml-1">
                            {bestScore}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Start Action */}
          <button
            type="button"
            disabled={!isLevelUnlocked(selectedLevelIdx)}
            onClick={() => startLevel(selectedLevelIdx, 3, 0)}
            className={`w-full py-3.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              isLevelUnlocked(selectedLevelIdx)
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isLevelUnlocked(selectedLevelIdx)
                ? `Jugar Nivel ${currentLevel.id}: ${currentLevel.title}`
                : 'Nivel Bloqueado (Completa el anterior)'}
            </span>
          </button>
        </main>
      ) : (
        /* Vertical Portrait Phone Frame */
        <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[88vh] rounded-3xl overflow-hidden border-4 border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
          <GameHUD
            hud={hud}
            level={currentLevel}
            characterId={selectedChar}
            muted={muted}
            onToggleMute={handleToggleMute}
            onPause={handlePauseToggle}
            onRestart={() => startLevel(selectedLevelIdx, 3, 0)}
          />

          {/* Interactive Game Canvas */}
          <div
            className="relative flex-1 w-full overflow-hidden cursor-pointer"
            onPointerDown={handleCanvasPointerDown}
            onPointerUp={handleCanvasPointerUp}
          >
            <canvas
              ref={canvasRef}
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              className="w-full h-full block object-fill"
            />

            {/* Bottom-left directional controls */}
            <TouchControls
              onInputChange={handleTouchInput}
              onToggleRun={() => {
                inputRef.current.run = !inputRef.current.run;
              }}
              isRunning={inputRef.current.run}
            />

            {/* Badge Popup Notification */}
            {newlyUnlockedBadge && (
              <div className="absolute top-12 inset-x-4 bg-amber-500 text-slate-950 font-display font-bold text-xs py-2 px-3 rounded-xl shadow-xl text-center animate-bounce z-40">
                {newlyUnlockedBadge}
              </div>
            )}

            {/* Gesture jump hint */}
            <div className="absolute top-2 inset-x-0 text-center pointer-events-none">
              <span className="text-[10px] text-slate-300/80 bg-slate-950/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
                Toque = Salto · Doble Toque = Doble Salto
              </span>
            </div>

            {/* PAUSED OVERLAY */}
            {gameState === 'PAUSED' && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-30">
                <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center flex flex-col gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">
                      Juego en Pausa
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Nivel {currentLevel.id}: {currentLevel.title}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handlePauseToggle}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors"
                    >
                      Continuar
                    </button>
                    <button
                      type="button"
                      onClick={() => startLevel(selectedLevelIdx, 3, 0)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors"
                    >
                      Reiniciar nivel
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToMenu}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-sm transition-colors"
                    >
                      Volver al menú
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL CLEAR OVERLAY */}
            {gameState === 'LEVEL_CLEAR' && summary && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-30">
                <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="text-center">
                    <h2 className="font-display text-2xl font-bold text-white">
                      ¡Nivel Superado!
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {summary.levelTitle}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-6 h-6 ${
                            s <= summary.stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Notas</span>
                      <span className="font-mono-num font-semibold text-amber-300">
                        {summary.notesCollected}/{summary.totalNotes}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Ritmo</span>
                      <span className="font-mono-num font-semibold text-sky-300">
                        {summary.rhythmHits}
                      </span>
                    </div>
                    <div className="border-t border-slate-800 pt-1.5 mt-0.5 flex justify-between text-sm font-bold text-white">
                      <span>Total</span>
                      <span className="font-mono-num text-amber-400">
                        {summary.totalScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedLevelIdx + 1 < LEVELS.length &&
                    isLevelUnlocked(selectedLevelIdx + 1) ? (
                      <button
                        type="button"
                        onClick={() =>
                          startLevel(
                            selectedLevelIdx + 1,
                            hud.lives,
                            summary.totalScore
                          )
                        }
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
                      >
                        Siguiente
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReturnToMenu}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
                      >
                        Menú Niveles
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startLevel(selectedLevelIdx, 3, 0)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition-colors"
                    >
                      Repetir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GAME OVER OVERLAY */}
            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-30">
                <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center flex flex-col gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-rose-400">
                      Fin del Ritmo
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Te has quedado sin vidas.
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between text-xs">
                    <span className="text-slate-400">Puntos</span>
                    <span className="font-mono-num font-bold text-white">
                      {hud.score}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => startLevel(selectedLevelIdx, 3, 0)}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reintentar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToMenu}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
                    >
                      Menú principal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GRAND VICTORY OVERLAY */}
            {gameState === 'VICTORY' && summary && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-30">
                <div className="w-full max-w-xs bg-slate-900 border border-amber-400/50 rounded-2xl p-5 text-center flex flex-col gap-4">
                  <div className="flex flex-col items-center">
                    <Trophy className="w-10 h-10 text-amber-400 mb-1.5" />
                    <h2 className="font-display text-2xl font-bold text-white">
                      ¡Gran Concierto Épico!
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      ¡Has completado los 15 niveles de Super Sprunki Ritmo!
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Puntuación final</span>
                      <span className="font-mono-num font-bold text-amber-400">
                        {totalRunScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startLevel(0, 3, 0)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Otra vez
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnToMenu}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition-colors"
                    >
                      Menú
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BADGE GALLERY MODAL */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-amber-400" />
                <h2 className="font-display text-xl font-bold text-white">
                  Insignias (Estilo Mario Wonder)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBadgeModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Equipa 1 insignia activa para obtener superpoderes especiales en tus niveles musicales.
            </p>

            <div className="grid grid-cols-1 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const unlocked = progress.unlockedBadges.includes(badge.id);
                const isEquipped = progress.equippedBadge === badge.id;
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-xl border flex items-center gap-3.5 transition-colors ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                        : unlocked
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                        unlocked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800'
                      }`}
                    >
                      {badge.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-sm text-white flex items-center gap-2">
                        <span>{badge.name}</span>
                        {isEquipped ? (
                          <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                            Equipada
                          </span>
                        ) : unlocked ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
                            Desbloqueada
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
                            Bloqueada
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        {badge.description}
                      </div>
                      <div className="text-[11px] text-amber-300 mt-1 font-semibold flex items-center gap-1">
                        <span>⚡ Efecto: {badge.effectLabel}</span>
                      </div>
                    </div>

                    {unlocked && (
                      <button
                        type="button"
                        onClick={() => handleEquipBadge(isEquipped ? null : badge.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                          isEquipped
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        {isEquipped ? 'Quitar' : 'Equipar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowBadgeModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm transition-colors"
            >
              Cerrar galería
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM SPRUNKI CREATOR MODAL */}
      {showCreatorModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Palette className="w-6 h-6 text-amber-400" />
                <h2 className="font-display text-xl font-bold text-white">
                  Creador de Sprunki Custom
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatorModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomSprunki} className="flex flex-col gap-4">
              {/* Live Preview */}
              <div className="flex items-center justify-center gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <CharacterPreview
                  characterId="preview_temp"
                  active={true}
                  size={72}
                />
                <div className="flex flex-col gap-1 text-left">
                  <div className="font-display font-bold text-sm text-white">{customName || 'Tu Sprunki'}</div>
                  <div className="text-xs text-amber-300">{customInstrument}</div>
                  <div className="text-[10px] text-slate-400">{customTrait}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-display text-xs font-semibold text-slate-300">Nombre del Sprunki</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={18}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Ej. MatiBeat"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-semibold text-slate-300">Instrumento</label>
                  <input
                    type="text"
                    value={customInstrument}
                    onChange={(e) => setCustomInstrument(e.target.value)}
                    maxLength={25}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="Sintetizador Chiptune"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-semibold text-slate-300">Personalidad / Rasgo</label>
                  <input
                    type="text"
                    value={customTrait}
                    onChange={(e) => setCustomTrait(e.target.value)}
                    maxLength={30}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="Acrobático · Rápido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-[11px] font-semibold text-slate-300">Color Cuerpo</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                    <input
                      type="color"
                      value={customBodyColor}
                      onChange={(e) => setCustomBodyColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300 uppercase">{customBodyColor}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-[11px] font-semibold text-slate-300">Color Sombra</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                    <input
                      type="color"
                      value={customShadowColor}
                      onChange={(e) => setCustomShadowColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300 uppercase">{customShadowColor}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-[11px] font-semibold text-slate-300">Color Acento</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                    <input
                      type="color"
                      value={customAccentColor}
                      onChange={(e) => setCustomAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300 uppercase">{customAccentColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-semibold text-slate-300">Accesorio / Skin</label>
                  <select
                    value={customAccessory}
                    onChange={(e) => setCustomAccessory(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="crown">Corona Real 👑</option>
                    <option value="cap">Gorra Gamer 🧢</option>
                    <option value="headphones">Auriculares DJ 🎧</option>
                    <option value="horns">Cuernos Demonio 😈</option>
                    <option value="bow">Lazo Melódico 🎀</option>
                    <option value="glasses">Gafas de Sol 🕶️</option>
                    <option value="none">Ninguno</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-display text-xs font-semibold text-slate-300">Velocidad / Salto</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.9"
                      max="1.2"
                      step="0.05"
                      value={customSpeed}
                      onChange={(e) => {
                        setCustomSpeed(Number(e.target.value));
                        setCustomJump(Number(e.target.value));
                      }}
                      className="flex-1 accent-amber-400"
                    />
                    <span className="font-mono-num text-xs text-amber-300">{Math.round(customSpeed * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatorModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Guardar y Jugar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
