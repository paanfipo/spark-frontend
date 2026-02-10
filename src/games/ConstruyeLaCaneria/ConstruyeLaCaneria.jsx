import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./ConstruyeLaCaneria.module.css";
import levelsData from "./maps.json";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";

import imgStraight from "./assets/pipe.png";
import imgElbow from "./assets/pipe-angle.png";
import imgT from "./assets/pipe-T.png";
import imgCross from "./assets/pipe-cross.png";

const GAME_STATE = {
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  FEEDBACK: "feedback",
  GAME_OVER: "game_over",
};

const DIR = { N: "NORTH", S: "SOUTH", E: "EAST", W: "WEST" };
const OPP = { NORTH: "SOUTH", SOUTH: "NORTH", EAST: "WEST", WEST: "EAST" };

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const idxOf = (r, c, size) => r * size + c;
const rcOf = (idx, size) => ({ r: Math.floor(idx / size), c: idx % size });
const inBounds = (r, c, size) => r >= 0 && r < size && c >= 0 && c < size;

const stepFromDir = (r, c, dir) => {
  if (dir === DIR.N) return { r: r - 1, c };
  if (dir === DIR.S) return { r: r + 1, c };
  if (dir === DIR.E) return { r, c: c + 1 };
  if (dir === DIR.W) return { r, c: c - 1 };
  return { r, c };
};

/**
 * Ajuste de orientación por sprite (tu pipe.png está vertical cuando rotation = 0)
 */
const ROT_OFFSET = {
  pipe: 90,
  "pipe-angle": 0,
  "pipe-T": 0,
  "pipe-cross": 0,
  source: 0,
  plant: 0,
};

const getPorts = (type, rotation) => {
  const off = ROT_OFFSET[type] ?? 0;
  const r = (((rotation + off) % 360) + 360) % 360;

  switch (type) {
    case "pipe":
      return r === 0 || r === 180 ? [DIR.W, DIR.E] : [DIR.N, DIR.S];

    case "pipe-angle":
      if (r === 0) return [DIR.N, DIR.E];
      if (r === 90) return [DIR.E, DIR.S];
      if (r === 180) return [DIR.S, DIR.W];
      if (r === 270) return [DIR.W, DIR.N];
      return [];

    case "pipe-T":
      if (r === 0) return [DIR.W, DIR.E, DIR.S];
      if (r === 90) return [DIR.N, DIR.S, DIR.W];
      if (r === 180) return [DIR.W, DIR.E, DIR.N];
      if (r === 270) return [DIR.N, DIR.S, DIR.E];
      return [];

    case "pipe-cross":
    case "source":
    case "plant":
      return [DIR.N, DIR.S, DIR.E, DIR.W];

    default:
      return [];
  }
};

/**
 * BFS para redes con ramificaciones.
 * visitedState evita cortar recorridos válidos (idx|from).
 */
const computeFlowDiagnostics = (grid, size) => {
  const visitedState = new Set(); // "idx|from"
  const visitedCells = new Set(); // idx
  const deadEnds = new Set(); // idx

  const sources = [];
  const plants = [];

  for (let i = 0; i < grid.length; i++) {
    const t = grid[i]?.type;
    if (t === "source") sources.push(i);
    if (t === "plant") plants.push(i);
  }

  if (sources.length === 0) {
    return { visitedCells, deadEnds, reachedAnyPlant: false };
  }

  const queue = [];
  for (const sIdx of sources) {
    const { r, c } = rcOf(sIdx, size);
    queue.push({ r, c, from: "NONE" });
  }

  while (queue.length > 0) {
    const cur = queue.shift();
    if (!inBounds(cur.r, cur.c, size)) continue;

    const idx = idxOf(cur.r, cur.c, size);
    const stateKey = `${idx}|${cur.from}`;
    if (visitedState.has(stateKey)) continue;

    const cell = grid[idx];
    if (!cell) continue;

    const ports = getPorts(cell.type, cell.rotation);

    if (cur.from !== "NONE" && !ports.includes(cur.from)) {
      visitedState.add(stateKey);
      continue;
    }

    visitedState.add(stateKey);
    visitedCells.add(idx);

    let hasValidExit = false;

    for (const p of ports) {
      const nxt = stepFromDir(cur.r, cur.c, p);
      if (!inBounds(nxt.r, nxt.c, size)) continue;

      const nIdx = idxOf(nxt.r, nxt.c, size);
      const nCell = grid[nIdx];
      if (!nCell) continue;

      const nPorts = getPorts(nCell.type, nCell.rotation);
      if (nPorts.includes(OPP[p])) {
        hasValidExit = true;
        queue.push({ r: nxt.r, c: nxt.c, from: OPP[p] });
      }
    }

    if (cell.type !== "source" && cell.type !== "plant" && !hasValidExit) {
      deadEnds.add(idx);
    }
  }

  const reachedAnyPlant = plants.some((pIdx) => visitedCells.has(pIdx));
  return { visitedCells, deadEnds, reachedAnyPlant };
};

const countStructuralErrors = (grid, size) => {
  let errors = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = idxOf(r, c, size);
      const cell = grid[idx];
      if (!cell) continue;

      const ports = getPorts(cell.type, cell.rotation);

      for (const p of ports) {
        const nxt = stepFromDir(r, c, p);

        if (!inBounds(nxt.r, nxt.c, size)) {
          errors += 1;
          continue;
        }

        const nIdx = idxOf(nxt.r, nxt.c, size);
        const nCell = grid[nIdx];
        if (!nCell) {
          errors += 1;
          continue;
        }

        const nPorts = getPorts(nCell.type, nCell.rotation);
        if (!nPorts.includes(OPP[p])) errors += 1;
      }
    }
  }

  return errors;
};

export default function ConstruyeLaCaneria({ onGameOver }) {
  // ✅ Conteo SOLO al inicio: el estado inicial es COUNTDOWN y nunca se vuelve a setear a COUNTDOWN.
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [gridSize, setGridSize] = useState(5);
  const [grid, setGrid] = useState([]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const [paused, setPaused] = useState(false);

  // Diagnóstico visual del flujo
  const [flowVisited, setFlowVisited] = useState(new Set());
  const [flowDeadEnds, setFlowDeadEnds] = useState(new Set());

  // Interacción
  const [mode, setMode] = useState("ROTATE"); // ROTATE | MOVE
  const [selectedIdx, setSelectedIdx] = useState(null);

  // Métricas
  const startTimeRef = useRef(null);
  const levelStartTimeRef = useRef(null);

  const [rotations, setRotations] = useState(0);
  const [moves, setMoves] = useState(0);
  const [structuralErrors, setStructuralErrors] = useState(0);
  const [spatialCompleteness, setSpatialCompleteness] = useState(0);
  const [levelTimes, setLevelTimes] = useState([]);

  const [soundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");

  const safePlay = useCallback(
    (snd, vol = 1) => {
      if (!soundEnabled) return;
      try {
        playSound(snd, vol);
      } catch (e) {}
    },
    [soundEnabled]
  );

  const levelDef = useMemo(() => {
    if (!Array.isArray(levelsData)) return null;
    return levelsData[currentLevel] ?? null;
  }, [currentLevel]);

  const initGrid = useCallback(() => {
    if (!levelDef) return;

    const size = levelDef.gridSize;
    if (!Number.isFinite(size) || size <= 0) return;

    const newGrid = Array(size * size).fill(null);
    if (!Array.isArray(levelDef.elements)) return;

    for (const el of levelDef.elements) {
      if (!el) continue;

      const r = el.x;
      const c = el.y;
      if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
      if (!inBounds(r, c, size)) continue;

      const idx = idxOf(r, c, size);
      const rotation = el.locked ? (el.rotation || 0) : Math.floor(Math.random() * 4) * 90;

      newGrid[idx] = {
        type: el.type,
        rotation,
        locked: !!el.locked,
      };
    }

    setGridSize(size);
    setGrid(newGrid);

    setRotations(0);
    setMoves(0);
    setSelectedIdx(null);
    setMode("ROTATE");
    setSpatialCompleteness(0);
    setStructuralErrors(0);

    setFlowVisited(new Set());
    setFlowDeadEnds(new Set());

    levelStartTimeRef.current = Date.now();
    if (!startTimeRef.current) startTimeRef.current = Date.now();
  }, [levelDef]);

  // ✅ Conteo regresivo SOLO al inicio.
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;

    let c = 3;
    setCountdown(3);
    safePlay(sounds.start, 0.8);

    const timer = setInterval(() => {
      c -= 1;
      setCountdown(c > 0 ? c : 0);

      if (c <= 0) {
        clearInterval(timer);
        setGameState(GAME_STATE.PLAYING);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, safePlay]);

  // ✅ Cada vez que estamos en PLAYING y cambia el nivel, se carga el grid.
  useEffect(() => {
    if (gameState !== GAME_STATE.PLAYING) return;
    initGrid();
  }, [gameState, currentLevel, initGrid]);

  // Métricas + diagnóstico en vivo (cada cambio del grid)
  useEffect(() => {
    if (!levelDef || grid.length === 0) return;

    const size = gridSize;
    const diag = computeFlowDiagnostics(grid, size);

    setFlowVisited(new Set(diag.visitedCells));
    setFlowDeadEnds(new Set(diag.deadEnds));

    const plantIdxs = [];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]?.type === "plant") plantIdxs.push(i);
    }

    if (Array.isArray(levelDef.answer) && levelDef.answer.length > 0) {
      const answerIdxs = levelDef.answer
        .map((a) => (a ? idxOf(a.x, a.y, size) : null))
        .filter((v) => Number.isFinite(v));

      if (answerIdxs.length > 0) {
        const reached = answerIdxs.filter((i) => diag.visitedCells.has(i)).length;
        setSpatialCompleteness(clamp01(reached / answerIdxs.length));
      } else {
        setSpatialCompleteness(0);
      }
    } else {
      const reachedPlants = plantIdxs.filter((i) => diag.visitedCells.has(i)).length;
      setSpatialCompleteness(clamp01(reachedPlants / Math.max(1, plantIdxs.length)));
    }

    setStructuralErrors(countStructuralErrors(grid, size));
  }, [grid, gridSize, levelDef]);

  const rotatePiece = useCallback(
    (idx) => {
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      const cell = grid[idx];
      if (!cell || cell.locked) return;
      if (cell.type === "source" || cell.type === "plant") return;

      safePlay(sounds.click, 0.35);
      setRotations((v) => v + 1);

      setGrid((prev) => {
        const next = prev.slice();
        next[idx] = { ...next[idx], rotation: (next[idx].rotation + 90) % 360 };
        return next;
      });
    },
    [paused, gameState, grid, safePlay]
  );

  const moveSwap = useCallback(
    (idx) => {
      if (paused || gameState !== GAME_STATE.PLAYING) return;

      const cell = grid[idx];
      if (!cell || cell.locked) return;
      if (cell.type === "source" || cell.type === "plant") return;

      if (selectedIdx == null) {
        setSelectedIdx(idx);
        safePlay(sounds.click, 0.25);
        return;
      }

      if (selectedIdx === idx) {
        setSelectedIdx(null);
        return;
      }

      const other = grid[selectedIdx];
      if (!other || other.locked) {
        setSelectedIdx(null);
        return;
      }
      if (other.type === "source" || other.type === "plant") {
        setSelectedIdx(null);
        return;
      }

      safePlay(sounds.click, 0.35);
      setMoves((v) => v + 1);

      setGrid((prev) => {
        const next = prev.slice();
        const a = { ...next[selectedIdx] };
        const b = { ...next[idx] };
        next[selectedIdx] = b;
        next[idx] = a;
        return next;
      });

      setSelectedIdx(null);
    },
    [paused, gameState, grid, selectedIdx, safePlay]
  );

  const verifyConnection = useCallback(() => {
    if (!levelDef || paused || gameState !== GAME_STATE.PLAYING) return;

    const size = gridSize;
    const diag = computeFlowDiagnostics(grid, size);

    setFlowVisited(new Set(diag.visitedCells));
    setFlowDeadEnds(new Set(diag.deadEnds));

    if (diag.reachedAnyPlant) {
      safePlay(sounds.correct);

      const timeSpent = Date.now() - (levelStartTimeRef.current || Date.now());
      setLevelTimes((prev) => [...prev, timeSpent]);

      setScore((prev) => prev + 500);
      setGameState(GAME_STATE.FEEDBACK);

      setTimeout(() => {
        if (Array.isArray(levelsData) && currentLevel < levelsData.length - 1) {
          setCurrentLevel((prev) => prev + 1);
          // ✅ Seguimos directo (NO COUNTDOWN)
          setGameState(GAME_STATE.PLAYING);

          setFlowVisited(new Set());
          setFlowDeadEnds(new Set());
        } else {
          setGameState(GAME_STATE.GAME_OVER);
        }
      }, 900);
    } else {
      safePlay(sounds.incorrect);

      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) setGameState(GAME_STATE.GAME_OVER);
        return next;
      });
    }
  }, [levelDef, paused, gameState, grid, gridSize, currentLevel, safePlay]);

  // Reporte final
  useEffect(() => {
    if (gameState !== GAME_STATE.GAME_OVER) return;

    const totalTimeMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;

    const payload = {
      game_code: "ConstruyeLaCaneria",
      score,
      niveles_completados: Array.isArray(levelsData)
        ? Math.min(currentLevel + 1, levelsData.length)
        : currentLevel + 1,
      metrics: {
        indice_completitud_espacial: spatialCompleteness,
        tiempo_total_resolucion_ms: totalTimeMs,
        numero_rotaciones: rotations,
        numero_movimientos: moves,
        errores_estructurales: structuralErrors,
        tiempos_por_nivel_ms: levelTimes,
      },
    };

    if (typeof onGameOver === "function") {
      try {
        onGameOver(payload);
      } catch (e) {}
    }
  }, [
    gameState,
    score,
    currentLevel,
    spatialCompleteness,
    rotations,
    moves,
    structuralErrors,
    levelTimes,
    onGameOver,
  ]);

  // ✅ Tablero responsivo (evita que el tablero empuje HUD/botón)
  const mainAreaRef = useRef(null);
  const [boardPx, setBoardPx] = useState(420);

  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (!rect) return;

      // espacio útil (un margen de seguridad)
      const usableW = Math.max(240, rect.width - 16);
      const usableH = Math.max(240, rect.height - 16);

      // límite superior razonable
      const px = Math.floor(Math.min(usableW, usableH, 560));
      setBoardPx(px);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!Array.isArray(levelsData) || levelsData.length === 0) return null;
  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)}>
        ⏸ Pausa
      </button>

      {/* ✅ Overlay de COUNTDOWN (solo al inicio) */}
      {gameState === GAME_STATE.COUNTDOWN && (
        <div className={styles.countdownOverlay}>
          <div className={styles.countdown}>{countdown}</div>
        </div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && grid.length > 0 && (
        <>
          <header className={styles.hud}>
            <div>Nivel: {currentLevel + 1}</div>
            <div>Puntos: {score}</div>
            <div>Vidas: {"❤️".repeat(lives)}</div>

            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === "ROTATE" ? styles.modeBtnActive : ""}`}
                onClick={() => {
                  setMode("ROTATE");
                  setSelectedIdx(null);
                }}
              >
                Rotar
              </button>
              <button
                className={`${styles.modeBtn} ${mode === "MOVE" ? styles.modeBtnActive : ""}`}
                onClick={() => {
                  setMode("MOVE");
                  setSelectedIdx(null);
                }}
              >
                Mover
              </button>
            </div>
          </header>

          <main className={styles.mainArea} ref={mainAreaRef}>
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                width: `${boardPx}px`,
                height: `${boardPx}px`,
              }}
            >
              {grid.map((cell, idx) => {
                if (!cell) return <div key={idx} className={styles.cell} />;

                const isSource = cell.type === "source";
                const isTarget = cell.type === "plant";
                const isLocked = !!cell.locked;
                const isSelected = selectedIdx === idx;

                const isFlow = flowVisited.has(idx);
                const isDead = flowDeadEnds.has(idx);

                const bg =
                  cell.type === "pipe"
                    ? imgStraight
                    : cell.type === "pipe-angle"
                    ? imgElbow
                    : cell.type === "pipe-T"
                    ? imgT
                    : cell.type === "pipe-cross"
                    ? imgCross
                    : null;

                return (
                  <div
                    key={idx}
                    className={[
                      styles.cell,
                      isSource ? styles.source : "",
                      isTarget ? styles.target : "",
                      isLocked ? styles.locked : "",
                      isSelected ? styles.selected : "",
                      isFlow ? styles.flowCell : "",
                      isDead ? styles.flowDeadEnd : "",
                    ].join(" ")}
                    onClick={() => {
                      if (isSource || isTarget) return;
                      if (mode === "MOVE") moveSwap(idx);
                      else rotatePiece(idx);
                    }}
                  >
                    {isSource && <span className={styles.icon}>💧</span>}
                    {isTarget && <span className={styles.icon}>🌿</span>}
                    {isLocked && !isSource && !isTarget && <span className={styles.lockIcon}>🔒</span>}

                    {!isSource && !isTarget && bg && (
                      <div
                        className={styles.pipeBody}
                        style={{
                          transform: `rotate(${cell.rotation}deg)`,
                          backgroundImage: `url(${bg})`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                          backgroundSize: "86% 86%",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </main>

          <footer className={styles.footer}>
            <button className={styles.checkBtn} onClick={verifyConnection}>
              VERIFICAR CONEXIÓN
            </button>
          </footer>
        </>
      )}

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => window.location.reload()}
      />
    </div>
  );
}
