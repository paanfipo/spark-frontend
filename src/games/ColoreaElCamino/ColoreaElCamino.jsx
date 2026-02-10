// src/games/ColoreaElCamino/ColoreaElCamino.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ColoreaElCamino.module.css";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";

// Si usted quiere exactamente el patrón de MatrizMemoria (config externo),
// cree este archivo y expórtelo con los mismos nombres.
import { gameSettings, levelsData } from "./ColoreaElCamino.config";


// ------------------------------
// Constantes y estados (estilo MatrizMemoria)
// ------------------------------
const GAME_STATE = {
  COUNTDOWN: "countdown",
  START_LEVEL: "start_level",
  PLAYING: "playing",
  FEEDBACK: "feedback",
  NEXT_LEVEL: "next_level",
  GAME_OVER: "game_over",
};

const FEEDBACK_DELAY = 1400;

// ------------------------------
// Helpers puros (sin React)
// ------------------------------
function parseMaskStrings(maskStrings) {
  const h = maskStrings.length;
  const w = maskStrings[0]?.length ?? 0;
  const m = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => maskStrings[y][x] === "1")
  );
  return { w, h, m };
}

function rotateCell({ x, y }, rot) {
  switch (rot) {
    case 0:
      return { x, y };
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default:
      return { x, y };
  }
}

function normalizeCells(cells) {
  let minX = Infinity,
    minY = Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
  }
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
}

function transformCells(baseCells, rot, flip = false) {
  // 1) opcional: espejo horizontal (reflexión en eje vertical)
  const flipped = flip ? baseCells.map((c) => ({ x: -c.x, y: c.y })) : baseCells;

  // 2) rotación
  const rotated = flipped.map((c) => rotateCell(c, rot));

  // 3) normalización a coordenadas positivas
  return normalizeCells(rotated);
}


function buildOccGrid(w, h, piecesState, pieceDefsById) {
  const occ = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
  for (const p of piecesState) {
    if (!p.placed) continue;
    const def = pieceDefsById[p.id];
    if (!def) continue;
    const cells = transformCells(def.cells, p.rot, p.flip);
    for (const c of cells) {
      const bx = p.x + c.x;
      const by = p.y + c.y;
      if (bx < 0 || bx >= w || by < 0 || by >= h) continue;
      occ[by][bx] += 1;
    }
  }
  return occ;
}

function buildOccGridExcludingPiece(w, h, piecesState, pieceDefsById, excludeId) {
  const filtered = piecesState.filter((p) => p.id !== excludeId);
  return buildOccGrid(w, h, filtered, pieceDefsById);
}


function computeMetrics({ w, h, targetMask, obstacleMask, occ }) {
  let T = 0; // #celdas target usables
  let U = 0; // espacios no cubiertos
  let O = 0; // superposición en target
  let overlapCellsTotal = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = occ[y][x];
      if (o >= 2) overlapCellsTotal += 1;

      const isTarget = targetMask[y][x];
      const isObstacle = obstacleMask[y][x];

      if (isTarget && !isObstacle) {
        T += 1;
        if (o === 0) U += 1;
        if (o >= 2) O += 1;
      }
    }
  }

  const ipv = T > 0 ? 1 - (U + O) / T : 0;
  const ipvClamped = Math.max(0, Math.min(1, ipv));
  const solved = T > 0 && U === 0 && O === 0;

  return {
    T,
    ipv: ipvClamped,
    uncoveredCells: U,
    overlapCellsTarget: O,
    overlapCellsTotal,
    solved,
  };
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// ------------------------------
// Componente
// ------------------------------
export default function ColoreaElCamino({ onGameOver }) {
  // --- sonido (igual MatrizMemoria) ---
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");

  const toggleSound = useCallback(() => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem("soundEnabled", newSoundState.toString());
  }, [soundEnabled]);

  const safePlay = useCallback(
    (snd, vol = 1) => {
      if (!soundEnabled) return;
      try {
        playSound(snd, vol);
      } catch (e) {
        // no romper flujo
      }
    },
    [soundEnabled]
  );

  // --- pausa (misma arquitectura) ---
  const [paused, setPaused] = useState(false);
  const timeoutsRef = useRef([]);

  const setPausableTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const pauseGame = useCallback(() => {
    setPaused(true);
    safePlay(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts, safePlay]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    safePlay(sounds.pauseOut, 0.5);
  }, [safePlay]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPaused((isCurrentlyPaused) => {
          if (isCurrentlyPaused) {
            resumeGame();
            return false;
          } else {
            pauseGame();
            return true;
          }
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pauseGame, resumeGame]);

  // --- estados tipo MatrizMemoria ---
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);

  const [levelIndex, setLevelIndex] = useState(0);
  const [lives, setLives] = useState(gameSettings.startingLives);

  // métricas del nivel (persistentes)
  const [levelStats, setLevelStats] = useState([]); // por nivel: { levelId, timeMs, ipv, overlapCellsTarget, uncoveredCells, overlapEvents, repositions }

  // cronometraje por nivel
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [levelEndTime, setLevelEndTime] = useState(null);

  // contadores de errores/eventos requeridos
  const [overlapEvents, setOverlapEvents] = useState(0);
  const [repositions, setRepositions] = useState(0);

  // nivel actual
  const level = levelsData[levelIndex];

  const { w, h, targetMask, obstacleMask, pieceDefsById } = useMemo(() => {
    const t = parseMaskStrings(level.target);
    const o = parseMaskStrings(level.obstacles);
    if (t.w !== o.w || t.h !== o.h) {
      throw new Error("ColoreaElCamino: target y obstacles deben tener mismas dimensiones.");
    }
    const defs = {};
    for (const p of level.pieces) defs[p.id] = p;
    return { w: t.w, h: t.h, targetMask: t.m, obstacleMask: o.m, pieceDefsById: defs };
  }, [level]);

  const cellSizePx = Number(level.cellSizePx ?? gameSettings.cellSizePx) || 34;


  // estado de piezas (colocación)
  const initialPiecesState = useMemo(() => {
    return level.pieces.map((p, idx) => ({
      id: p.id,
      placed: false,
      x: 0,
      y: 0,
      rot: 0,
      flip: false,
      trayIndex: idx,
    }));
  }, [level.pieces]);

  const [piecesState, setPiecesState] = useState(initialPiecesState);

  // reset cuando cambia de nivel
  useEffect(() => {
    setPiecesState(initialPiecesState);
    setOverlapEvents(0);
    setRepositions(0);
    setLevelStartTime(null);
    setLevelEndTime(null);
  }, [initialPiecesState, levelIndex]);

  // --- occ + métricas continuas ---
  const occ = useMemo(() => buildOccGrid(w, h, piecesState, pieceDefsById), [w, h, piecesState, pieceDefsById]);

  const metrics = useMemo(() => computeMetrics({ w, h, targetMask, obstacleMask, occ }), [w, h, targetMask, obstacleMask, occ]);

  useEffect(() => {
  console.log("[DEBUG metrics]", {
    T: metrics.T,
    ipv: metrics.ipv,
    uncoveredCells: metrics.uncoveredCells,
    overlapCellsTarget: metrics.overlapCellsTarget,
    overlapCellsTotal: metrics.overlapCellsTotal,
    solved: metrics.solved,
  });
  console.log("[DEBUG placedPieces]", piecesState.filter(p => p.placed).map(p => ({ id: p.id, x: p.x, y: p.y, rot: p.rot, flip: p.flip })));
}, [metrics, piecesState]);


  // --- countdown (idéntico patrón MatrizMemoria) ---
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;

    setCountdown(3);
    safePlay(sounds.start);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    let timeLeft = 3;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft > 0 ? timeLeft : null);

      if (timeLeft === 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setGameState(GAME_STATE.START_LEVEL);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameState, safePlay]);

  // --- iniciar nivel ---
  useEffect(() => {
    if (paused) return;
    if (gameState !== GAME_STATE.START_LEVEL) return;

    setGameState(GAME_STATE.PLAYING);
    setLevelStartTime(Date.now());
    setLevelEndTime(null);
    safePlay(sounds.gameStart, 0.8);
  }, [gameState, paused, safePlay]);

  // ------------------------------
  // Validación de colocación (obstáculos/bordes)
  // ------------------------------
  const canPlace = useCallback(
  (pieceId, anchorX, anchorY, rot) => {
    const def = pieceDefsById[pieceId];
    if (!def) return false;

    const piece = piecesState.find((x) => x.id === pieceId);
    const flip = piece?.flip ?? false;
    const cells = transformCells(def.cells, rot, flip);


    // ocupación actual SIN la pieza que estoy moviendo (para permitir reubicarla)
    const occNoSelf = buildOccGridExcludingPiece(w, h, piecesState, pieceDefsById, pieceId);

    for (const c of cells) {
      const bx = anchorX + c.x;
      const by = anchorY + c.y;

      // límites
      if (bx < 0 || bx >= w || by < 0 || by >= h) return false;

      // obstáculos
      if (obstacleMask[by][bx]) return false;

      // PROHIBIR superposición
      if (occNoSelf[by][bx] >= 1) return false;
    }

    return true;
  },
  [pieceDefsById, w, h, obstacleMask, piecesState] // ojo: incluye piecesState
);

  // ------------------------------
  // Contabilización de evento de superposición (por evento)
  // Definición: un drop que introduce ocupación>=2 dentro del contorno objetivo usable.
  // ------------------------------
  const willIntroduceOverlapEventInTarget = useCallback(
    (nextPiecesState) => {
      const nextOcc = buildOccGrid(w, h, nextPiecesState, pieceDefsById);

      // si existe alguna celda target usable con occ>=2 -> superposición en target
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!targetMask[y][x]) continue;
          if (obstacleMask[y][x]) continue;
          if (nextOcc[y][x] >= 2) return true;
        }
      }
      return false;
    },
    [w, h, pieceDefsById, targetMask, obstacleMask]
  );

  // ------------------------------
  // Acciones sobre piezas
  // ------------------------------
  const rotatePiece = useCallback(
    (pieceId, delta = 90) => {
      if (!level.allowRotate) return;
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      setPiecesState((prev) =>
        prev.map((p) => {
          if (p.id !== pieceId) return p;
          const nextRot = (p.rot + delta + 360) % 360;

          // Si ya está colocada: solo permita rotar si sigue siendo válida (obstáculos/bordes)
          if (p.placed) {
            if (!canPlace(pieceId, p.x, p.y, nextRot)) {
              safePlay(sounds.incorrect, 0.6);
              return p;
            }
            // rotación = reconfiguración (cuenta como reubicación)
            setRepositions((r) => r + 1);
          }
          safePlay(sounds.click, 0.4);
          return { ...p, rot: nextRot };
        })
      );
    },
    [level.allowRotate, paused, gameState, canPlace, safePlay]
  );

  const flipPiece = useCallback(
  (pieceId) => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;

    setPiecesState((prev) =>
      prev.map((p) => {
        if (p.id !== pieceId) return p;

        const nextFlip = !p.flip;

        // Si está colocada, solo permitir si sigue siendo válida
        if (p.placed) {
          const def = pieceDefsById[pieceId];
          if (!def) return p;

          const cells = transformCells(def.cells, p.rot, nextFlip);
          for (const c of cells) {
            const bx = p.x + c.x;
            const by = p.y + c.y;
            if (bx < 0 || bx >= w || by < 0 || by >= h) {
              safePlay(sounds.incorrect, 0.6);
              return p;
            }
            if (obstacleMask[by][bx]) {
              safePlay(sounds.incorrect, 0.6);
              return p;
            }
          }

          setRepositions((r) => r + 1);
        }

        safePlay(sounds.click, 0.4);
        return { ...p, flip: nextFlip };
      })
    );
  },
  [paused, gameState, pieceDefsById, w, h, obstacleMask, safePlay]
);


  const returnToTray = useCallback(
    (pieceId) => {
      if (paused || gameState !== GAME_STATE.PLAYING) return;
      setPiecesState((prev) => prev.map((p) => (p.id === pieceId ? { ...p, placed: false } : p)));
      safePlay(sounds.click, 0.4);
    },
    [paused, gameState, safePlay]
  );

  const placePiece = useCallback(
    (pieceId, anchorX, anchorY) => {
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      setPiecesState((prev) => {
        const piece = prev.find((p) => p.id === pieceId);
        if (!piece) return prev;

        const ok = canPlace(pieceId, anchorX, anchorY, piece.rot);
        if (!ok) {
          safePlay(sounds.incorrect, 0.7);
          // penalización por intento inválido: pierde vida
          setLives((lv) => Math.max(0, lv - 1));
          return prev;
        }

        const next = prev.map((p) => {
          if (p.id !== pieceId) return p;

          const isReposition =
            p.placed && (p.x !== anchorX || p.y !== anchorY || p.rot !== piece.rot);

          if (isReposition) setRepositions((r) => r + 1);

          return { ...p, placed: true, x: anchorX, y: anchorY };
        });

        // evento de superposición (por evento)
        const overlapEvent = willIntroduceOverlapEventInTarget(next);
        if (overlapEvent) setOverlapEvents((e) => e + 1);

        safePlay(sounds.correct, 0.55);
        return next;
      });
    },
    [paused, gameState, canPlace, safePlay, willIntroduceOverlapEventInTarget]
  );

  // ------------------------------
  // Drag & drop (pointer) minimalista y robusto
  // - Sin HTML5 drag para evitar inconsistencias.
  // ------------------------------
  const boardRef = useRef(null);
  const dragRef = useRef({
    active: false,
    pieceId: null,
    ghostCell: null, // {x,y}
  });

  const pointerToBoardCell = useCallback(
  (clientX, clientY) => {
    const el = boardRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    // Lee padding real (evita hardcode 10px)
    const cs = window.getComputedStyle(el);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;

    const zoom = 1.15;

    const xPx = clientX - rect.left - padL;
    const yPx = clientY - rect.top - padT;

    const x = Math.floor(xPx / cellSizePx);
    const y = Math.floor(yPx / cellSizePx);

    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    return { x, y };
  },
  [cellSizePx, w, h]
);


  const onPiecePointerDown = useCallback(
    (e, pieceId) => {
      if (paused || gameState !== GAME_STATE.PLAYING) return;
      e.preventDefault();
      e.stopPropagation();

      dragRef.current.active = true;
      dragRef.current.pieceId = pieceId;
      dragRef.current.ghostCell = null;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {}

      safePlay(sounds.click, 0.4);
    },
    [paused, gameState, safePlay]
  );

  const onPiecePointerMove = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      const cell = pointerToBoardCell(e.clientX, e.clientY);
      dragRef.current.ghostCell = cell;
    },
    [paused, gameState, pointerToBoardCell]
  );

  const onPiecePointerUp = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      const pieceId = dragRef.current.pieceId;
      const ghost = dragRef.current.ghostCell;

      dragRef.current.active = false;
      dragRef.current.pieceId = null;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (!pieceId) return;

      if (!ghost) {
        // soltar fuera del tablero -> bandeja
        returnToTray(pieceId);
        return;
      }

      placePiece(pieceId, ghost.x, ghost.y);
    },
    [paused, gameState, placePiece, returnToTray]
  );

  const ghost = dragRef.current.active ? dragRef.current.ghostCell : null;
  const ghostPieceId = dragRef.current.active ? dragRef.current.pieceId : null;

  const ghostOk = useMemo(() => {
    if (!ghost || !ghostPieceId) return null;
    const p = piecesState.find((x) => x.id === ghostPieceId);
    if (!p) return null;
    return canPlace(ghostPieceId, ghost.x, ghost.y, p.rot);
  }, [ghost, ghostPieceId, piecesState, canPlace]);

  // ------------------------------
  // Game over por vidas
  // ------------------------------
  const calculateFinalMetrics = useCallback(() => {
  // 1. Capturamos lo que está pasando en el nivel que NO se ha terminado aún
  const currentLevelProgress = {
    timeMs: levelStartTime ? Date.now() - levelStartTime : 0,
    ipv: metrics.ipv || 0,
    uncoveredCells: metrics.uncoveredCells || 0,
    overlapEvents: overlapEvents || 0,
    repositions: repositions || 0
  };

  // 2. Combinamos los niveles ya guardados con el nivel actual
  // Esto asegura que si completó 2 niveles y perdió en el 3ero, se sumen los 3.
  const allStats = [...levelStats, currentLevelProgress];

  const totalTimeMs = allStats.reduce((sum, s) => sum + s.timeMs, 0);
  
  // El IPV es un promedio de la precisión de todos los niveles jugados
  const avgIpv = allStats.reduce((sum, s) => sum + s.ipv, 0) / allStats.length;
  
  const totalOverlap = allStats.reduce((sum, s) => sum + s.overlapEvents, 0);
  const totalUncovered = allStats.reduce((sum, s) => sum + s.uncoveredCells, 0);
  const totalRepositions = allStats.reduce((sum, s) => sum + s.repositions, 0);

  return {
    // Estos nombres deben ser EXACTOS a como los lee tu formatMetrics en el config.js
    indice_precision_visoconstructiva_ipv: avgIpv,
    tiempo_total_construccion_ms: totalTimeMs,
    errores_superposicion_eventos: totalOverlap,
    espacios_no_cubiertos_total: totalUncovered,
    reubicaciones_piezas: totalRepositions,
    // IMPORTANTE: Agregamos 'score' explícitamente para que el resumen no marque 0
    score: Math.round(avgIpv * 1000) 
  };
}, [levelStats, metrics, overlapEvents, repositions, levelStartTime]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver, 0.9);
    setGameState(GAME_STATE.GAME_OVER);

    const payload = calculateFinalMetrics();
    if (onGameOver) onGameOver(payload);
  }, [calculateFinalMetrics, onGameOver, safePlay]);

  useEffect(() => {
    if (lives > 0) return;
    if (gameState === GAME_STATE.GAME_OVER) return;
    if (gameState === GAME_STATE.COUNTDOWN) return;
    endGame();
  }, [lives, gameState, endGame]);

  // ------------------------------
  // Resolver nivel: cuando solved => FEEDBACK => NEXT_LEVEL o endGame
  // ------------------------------
  useEffect(() => {
    if (paused) return;
    if (gameState !== GAME_STATE.PLAYING) return;
    if (!metrics.solved) return;

    const tEnd = Date.now();
    setLevelEndTime(tEnd);

    const timeMs = levelStartTime ? Math.max(0, tEnd - levelStartTime) : 0;

    // guardar stats del nivel
    setLevelStats((prev) => [
      ...prev,
      {
        levelId: level.id,
        timeMs: levelStartTime ? Math.max(0, Date.now() - levelStartTime) : 0,
        ipv: metrics.ipv,
        uncoveredCells: metrics.uncoveredCells, 
        overlapEvents: overlapEvents,
        repositions: repositions,
      },
    ]);

    setGameState(GAME_STATE.FEEDBACK);
    safePlay(sounds.win, 0.85);

    setPausableTimeout(() => {
      const nextIndex = levelIndex + 1;
      if (nextIndex >= levelsData.length) {
        endGame();
      } else {
        setLevelIndex(nextIndex);
        setGameState(GAME_STATE.NEXT_LEVEL);
      }
    }, FEEDBACK_DELAY);
  }, [
    paused,
    gameState,
    metrics.solved,
    metrics.ipv,
    metrics.overlapCellsTarget,
    metrics.uncoveredCells,
    levelStartTime,
    overlapEvents,
    repositions,
    level.id,
    levelIndex,
    safePlay,
    setPausableTimeout,
    endGame,
  ]);

  useEffect(() => {
    if (paused) return;
    if (gameState !== GAME_STATE.NEXT_LEVEL) return;
    setGameState(GAME_STATE.START_LEVEL);
  }, [gameState, paused]);

  // ------------------------------
  // Render helpers
  // ------------------------------
  const boardCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const isTarget = targetMask[y][x];
        const isObstacle = obstacleMask[y][x];
        const o = occ[y][x];

        let cls = styles.cell;
        if (isTarget) cls += ` ${styles.cellTarget}`;
        if (isObstacle) cls += ` ${styles.cellObstacle}`;
        if (isTarget && !isObstacle && o === 0) cls += ` ${styles.cellUncovered}`;
        if (o >= 2) cls += ` ${styles.cellOverlap}`;

        cells.push(
          <div
            key={`${x}-${y}`}
            className={cls}
            style={{ width: cellSizePx, height: cellSizePx }}
          />
        );
      }
    }
    return cells;
  }, [w, h, targetMask, obstacleMask, occ, cellSizePx]);

  const placedPieces = useMemo(() => piecesState.filter((p) => p.placed), [piecesState]);
  const trayPieces = useMemo(() => piecesState.filter((p) => !p.placed), [piecesState]);

  const renderPiece = useCallback(
    (p, isGhost = false, ghostX = 0, ghostY = 0, ghostOkFlag = true) => {
      const def = pieceDefsById[p.id];
      if (!def) return null;

      const cells = transformCells(def.cells, p.rot, p.flip)

      let maxX = 0,
        maxY = 0;
      for (const c of cells) {
        if (c.x > maxX) maxX = c.x;
        if (c.y > maxY) maxY = c.y;
      }

      const pieceWpx = (maxX + 1) * cellSizePx;
      const pieceHpx = (maxY + 1) * cellSizePx;

      const TRAY_BOX_PX = 120; // AJUSTE: debe coincidir aprox con .traySlot width/height (p. ej. 120 o 140)

const stylePos = (() => {
  if (isGhost) {
    return {
      position: "absolute",
      left: ghostX * cellSizePx,
      top: ghostY * cellSizePx,
      width: pieceWpx,
      height: pieceHpx,
    };
  }

  if (p.placed) {
    return {
      position: "absolute",
      left: p.x * cellSizePx,
      top: p.y * cellSizePx,
      width: pieceWpx,
      height: pieceHpx,
    };
  }

  // ✅ PIEZA EN BANDEJA: escalar para que quepa en el cuadro sombreado
  const scale = Math.min(1, (TRAY_BOX_PX - 18) / Math.max(pieceWpx, pieceHpx)); // -18 para margen y botones
  return {
    position: "relative",
  width: TRAY_BOX_PX,
  height: TRAY_BOX_PX,
    
  };
})();




      const baseCls = isGhost
        ? `${styles.pieceGhost} ${ghostOkFlag ? styles.pieceGhostOk : styles.pieceGhostBad}`
        : styles.piece;

      return (
  <div
    key={`${p.id}-${isGhost ? "ghost" : "real"}`}
    className={baseCls}
    style={{
      ...stylePos,
      touchAction: "none",
      pointerEvents: isGhost ? "none" : "auto",
    }}
    onPointerDown={isGhost ? undefined : (e) => onPiecePointerDown(e, p.id)}
    onPointerMove={isGhost ? undefined : onPiecePointerMove}
    onPointerUp={isGhost ? undefined : onPiecePointerUp}
  >




    {/* ✅ CUERPO DE LA PIEZA (ESTO ES LO ÚNICO QUE SE ESCALA EN BANDEJA) */}
    <div
      className={styles.pieceBody}
      style={
        (!isGhost && !p.placed)
          ? (() => {
              const TRAY_BOX_PX = 120;
              const scale = Math.min(1, (TRAY_BOX_PX - 24) / Math.max(pieceWpx, pieceHpx));
              return {
                width: pieceWpx,
                height: pieceHpx,
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: "center",
              };
            })()
          : { width: pieceWpx, height: pieceHpx, position: "relative" }
      }
    >
      {cells.map((c, idx) => (
        <div
          key={idx}
          className={isGhost ? styles.pieceCellGhost : styles.pieceCell}
          style={{
            position: "absolute",
            left: c.x * cellSizePx,
            top: c.y * cellSizePx,
            width: cellSizePx,
            height: cellSizePx,
            background: def.color,
          }}
        />
      ))}
    </div>
  </div>
);

    },
    [
      pieceDefsById,
      cellSizePx,
      level.allowRotate,
      paused,
      gameState,
      onPiecePointerDown,
      onPiecePointerMove,
      onPiecePointerUp,
      rotatePiece,
      flipPiece,
      returnToTray,
    ]
  );

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && countdown !== null && (
        <div className={styles.countdown}>{countdown}</div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && (
        <>
          <header className={styles.hud}>
            <div>Nivel: {levelIndex + 1}</div>
            <div>Vidas: {"❤️".repeat(Math.max(0, lives))}{"🤍".repeat(Math.max(0, gameSettings.startingLives - lives))}</div>
            <div>IPV: {metrics.ipv.toFixed(3)}</div>
          </header>

          <div className={styles.layout}>
  <main className={styles.boardWrap}>
    <div
      ref={boardRef}
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${w}, ${cellSizePx}px)`,
        gridTemplateRows: `repeat(${h}, ${cellSizePx}px)`,
        width: w * cellSizePx,
        height: h * cellSizePx,
        ...(paused ? { pointerEvents: "none", filter: "grayscale(0.15)", opacity: 0.9 } : {}),
      }}
    >
      {boardCells}

      <div
        className={styles.piecesLayer}
        style={{ width: w * cellSizePx, height: h * cellSizePx }}
      >
        {placedPieces.map((p) => renderPiece(p))}
        {ghost && ghostPieceId ? (
          (() => {
            const p = piecesState.find((x) => x.id === ghostPieceId);
            if (!p) return null;
            return renderPiece(p, true, ghost.x, ghost.y, !!ghostOk);
          })()
        ) : null}
      </div>
    </div>
  </main>

  <div className={styles.trayWrap}>
    <div className={styles.trayTitle}>Piezas</div>
    <div className={styles.tray}>
      {trayPieces.map((p) => (
        <div key={p.id} className={styles.traySlot}>
  {/* CONTROLES ANCLADOS AL CUADRO SOMBREADO */}
  <div className={styles.trayControls}>
    {level.allowRotate ? (
      <button
        type="button"
        className={styles.rotateBtn}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); rotatePiece(p.id, 90); }}
        disabled={paused || gameState !== GAME_STATE.PLAYING}
        title="Rotar"
      >
        ⟳
      </button>
    ) : null}

    <button
      type="button"
      className={styles.flipBtn}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); flipPiece(p.id); }}
      disabled={paused || gameState !== GAME_STATE.PLAYING}
      title="Espejo"
    >
      ⇋
    </button>
  </div>

  {/* PIEZA (PUEDE ESCALAR) */}
  {renderPiece(p)}
</div>

      ))}
    </div>

    <div className={styles.hint}>
      Arrastre una pieza al tablero. Tecla <b>Esc</b> para pausar.
    </div>
  </div>
</div>

        </>
      )}

      <PauseMenu
        visible={paused}
        onResume={resumeGame}
        onRestart={() => {
          clearAllTimeouts();
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setPaused(false);
          setLives(gameSettings.startingLives);
          setLevelIndex(0);
          setLevelStats([]);
          setPiecesState(initialPiecesState);
          setOverlapEvents(0);
          setRepositions(0);
          setLevelStartTime(null);
          setLevelEndTime(null);
          setGameState(GAME_STATE.COUNTDOWN);
        }}
        onToggleSound={toggleSound}
        isSoundEnabled={soundEnabled}
      />
    </div>
  );
}
