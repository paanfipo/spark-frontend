// src/pages/MatricesProgresivas/MatricesProgresivas.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styles from './MatricesProgresivas.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

/**
 * =========================
 * 1) Parámetros base
 * =========================
 * Mantengo sus SHAPES/COLORS, pero el modelo por reglas permite crecer
 * sin depender de color como "regla barata". Use color con moderación:
 * en Raven auténtico, el distractor no debe ser eliminable por "pop-out".
 */
const SHAPES = ['circle', 'square', 'triangle', 'diamond'];
const COLORS = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];

const MAX_LEVEL = 10;
const OPTIONS_COUNT = 6; // Raven típico: 6-8 opciones. Suba a 8 si su UI lo soporta.

const clamp360 = (deg) => ((deg % 360) + 360) % 360;

/**
 * =========================
 * 2) RNG determinista por nivel
 * =========================
 * Evita ítems "inestables" y facilita depuración/validación.
 * (LCG simple; suficiente para un juego, no criptográfico).
 */
const makeRng = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
};

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const pickInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

/**
 * =========================
 * 3) Modelo de celda
 * =========================
 * Alineado a RPM: una celda es un objeto con atributos manipulables por reglas.
 * Si luego migra a SVG/layers, puede extender aquí sin cambiar el motor lógico.
 */
const normalizeCell = (cell) => ({
  shape: cell.shape ?? 'square',
  color: cell.color ?? COLORS[0],
  count: Math.max(1, Math.min(4, cell.count ?? 1)),
  rotation: clamp360(cell.rotation ?? 0),
});

const serializeCell = (cell) => JSON.stringify(normalizeCell(cell));

/**
 * =========================
 * 4) Operadores y reglas (familias tipo Raven)
 * =========================
 * Importante: aquí está el salto "no trivial".
 * Las reglas se representan explícitamente para permitir:
 * - composición (2-3 reglas simultáneas)
 * - distractores que violan 1 regla específica
 * - escalamiento SRPM -> ARPM
 */
const OPS = {
  ROTATE: (cell, delta) => ({ ...cell, rotation: clamp360(cell.rotation + delta) }),
  SET_ROTATION: (cell, deg) => ({ ...cell, rotation: clamp360(deg) }),
  SET_COUNT: (cell, n) => ({ ...cell, count: Math.max(1, Math.min(4, n)) }),
  SET_SHAPE: (cell, shape) => ({ ...cell, shape }),
  SET_COLOR: (cell, color) => ({ ...cell, color }),
};

const RULE_TYPES = {
  // Progresión por columna: rotación base + step*col (típico SRPM)
  ROTATION_BY_COL: 'ROTATION_BY_COL',
  // Progresión por fila: conteo base + row (típico SRPM)
  COUNT_BY_ROW: 'COUNT_BY_ROW',
  // Distribución sin repetición por fila (latin-like): shapes o colors
  DISTRIBUTION_SHAPE_ROW: 'DISTRIBUTION_SHAPE_ROW',
  DISTRIBUTION_COLOR_ROW: 'DISTRIBUTION_COLOR_ROW',
  // Composición simple (tipo "A+B=C") en un atributo discreto (ARPM-like)
  SHAPE_COMPOSITION_ROW: 'SHAPE_COMPOSITION_ROW',
  // XOR lógico en atributo binario derivado (ARPM-like; aquí lo aproximamos con shape cycling)
  ROTATION_XORISH_ROW: 'ROTATION_XORISH_ROW',
};

/**
 * =========================
 * 5) Plantillas SRPM vs ARPM (sin copiar ítems)
 * =========================
 * Estructura típica:
 * - SRPM: 1-2 reglas, atributos simples, progresión/distribución
 * - ARPM: 2-3 reglas, interacción entre reglas, composición / pseudo-XOR
 *
 * Cada plantilla produce:
 * - rules: lista de reglas explícitas
 * - base: celda semilla
 */
const getTemplateByLevel = (level, rng) => {
  // Control de complejidad por nivel.
  // 1-3: SRPM básico (1 regla + distractores simples)
  // 4-6: SRPM intermedio (2 reglas independientes)
  // 7-10: ARPM-like (2-3 reglas con interacción/composición)
  if (level <= 3) {
    const t = pick(rng, ['SRPM_ROT', 'SRPM_COUNT', 'SRPM_DIST_SHAPE']);
    if (t === 'SRPM_ROT') {
      return {
        label: 'SRPM_ROT',
        rules: [{ type: RULE_TYPES.ROTATION_BY_COL, step: 90 }],
      };
    }
    if (t === 'SRPM_COUNT') {
      return {
        label: 'SRPM_COUNT',
        rules: [{ type: RULE_TYPES.COUNT_BY_ROW, base: 1 }],
      };
    }
    return {
      label: 'SRPM_DIST_SHAPE',
      rules: [{ type: RULE_TYPES.DISTRIBUTION_SHAPE_ROW }],
    };
  }

  if (level <= 6) {
    const t = pick(rng, ['SRPM_ROT+COUNT', 'SRPM_DIST_SHAPE+ROT', 'SRPM_DIST_COLOR+COUNT']);
    if (t === 'SRPM_ROT+COUNT') {
      return {
        label: 'SRPM_ROT+COUNT',
        rules: [
          { type: RULE_TYPES.ROTATION_BY_COL, step: 90 },
          { type: RULE_TYPES.COUNT_BY_ROW, base: 1 },
        ],
      };
    }
    if (t === 'SRPM_DIST_SHAPE+ROT') {
      return {
        label: 'SRPM_DIST_SHAPE+ROT',
        rules: [
          { type: RULE_TYPES.DISTRIBUTION_SHAPE_ROW },
          { type: RULE_TYPES.ROTATION_BY_COL, step: 90 },
        ],
      };
    }
    return {
      label: 'SRPM_DIST_COLOR+COUNT',
      rules: [
        { type: RULE_TYPES.DISTRIBUTION_COLOR_ROW },
        { type: RULE_TYPES.COUNT_BY_ROW, base: 1 },
      ],
    };
  }

  // 7-10: ARPM-like

  const t = pick(rng, [
    'ARPM_COMP_SHAPE+ROT',
    'ARPM_PSEUDOXOR_ROT+COUNT'
  ]);

  if (t === 'ARPM_COMP_SHAPE+ROT') {
    return {
      label: 'ARPM_COMP_SHAPE+ROT',
      rules: [
        { type: RULE_TYPES.SHAPE_COMPOSITION_ROW },
        { type: RULE_TYPES.ROTATION_BY_COL, step: 90 },
      ],
    };
  }

  return {
    label: 'ARPM_PSEUDOXOR_ROT+COUNT',
    rules: [
      { type: RULE_TYPES.ROTATION_XORISH_ROW },
      { type: RULE_TYPES.COUNT_BY_ROW, base: 1 },
    ],
  };
};

/**
 * =========================
 * 6) Motor de generación de matriz (3x3)
 * =========================
 * Clave: NO construimos "cells[8]" para luego copiar:
 * generamos por reglas con semilla; la respuesta es derivada.
 *
 * Para reglas de composición tipo A+B=C:
 * - Col0 y Col1 determinan Col2 por función de composición (fila a fila)
 */
const buildMatrix3x3 = (level) => {
  const rng = makeRng(1000 + level * 7919);
  const template = getTemplateByLevel(level, rng);

  const base = normalizeCell({
    shape: pick(rng, SHAPES),
    color: pick(rng, COLORS),
    count: 1,
    rotation: pick(rng, [0, 90, 180, 270]),
  });

  // Preconstrucción: para reglas de distribución necesitamos "tablas" por fila.
  const shapeRowPools = Array.from({ length: 3 }, () => {
    const arr = [...SHAPES].sort(() => rng() - 0.5);
    return arr.slice(0, 3);
  });

  const colorRowPools = Array.from({ length: 3 }, () => {
    const arr = [...COLORS].sort(() => rng() - 0.5);
    return arr.slice(0, 3);
  });

  // Para composición de shape: definimos una operación cerrada en SHAPES:
  // shape(C) = SHAPES[(idx(A)+idx(B)) mod |SHAPES|], con A,B de col0/col1.
  // Esto es "estructuralmente Raven": dependencia relacional A,B -> C.
  const composeShape = (shapeA, shapeB) => {
    const a = SHAPES.indexOf(shapeA);
    const b = SHAPES.indexOf(shapeB);
    return SHAPES[(a + b) % SHAPES.length];
  };

  // Para pseudo-XOR de rotación por fila:
  // rot(C) = rot(A) XORish rot(B): usamos suma modular en pasos de 90.
  const composeRotationXorish = (rotA, rotB) => {
    const a = (clamp360(rotA) / 90) % 4;
    const b = (clamp360(rotB) / 90) % 4;
    return clamp360(((a ^ b) % 4) * 90);
  };

  // Construimos matriz celda a celda.
  const cells = Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    let cell = { ...base };

    // Regla base: variación ligera para evitar matriz "plana"
    // (no cuenta como regla inferencial; es un offset controlado).
    if (level >= 4) {
      cell = OPS.SET_COLOR(cell, colorRowPools[row][0]);
    }

    // Aplicación de reglas independientes (progresión/distribución)
    template.rules.forEach((r) => {
      if (r.type === RULE_TYPES.ROTATION_BY_COL) {
        cell = OPS.SET_ROTATION(cell, clamp360(base.rotation + col * r.step));
      }
      if (r.type === RULE_TYPES.COUNT_BY_ROW) {
        cell = OPS.SET_COUNT(cell, r.base + row);
      }
      if (r.type === RULE_TYPES.DISTRIBUTION_SHAPE_ROW) {
        cell = OPS.SET_SHAPE(cell, shapeRowPools[row][col]);
      }
      if (r.type === RULE_TYPES.DISTRIBUTION_COLOR_ROW) {
        cell = OPS.SET_COLOR(cell, colorRowPools[row][col]);
      }
    });

    return normalizeCell(cell);
  });

  // Reglas relacionales (composición) se aplican después porque dependen de col0/col1.
  // Aplicación fila por fila.
  if (template.rules.some(r => r.type === RULE_TYPES.SHAPE_COMPOSITION_ROW)) {
    for (let row = 0; row < 3; row++) {
      const idxA = row * 3 + 0;
      const idxB = row * 3 + 1;
      const idxC = row * 3 + 2;
      const a = cells[idxA];
      const b = cells[idxB];
      cells[idxC] = normalizeCell({ ...cells[idxC], shape: composeShape(a.shape, b.shape) });
    }
  }

  if (template.rules.some(r => r.type === RULE_TYPES.ROTATION_XORISH_ROW)) {
    for (let row = 0; row < 3; row++) {
      const idxA = row * 3 + 0;
      const idxB = row * 3 + 1;
      const idxC = row * 3 + 2;
      const a = cells[idxA];
      const b = cells[idxB];
      cells[idxC] = normalizeCell({ ...cells[idxC], rotation: composeRotationXorish(a.rotation, b.rotation) });
    }
  }

  const correctAnswer = { ...cells[8] };
  cells[8] = null;

  return { cells, correctAnswer, templateLabel: template.label, rules: template.rules };
};

/**
 * =========================
 * 7) Validador ligero (consistencia y unicidad mínima)
 * =========================
 * No implemento un "solver" exhaustivo (sería más largo), pero sí:
 * - evitar duplicados
 * - generar distractores que violan 1 regla específica
 * - filtrar distractores idénticos al correcto
 */
const makeDistractorViolatingRule = (correct, rule, rng, context) => {
  const c = normalizeCell(correct);

  // Estrategia: violar SOLO 1 regla (o lo más cerca posible),
  // preservando el resto para que el distractor sea plausible.
  switch (rule.type) {
    case RULE_TYPES.ROTATION_BY_COL: {
      // Rotación incorrecta (desfase 90 o 180)
      const delta = pick(rng, [90, 180, 270]);
      return normalizeCell({ ...c, rotation: clamp360(c.rotation + delta) });
    }
    case RULE_TYPES.COUNT_BY_ROW: {
      // Conteo incorrecto
      const alt = pick(rng, [1, 2, 3, 4].filter(x => x !== c.count));
      return normalizeCell({ ...c, count: alt });
    }
    case RULE_TYPES.DISTRIBUTION_SHAPE_ROW:
    case RULE_TYPES.SHAPE_COMPOSITION_ROW: {
      // Forma incorrecta pero "cercana"
      const alt = pick(rng, SHAPES.filter(s => s !== c.shape));
      return normalizeCell({ ...c, shape: alt });
    }
    case RULE_TYPES.DISTRIBUTION_COLOR_ROW: {
      const alt = pick(rng, COLORS.filter(x => x !== c.color));
      return normalizeCell({ ...c, color: alt });
    }
    case RULE_TYPES.ROTATION_XORISH_ROW: {
      // Rotación incorrecta manteniendo el resto
      const alt = pick(rng, [0, 90, 180, 270].filter(x => x !== c.rotation));
      return normalizeCell({ ...c, rotation: alt });
    }
    default: {
      // Fallback: perturbación combinada
      return normalizeCell({
        ...c,
        shape: pick(rng, SHAPES.filter(s => s !== c.shape)),
        rotation: pick(rng, [0, 90, 180, 270].filter(x => x !== c.rotation)),
      });
    }
  }
};

const generateOptions = (correctAnswer, rules, level) => {
  const rng = makeRng(50000 + level * 104729);
  const correct = normalizeCell(correctAnswer);

  const options = [];
  const seen = new Set();

  const pushUnique = (cell) => {
    const key = serializeCell(cell);
    if (!seen.has(key)) {
      seen.add(key);
      options.push(normalizeCell(cell));
    }
  };

  // 1) incluir correcto
  pushUnique(correct);

  // 2) distractores “uno por regla” (hasta cubrir el número deseado)
  for (const r of rules) {
    if (options.length >= OPTIONS_COUNT) break;
    const d = makeDistractorViolatingRule(correct, r, rng, { level });
    pushUnique(d);
  }

  // 3) si faltan opciones, añadir distractores plausibles adicionales
  // (violan combinaciones pequeñas, pero evitando duplicados)
  while (options.length < OPTIONS_COUNT) {
    const d = normalizeCell({
      ...correct,
      shape: pick(rng, SHAPES),
      rotation: pick(rng, [0, 90, 180, 270]),
      count: pickInt(rng, 1, 4),
      color: (level >= 6) ? pick(rng, COLORS) : correct.color, // en niveles altos, color puede variar
    });
    if (serializeCell(d) !== serializeCell(correct)) pushUnique(d);
  }

  // 4) mezclar
  options.sort(() => rng() - 0.5);

  // 5) índice correcto
  const correctIndex = options.findIndex(o => serializeCell(o) === serializeCell(correct));
  return { options, correctIndex };
};

/**
 * =========================
 * 8) Adaptación: nuevo generateMatrixData(level)
 * =========================
 * Sustituye su versión anterior sin cambiar el resto de la UI.
 */
const generateMatrixData = (level) => {
  const { cells, correctAnswer, templateLabel, rules } = buildMatrix3x3(level);
  const { options, correctIndex } = generateOptions(correctAnswer, rules, level);

  return {
    cells,
    options,
    correctIndex,
    meta: {
      templateLabel,
      rules,
    },
  };
};

/**
 * =========================
 * 9) Figura (se mantiene su renderer CSS)
 * =========================
 * Nota: En niveles avanzados, la rotación por 90° es más “Raven-like”
 * que rotación continua. Ya lo restringimos a [0,90,180,270].
 */
const Figure = ({ data }) => {
  if (!data) return null;
  const cell = normalizeCell(data);

  return (
    <div className={`${styles.figureContainer} ${styles[`count-${cell.count}`]}`}>
      {Array.from({ length: cell.count }).map((_, i) => (
        <div
          key={i}
          className={`${styles.shape} ${styles[cell.shape]}`}
          style={{
            backgroundColor: cell.shape !== 'triangle' ? cell.color : 'transparent',
            borderBottomColor: cell.shape === 'triangle' ? cell.color : undefined,
            transform: `rotate(${cell.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default function MatricesProgresivas({ onGameOver }) {
  const [gameState, setGameState] = useState('countdown');
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [level, setLevel] = useState(1);
  const [matrix, setMatrix] = useState(null);
  const [notification, setNotification] = useState('Observe la matriz y deduzca la regla.');
  const [metrics, setMetrics] = useState({ total: 0, correct: 0, errors: 0, reactionTimes: [] });

  const countdownRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeoutsRef = useRef([]);

  const safePlay = useCallback((snd) => {
    if (soundEnabled) playSound(snd);
  }, [soundEnabled]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [clearAllTimeouts]);

  // Cuenta regresiva inicial
  useEffect(() => {
    if (gameState !== 'countdown') return;

    setMatrix(null);
    setLevel(1);
    setMetrics({ total: 0, correct: 0, errors: 0, reactionTimes: [] });
    setNotification('Observe la matriz y deduzca la regla.');

    let timeLeft = 3;
    setCountdown(3);
    safePlay(sounds.start);

    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft > 0 ? timeLeft : null);
      if (timeLeft === 0) {
        clearInterval(countdownRef.current);
        setGameState('playing');
      }
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay]);

  // Generar matriz cuando entra a playing y no hay matriz
  useEffect(() => {
    if (gameState === 'playing' && !paused && !matrix) {
      const newMatrix = generateMatrixData(level);
      setMatrix(newMatrix);
      startTimeRef.current = Date.now();
    }
  }, [gameState, level, paused, matrix]);

  const finishGame = useCallback(() => {
    const { total, correct, errors, reactionTimes } = metrics;
    const precision = total > 0 ? (correct / total) * 100 : 0;
    const rtAvg = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;

    onGameOver?.({
      precision_matrices_pct: +precision.toFixed(2),
      tiempo_medio_resolucion_ms: +rtAvg.toFixed(2),
      tasa_errores_logicos_pct: total > 0 ? +((errors / total) * 100).toFixed(2) : 0,
      nivel_maximo_complejidad: level,
      // Metadato útil para análisis (opcional):
      // familia_rpm: matrix?.meta?.templateLabel
    });

    setGameState('game_over');
  }, [metrics, level, onGameOver]);

  const handleAnswer = (index) => {
    if (gameState !== 'playing' || paused || !matrix) return;

    const rt = Date.now() - startTimeRef.current;
    const isCorrect = index === matrix.correctIndex;

    safePlay(isCorrect ? sounds.correct : sounds.incorrect);

    setMetrics(prev => ({
      ...prev,
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      errors: prev.errors + (isCorrect ? 0 : 1),
      reactionTimes: [...prev.reactionTimes, rt],
    }));

    setNotification(isCorrect ? 'Respuesta correcta.' : 'Respuesta incorrecta.');

    // Forzar nueva generación
    setMatrix(null);

    const tid = setTimeout(() => {
      if (level >= MAX_LEVEL) {
        finishGame();
      } else {
        setNotification('Observe la matriz y deduzca la regla.');
        setLevel(l => l + 1);
      }
    }, 650);

    timeoutsRef.current.push(tid);
  };

  if (gameState === 'game_over') return null;

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameShell} style={paused ? { filter: 'blur(3px)' } : undefined}>
        <button
          className={styles.pauseButton}
          onClick={() => setPaused(true)}
          disabled={gameState === 'countdown'}
        >
          Pause
        </button>

        {gameState === 'countdown' && <div className={styles.countdown}>{countdown}</div>}

        {gameState === 'playing' && matrix && (
          <>
            <div className={styles.hud}>
              Nivel {level} / {MAX_LEVEL}
            </div>

            <div className={styles.gameArea}>
              <div className={styles.displayContainer}>
                <div className={styles.viewer}>
                  <div className={styles.matrixGrid}>
                    {matrix.cells.map((cell, i) => (
                      <div key={i} className={styles.cell}>
                        {cell ? <Figure data={cell} /> : <div className={styles.empty}>?</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.instructions}>{notification}</div>

                <div className={styles.optionsContainer}>
                  {matrix.options.map((opt, i) => (
                    <button
                      key={i}
                      className={styles.optionButton}
                      onClick={() => handleAnswer(i)}
                    >
                      <Figure data={opt} />
                    </button>
                  ))}
                </div>

                {/* Si desea depuración (no visible al usuario final), habilite esto:
                <pre style={{ fontSize: 12, opacity: 0.7 }}>
                  {JSON.stringify(matrix.meta, null, 2)}
                </pre>
                */}
              </div>
            </div>
          </>
        )}
      </div>

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => setGameState('countdown')}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isSoundEnabled={soundEnabled}
      />
    </div>
  );
}
