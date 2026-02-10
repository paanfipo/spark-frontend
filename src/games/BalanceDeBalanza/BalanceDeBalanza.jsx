import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./BalanceDeBalanza.module.css";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";
import { balanceDeBalanzaConfig, gameSettings, levelsData } from "./BalanceDeBalanza.config";

// --- FUNCIONES UTILITARIAS (Mantenidas de tu código original) ---
const GAME_STATE = { COUNTDOWN: "countdown", PLAYING: "playing", FEEDBACK: "feedback", GAME_OVER: "game_over" };
const SHAPES_ALL = [
  { key: "circle", label: "Círculo" }, { key: "square", label: "Cuadrado" },
  { key: "triangle", label: "Triángulo" }, { key: "star", label: "Estrella" }, { key: "hex", label: "Hexágono" }
];
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function countsToKey(counts, shapeKeys) { return shapeKeys.map(k => `${k}:${counts[k] || 0}`).join("|"); }
function sumWeight(counts, weights) {
  let s = 0;
  for (const k of Object.keys(counts)) s += (counts[k] || 0) * weights[k];
  return s;
}
function genSide(shapeKeys, maxTerms) {
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
  const out = {};
  for (const [k, v] of Object.entries(counts)) { if (v > 0) out[k] = v; }
  return out;
}
function addCounts(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return normalizeCounts(out);
}

function ShapeIcon({ shapeKey }) {
  switch (shapeKey) {
    case "circle": return (<svg className={styles.shape} viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /></svg>);
    case "square": return (<svg className={styles.shape} viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>);
    case "triangle": return (<svg className={styles.shape} viewBox="0 0 24 24"><path d="M12 6l7 12H5l7-12z" /></svg>);
    case "star": return (<svg className={styles.shape} viewBox="0 0 24 24"><path d="M12 4l2.2 5.8 6.2.4-4.8 3.7 1.7 6.1L12 16.9 6.7 20l1.7-6.1-4.8-3.7 6.2-.4L12 4z" /></svg>);
    case "hex": return (<svg className={styles.shape} viewBox="0 0 24 24"><path d="M8 5h8l4 7-4 7H8l-4-7 4-7z" /></svg>);
    default: return null;
  }
}

function renderShapes(counts, shapeMeta, size = "md") {
  const items = [];
  for (const { key } of shapeMeta) {
    const n = counts[key] || 0;
    for (let i = 0; i < n; i++) items.push(key);
  }
  return (
    <div className={`${styles.shapesRow} ${styles[size]}`}>
      {items.map((k, idx) => (<ShapeIcon key={`${k}-${idx}`} shapeKey={k} />))}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
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
  const [hints, setHints] = useState([]);
  const [targetLeft, setTargetLeft] = useState(null);
  const [options, setOptions] = useState([]);
  const [resultsLog, setResultsLog] = useState([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const countdownRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    try { playSound(snd, vol); } catch (e) {}
  }, []);

  // ✅ Obtener config de nivel basado en el índice actual
  const level = useMemo(() => levelsData[levelIndex] || levelsData[levelsData.length - 1], [levelIndex]);

  // ✅ buildNewProblem: Ahora con dependencias correctas para re-generar en cada nivel
  const buildNewProblem = useCallback(() => {

    const targetIdx = typeof forcedLevel === 'number' ? forcedLevel : levelIndex;

    const currentConfig = levelsData[levelIndex] || levelsData[levelsData.length - 1];
    const keys = SHAPES_ALL.slice(0, currentConfig.shapes).map(s => s.key);
    const meta = SHAPES_ALL.slice(0, currentConfig.shapes);

    const w = {};
    const used = new Set();
    for (const k of keys) {
      let val = randInt(1, 9);
      while (used.has(val)) val = randInt(1, 9);
      used.add(val);
      w[k] = val;
    }

    const eqs = [];
    let guard = 0;
    while (eqs.length < currentConfig.hintEquations && guard < 500) {
      guard++;
      const left = genSide(keys, currentConfig.maxTerms);
      const right = genSide(keys, currentConfig.maxTerms);
      if (sumWeight(left, w) === sumWeight(right, w)) {
        const key = `${countsToKey(left, keys)}==${countsToKey(right, keys)}`;
        if (!eqs.some(e => `${countsToKey(e.left, keys)}==${countsToKey(e.right, keys)}` === key)) {
          eqs.push({ left: normalizeCounts(left), right: normalizeCounts(right) });
        }
      }
    }

    let TL = null;
    let CR = null;
    if (eqs.length >= 2) {
      const e1 = eqs[0];
      const e2 = eqs[1];
      TL = addCounts(e1.left, e2.left);
      CR = addCounts(e1.right, e2.right);
    } else if (eqs.length === 1) {
      TL = addCounts(eqs[0].left, eqs[0].left);
      CR = addCounts(eqs[0].right, eqs[0].right);
    } else {
      TL = genSide(keys, currentConfig.targetTerms);
      CR = normalizeCounts({ ...TL });
    }

    const opts = [];
    opts.push({ counts: CR, key: countsToKey(CR, keys), isCorrect: true });
    const targetSum = sumWeight(CR, w);
    let optGuard = 0;
    while (opts.length < currentConfig.options && optGuard < 1000) {
      optGuard++;
      const cand = genSide(keys, currentConfig.targetTerms);
      const candN = normalizeCounts(cand);
      const k = countsToKey(candN, keys);
      if (opts.some(o => o.key === k)) continue;
      if (Math.abs(sumWeight(candN, w) - targetSum) <= 2) {
        opts.push({ counts: candN, key: k, isCorrect: false });
      }
    }
    while (opts.length < currentConfig.options) {
      const cand = normalizeCounts(genSide(keys, currentConfig.targetTerms));
      if (!opts.some(o => o.key === countsToKey(cand, keys))) {
        opts.push({ counts: cand, key: countsToKey(cand, keys), isCorrect: false });
      }
    }

    setShapeKeys(keys);
    setShapeMeta(meta);
    setWeights(w);
    setHints(eqs);
    setTargetLeft(normalizeCounts(TL));
    setOptions(shuffle(opts));
    setTrialStartMs(Date.now());
    setGameState(GAME_STATE.PLAYING);
  }, [levelIndex]);

  const endGame = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    safePlay(sounds.gameOver);
    const total = resultsLog.length || 1;
    const correct = resultsLog.filter(r => r.correct).length;
    const rts = resultsLog.filter(r => r.correct && r.rt).map(r => r.rt);
    const meanRt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    onGameOver?.({ precision_inferencial_pct: Math.round((correct / total) * 100), tiempo_medio_resolucion_ms: meanRt, intentos_incorrectos: wrongAttempts, score });
    setGameState(GAME_STATE.GAME_OVER);
  }, [onGameOver, resultsLog, safePlay, score, wrongAttempts]);

  const nextStep = useCallback((wasCorrect, rt) => {
  setResultsLog(prev => [...prev, { correct: wasCorrect, rt }]);

  if (!wasCorrect) {
    const nextLives = lives - 1;
    setLives(nextLives);
    if (nextLives <= 0) { endGame(); return; }
  }

  const nextTrial = trialIndex + 1;
  const trialsPerLevel = 6;

  if (nextTrial >= trialsPerLevel) {
    if (levelIndex < levelsData.length - 1) {
      // ✅ AVANCE DIRECTO:
      // No cambiamos a COUNTDOWN. Actualizamos nivel y reiniciamos trial.
      const newLvl = levelIndex + 1;
      setLevelIndex(newLvl);
      setTrialIndex(0);
      
      // Llamamos manualmente a la generación con el nuevo nivel
      // Pasamos el nuevo nivel directamente para evitar el retraso del estado
      buildNewProblem(newLvl); 
    } else {
      endGame();
    }
  } else {
    setTrialIndex(nextTrial);
    buildNewProblem(levelIndex); // Seguimos en el mismo nivel
  }
}, [levelIndex, trialIndex, lives, buildNewProblem, endGame]);

  const handlePick = useCallback((opt) => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;
    const rt = Date.now() - trialStartMs;
    if (opt.isCorrect) {
      safePlay(sounds.click, 0.5);
      setScore(s => s + 20 + levelIndex * 10);
      setGameState(GAME_STATE.FEEDBACK);
      setTimeout(() => nextStep(true, rt), 450);
    } else {
      safePlay(sounds.incorrect, 0.6);
      setWrongAttempts(x => x + 1);
      const nextLives = lives - 1;
      setLives(nextLives);
      setGameState(GAME_STATE.FEEDBACK);
      setTimeout(() => {
        if (nextLives <= 0) endGame();
        else setGameState(GAME_STATE.PLAYING);
      }, 450);
    }
  }, [paused, gameState, trialStartMs, safePlay, levelIndex, nextStep, lives, endGame]);

  // ✅ EFECTO DEL COUNTDOWN: El "motor" que arranca el nuevo nivel
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN && levelIndex === 0 && trialIndex === 0) {
      safePlay(sounds.start);
      let t = gameSettings.countdownSeconds;
      setCountdown(t);
      countdownRef.current = setInterval(() => {
        t -= 1;
        setCountdown(t > 0 ? t : null);
        if (t === 0) {
          clearInterval(countdownRef.current);
          buildNewProblem(); // ✅ Al ejecutarse aquí, ya lee el levelIndex actualizado
        }
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [gameState, levelIndex, buildNewProblem, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <header className={styles.hud}>
        <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
          <span>⏸</span> Pausa
        </button>
        <div className={styles.hudItem}><span className={styles.hudLabel}>Puntos</span><span className={styles.hudValue}>{score}</span></div>
        <div className={styles.hudItem}><span className={styles.hudLabel}>Nivel</span><span className={styles.hudValue}>{levelsData[levelIndex]?.id}</span></div>
        <div className={styles.hudItem}><span className={styles.hudLabel}>Vidas</span><span className={styles.hudValue}>{"❤️".repeat(lives)}{"🤍".repeat(gameSettings.startingLives - lives)}</span></div>
      </header>

      <main className={styles.gameBody}>
        {gameState === GAME_STATE.COUNTDOWN ? (
          <div className={styles.countdownWrapper}><div className={styles.countdown}>{countdown}</div></div>
        ) : (
          <div className={styles.contentLayout}>
            
            <section className={styles.rulesSection}>
              <h2 className={styles.sectionTitle}>Reglas de Equilibrio</h2>
              <div className={styles.hintsGrid}>
                {hints.map((h, idx) => (
                  <div key={idx} className={styles.hintCard}>
                    <div className={styles.miniScale}>
                      <div className={styles.miniPan}>{renderShapes(h.left, shapeMeta, "sm")}</div>
                      <div className={styles.miniBeam} />
                      <div className={styles.miniPan}>{renderShapes(h.right, shapeMeta, "sm")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.challengeSection}>
              <h2 className={styles.sectionTitle}>Balanza Final</h2>
              <div className={styles.finalScaleContainer}>
                <div className={styles.mainPan}>
                  {renderShapes(targetLeft, shapeMeta, "md")}
                </div>
                <div className={styles.mainBeam}>
                  <div className={styles.fulcrum}></div>
                </div>
                <div className={styles.mainPan}>
                  <div className={styles.targetEmpty}>?</div>
                </div>
              </div>

              <div className={styles.optionsGrid}>
                {options.map((o, idx) => (
                  <button key={o.key} className={styles.optionBtn} onClick={() => handlePick(o)} disabled={paused || gameState !== GAME_STATE.PLAYING}>
                    <span className={styles.optionLabel}>Opción {idx + 1}</span>
                    <div className={styles.optionContent}>
                      {renderShapes(o.counts, shapeMeta, "md")}
                    </div>
                  </button>
                ))}
              </div>
            </section>

          </div>
        )}
      </main>

      <PauseMenu visible={paused} onResume={() => setPaused(false)} onRestart={() => window.location.reload()} />
    </div>
  );
}