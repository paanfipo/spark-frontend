import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./BalanceDeBalanza.module.css";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";
import { balanceDeBalanzaConfig, gameSettings, levelsData } from "./BalanceDeBalanza.config";

const GAME_STATE = {
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  FEEDBACK: "feedback",
  GAME_OVER: "game_over"
};

const SHAPES_ALL = [
  { key: "circle", label: "Círculo" },
  { key: "square", label: "Cuadrado" },
  { key: "triangle", label: "Triángulo" },
  { key: "star", label: "Estrella" },
  { key: "hex", label: "Hexágono" }
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countsToKey(counts, shapeKeys) {
  // clave canónica para comparar conjuntos (independiente del orden)
  return shapeKeys.map(k => `${k}:${counts[k] || 0}`).join("|");
}

function sumWeight(counts, weights) {
  let s = 0;
  for (const k of Object.keys(counts)) s += (counts[k] || 0) * weights[k];
  return s;
}

function genSide(shapeKeys, maxTerms) {
  // genera un lado con 1..maxTerms piezas en total, distribuidas entre figuras
  const total = randInt(1, maxTerms);
  const counts = {};
  let remaining = total;
  while (remaining > 0) {
    const k = shapeKeys[randInt(0, shapeKeys.length - 1)];
    counts[k] = (counts[k] || 0) + 1;
    remaining -= 1;
  }
  return counts;
}

function normalizeCounts(counts) {
  // elimina ceros
  const out = {};
  for (const [k, v] of Object.entries(counts)) {
    if (v > 0) out[k] = v;
  }
  return out;
}

function addCounts(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return normalizeCounts(out);
}

function subCounts(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) - v;
  return normalizeCounts(out);
}

function renderShapes(counts, shapeMeta, size = "md") {
  const items = [];
  for (const { key } of shapeMeta) {
    const n = counts[key] || 0;
    for (let i = 0; i < n; i++) items.push(key);
  }
  return (
    <div className={`${styles.shapesRow} ${styles[size]}`}>
      {items.map((k, idx) => (
        <ShapeIcon key={`${k}-${idx}`} shapeKey={k} />
      ))}
    </div>
  );
}

function ShapeIcon({ shapeKey }) {
  // SVG minimalista (sin librerías externas) para coherencia visual
  switch (shapeKey) {
    case "circle":
      return (
        <svg className={styles.shape} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
    case "square":
      return (
        <svg className={styles.shape} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    case "triangle":
      return (
        <svg className={styles.shape} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6l7 12H5l7-12z" />
        </svg>
      );
    case "star":
      return (
        <svg className={styles.shape} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4l2.2 5.8 6.2.4-4.8 3.7 1.7 6.1L12 16.9 6.7 20l1.7-6.1-4.8-3.7 6.2-.4L12 4z" />
        </svg>
      );
    case "hex":
      return (
        <svg className={styles.shape} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8l4 7-4 7H8l-4-7 4-7z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BalanceDeBalanza({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [paused, setPaused] = useState(false);

  const [levelIndex, setLevelIndex] = useState(0);
  const [countdown, setCountdown] = useState(gameSettings.countdownSeconds);

  const [lives, setLives] = useState(gameSettings.startingLives);
  const [score, setScore] = useState(0);

  const [trialIndex, setTrialIndex] = useState(0);
  const [trialStartMs, setTrialStartMs] = useState(null);

  const [shapeKeys, setShapeKeys] = useState([]);
  const [shapeMeta, setShapeMeta] = useState([]);

  const [weights, setWeights] = useState(null);
  const [hints, setHints] = useState([]); // ecuaciones (izq, der) en equilibrio
  const [targetLeft, setTargetLeft] = useState(null); // lado izquierdo del problema final
  const [correctRight, setCorrectRight] = useState(null); // lado derecho correcto (oculto)
  const [options, setOptions] = useState([]); // opciones de respuesta

  // métricas acumuladas
  const [resultsLog, setResultsLog] = useState([]); // {correct:boolean, rt:number|null}
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const countdownRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    try { playSound(snd, vol); } catch (e) {}
  }, []);

  const level = levelsData[levelIndex] || levelsData[levelsData.length - 1];

  const buildNewProblem = useCallback(() => {
    // 1) Selección de figuras por nivel
    const keys = SHAPES_ALL.slice(0, level.shapes).map(s => s.key);
    const meta = SHAPES_ALL.slice(0, level.shapes);

    // 2) Asignar pesos enteros aleatorios (no visibles)
    // Restricción: pesos distintos para evitar soluciones ambiguas
    const w = {};
    const used = new Set();
    for (const k of keys) {
      let val = randInt(1, 9);
      while (used.has(val)) val = randInt(1, 9);
      used.add(val);
      w[k] = val;
    }

    // 3) Generar "hints": ecuaciones balanceadas
    const eqs = [];
    let guard = 0;
    while (eqs.length < level.hintEquations && guard < 400) {
      guard++;

      const left = genSide(keys, level.maxTerms);
      const right = genSide(keys, level.maxTerms);

      const lsum = sumWeight(left, w);
      const rsum = sumWeight(right, w);

      if (lsum === rsum) {
        // Evitar duplicados triviales
        const key = `${countsToKey(left, keys)}==${countsToKey(right, keys)}`;
        const dup = eqs.some(e => `${countsToKey(e.left, keys)}==${countsToKey(e.right, keys)}` === key);
        if (!dup) eqs.push({ left: normalizeCounts(left), right: normalizeCounts(right) });
      }
    }

    // Si no pudo generar suficientes por azar (muy improbable, pero posible), degrade: use las que existan.
    // Importante: no inventa “equivalencias”; siguen siendo balanceadas por pesos.
    // 4) Generar problema final:
    // Construimos targetLeft = A + B y correctRight = C + D, garantizando igualdad por pesos.
    // Estrategia: elegir dos lados de hints y remezclarlos para formar igualdad.
    // Si no hay hints, hacemos igualdad directa duplicando el mismo lado (trivial) como fallback.
    let TL = null;
    let CR = null;

    if (eqs.length >= 2) {
      const e1 = eqs[randInt(0, eqs.length - 1)];
      const e2 = eqs[randInt(0, eqs.length - 1)];
      // TL = e1.left + e2.left ; CR = e1.right + e2.right
      TL = addCounts(e1.left, e2.left);
      CR = addCounts(e1.right, e2.right);
    } else if (eqs.length === 1) {
      const e1 = eqs[0];
      TL = addCounts(e1.left, genSide(keys, Math.max(1, level.targetTerms - 1)));
      // Ajuste: igualar pesos construyendo CR por búsqueda simple de un lado con el mismo peso que TL
      const targetSum = sumWeight(TL, w);
      let found = null;
      let tries = 0;
      while (!found && tries < 600) {
        tries++;
        const cand = genSide(keys, level.targetTerms);
        if (sumWeight(cand, w) === targetSum) found = cand;
      }
      CR = normalizeCounts(found || e1.right);
    } else {
      // fallback trivial: ambos lados iguales
      TL = genSide(keys, level.targetTerms);
      CR = normalizeCounts({ ...TL });
      eqs.push({ left: normalizeCounts(TL), right: normalizeCounts(CR) });
    }

    // 5) Opciones: 1 correcta + distractores (mismo tamaño aprox., peso distinto)
    const opts = [];
    const correctKey = countsToKey(CR, keys);
    opts.push({ counts: CR, key: correctKey, isCorrect: true });

    const targetSum = sumWeight(CR, w);
    let attempts = 0;
    while (opts.length < level.options && attempts < 1000) {
      attempts++;
      const cand = genSide(keys, level.targetTerms);
      const candN = normalizeCounts(cand);
      const k = countsToKey(candN, keys);
      if (k === correctKey) continue;

      const s = sumWeight(candN, w);
      // distractores: cercanos pero incorrectos para que no sea trivial
      const near = Math.abs(s - targetSum) <= Math.max(2, Math.floor(targetSum * 0.25));
      if (!near) continue;

      const dup = opts.some(o => o.key === k);
      if (dup) continue;

      opts.push({ counts: candN, key: k, isCorrect: false });
    }

    // Si no llenó opciones por restricciones, complete con distractores menos “cercanos”
    attempts = 0;
    while (opts.length < level.options && attempts < 1000) {
      attempts++;
      const cand = normalizeCounts(genSide(keys, level.targetTerms));
      const k = countsToKey(cand, keys);
      if (k === correctKey) continue;
      if (opts.some(o => o.key === k)) continue;
      opts.push({ counts: cand, key: k, isCorrect: false });
    }

    const shuffledOpts = shuffle(opts);

    setShapeKeys(keys);
    setShapeMeta(meta);
    setWeights(w);
    setHints(eqs);
    setTargetLeft(normalizeCounts(TL));
    setCorrectRight(normalizeCounts(CR));
    setOptions(shuffledOpts);

    setTrialStartMs(Date.now());
    setGameState(GAME_STATE.PLAYING);
  }, [level]);

  const endGame = useCallback(() => {
    // 1. Limpiar intervalos inmediatamente
    if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
    }
    
    safePlay(sounds.gameOver);

    // 2. Cálculos de métricas
    const total = resultsLog.length || 1;
    const correct = resultsLog.filter(r => r.correct).length;
    const rts = resultsLog.filter(r => r.correct && typeof r.rt === "number").map(r => r.rt);
    const meanRt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;

    const finalResults = {
        precision_inferencial_pct: Math.round((correct / total) * 100),
        tiempo_medio_resolucion_ms: meanRt,
        intentos_incorrectos: wrongAttempts,
        score
    };

    // 3. Cambiar estado local y notificar al padre
    setGameState(GAME_STATE.GAME_OVER);
    if (onGameOver) {
        onGameOver(finalResults);
    }
}, [onGameOver, resultsLog, safePlay, score, wrongAttempts]);

  const nextStep = useCallback((wasCorrect, rt) => {
    setResultsLog(prev => [...prev, { correct: wasCorrect, rt }]);

    if (!wasCorrect) {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        endGame();
        return;
      }
    }

    // progreso simple: 6 problemas por nivel
    const nextTrial = trialIndex + 1;
    const trialsPerLevel = 6;

    if (nextTrial >= trialsPerLevel) {
      // subir nivel o terminar
      if (levelIndex < levelsData.length - 1) {
        setLevelIndex(levelIndex + 1);
        setTrialIndex(0);
        setGameState(GAME_STATE.COUNTDOWN);
        setCountdown(gameSettings.countdownSeconds);
        return;
      }
      endGame();
      return;
    }

    setTrialIndex(nextTrial);
    // reconstruir problema inmediatamente
    buildNewProblem();
  }, [buildNewProblem, endGame, levelIndex, lives, trialIndex]);

 const handlePick = useCallback(
  (opt) => {
    if (paused) return;
    if (gameState !== GAME_STATE.PLAYING) return;
    if (!trialStartMs) return;

    const rt = Date.now() - trialStartMs;

    if (opt.isCorrect) {
      safePlay(sounds.click, 0.5);
      setScore((s) => s + 20 + levelIndex * 10);
      setGameState(GAME_STATE.FEEDBACK);

      setTimeout(() => {
        nextStep(true, rt); // ✅ Solo aquí se avanza de problema
      }, 450);

    } else {
      safePlay(sounds.incorrect, 0.6);
      setWrongAttempts((x) => x + 1);

      const nextLives = lives - 1;
      setLives(nextLives);

      setGameState(GAME_STATE.FEEDBACK);

      setTimeout(() => {
        if (nextLives <= 0) {
          endGame();
          return;
        }
        // ✅ Reintento del mismo problema (no cambia trialIndex, no reconstruye el problema)
        setGameState(GAME_STATE.PLAYING);
      }, 450);
    }
  },
  [paused, gameState, trialStartMs, safePlay, levelIndex, nextStep, lives, endGame]
);

  // COUNTDOWN
  useEffect(() => {
    // Si el estado es GAME_OVER, no permitir que el contador inicie
    if (gameState !== GAME_STATE.COUNTDOWN || gameState === GAME_STATE.GAME_OVER) return;

    safePlay(sounds.start);
    let t = gameSettings.countdownSeconds;
    setCountdown(t);

    countdownRef.current = setInterval(() => {
        t -= 1;
        setCountdown(t > 0 ? t : null);

        if (t === 0) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            // Solo generar problema si NO estamos en GAME_OVER
            setGameState(prev => {
                if (prev === GAME_STATE.GAME_OVER) return prev;
                buildNewProblem();
                return GAME_STATE.PLAYING;
            });
        }
    }, 1000);

    return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
    };
}, [gameState, safePlay, buildNewProblem]);

  // init: arrancar en countdown
  useEffect(() => {
    setGameState(GAME_STATE.COUNTDOWN);
    setCountdown(gameSettings.countdownSeconds);
  }, []);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <header className={styles.hud}>
        <button
          className={styles.pauseButton}
          onClick={() => setPaused(true)}
          disabled={gameState === GAME_STATE.COUNTDOWN}
        >
          ⏸ Pausa
        </button>

        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>Puntos</span>
          <span className={styles.hudValue}>{score}</span>
        </div>

        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>Nivel</span>
          <span className={styles.hudValue}>{level.id}</span>
        </div>

        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>Vidas</span>
          <span className={styles.hudValue}>
            {"❤️".repeat(lives)}{"🤍".repeat(gameSettings.startingLives - lives)}
          </span>
        </div>
      </header>

      {gameState === GAME_STATE.COUNTDOWN && (
        <div className={styles.countdownWrapper}>
          <div className={styles.countdown}>{countdown}</div>
        </div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && weights && targetLeft && (
        <>
          <section className={styles.panel}>
            <div className={styles.sectionTitle}>Balanzas en equilibrio (reglas)</div>

            <div className={styles.hintsGrid}>
              {hints.map((h, idx) => (
                <div key={idx} className={styles.hintCard}>
                  <div className={styles.scale}>
                    <div className={styles.pan}>
                      {renderShapes(h.left, shapeMeta, "sm")}
                    </div>
                    <div className={styles.beam} />
                    <div className={styles.pan}>
                      {renderShapes(h.right, shapeMeta, "sm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionTitle}>Balanza final</div>

            <div className={styles.finalScale}>
              <div className={styles.panBig}>
                {renderShapes(targetLeft, shapeMeta, "md")}
              </div>
              <div className={styles.beamBig} />
              <div className={styles.panBig}>
                <div className={styles.question}>¿Cuál opción equilibra?</div>
              </div>
            </div>

            <div className={styles.optionsGrid}>
              {options.map((o, idx) => (
                <button
                  key={o.key}
                  className={styles.optionBtn}
                  onClick={() => handlePick(o)}
                  disabled={paused || gameState !== GAME_STATE.PLAYING}
                >
                  <div className={styles.optionLabel}>Opción {idx + 1}</div>
                  {renderShapes(o.counts, shapeMeta, "md")}
                </button>
              ))}
            </div>
          </section>
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
