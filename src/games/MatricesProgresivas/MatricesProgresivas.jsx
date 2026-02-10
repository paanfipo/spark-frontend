import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./MatricesProgresivas.module.css";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";
import { gameSettings, ANSWER_KEY } from "./MatricesProgresivas.config";

const GAME_STATE = {
  COUNTDOWN: "countdown",
  LOADING: "loading",
  PLAYING: "playing",
  FEEDBACK: "feedback",
  GAME_OVER: "game_over",
};

const COUNTDOWN_START = 3;
const FEEDBACK_DELAY_MS = 1200;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function MatricesProgresivas({ onGameOver }) {
  // 1. Estados de control y Refs primero
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [paused, setPaused] = useState(false);
  const timeoutsRef = useRef([]);

  // 2. Estados de Progreso
  const [cursor, setCursor] = useState(0); 
  const [level, setLevel] = useState(1); 
  const [lives, setLives] = useState(gameSettings.lives ?? 3);
  const [score, setScore] = useState(0);

  // 3. Selección y tiempos
  const [selectedOp, setSelectedOp] = useState(null); 
  const [correctOp, setCorrectOp] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [locked, setLocked] = useState(false);
  const [itemStartTime, setItemStartTime] = useState(null);

  // 4. Stats por ítem
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [responseTimesMs, setResponseTimesMs] = useState([]);
  const [maxLevelReached, setMaxLevelReached] = useState(1);

  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("soundEnabled") !== "false"
  );

  // 5. MEMOS: Definir ANTES de que cualquier función los use
  const itemBank = useMemo(() => {
    const seriesOrder = gameSettings.seriesOrder || ["serie_a"];
    const questionsPerSeries = gameSettings.questionsPerSeries || {};
    const optionsCount = gameSettings.optionsCount || 6;

    const items = [];
    for (const serie of seriesOrder) {
      const nQ = questionsPerSeries[serie] || 0;
      for (let q = 1; q <= nQ; q++) {
        const mainSrc = `/assets/matrices/${serie}/p${q}_main.png`;
        const options = Array.from({ length: optionsCount }, (_, i) => {
          const opIdx = i + 1;
          return {
            opIdx,
            src: `/assets/matrices/${serie}/p${q}_op${opIdx}.png`,
          };
        });
        items.push({ id: `${serie}_p${q}`, serie, q, mainSrc, options });
      }
    }
    return items;
  }, []);

  const currentItem = itemBank[cursor] || null;

  // 6. FUNCIONES (useCallback)
  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("soundEnabled", String(next));
  }, [soundEnabled]);

  const setPausableTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const calculateFinalMetrics = useCallback(() => {
    const totalAttempts = attempts || 0;
    const totalCorrect = correctCount || 0;
    const totalErrors = errorCount || 0;
    const precision = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const tasaErrores = totalAttempts > 0 ? (totalErrors / totalAttempts) * 100 : 0;
    const avgTime = responseTimesMs.length > 0 ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length : 0;

    return {
      precision_matrices: Number(precision.toFixed(2)),
      tiempo_medio_resolucion_ms: Number(avgTime.toFixed(2)),
      nivel_maximo_complejidad: maxLevelReached || 1,
      tasa_errores_logicos: Number(tasaErrores.toFixed(2)),
      score,
      total_intentos: totalAttempts,
      total_aciertos: totalCorrect,
      total_errores: totalErrors,
    };
  }, [attempts, correctCount, errorCount, responseTimesMs, maxLevelReached, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver, 0.9);
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = calculateFinalMetrics();
    if (onGameOver) onGameOver(rawMetrics);
  }, [calculateFinalMetrics, onGameOver, safePlay]);

  const advanceToNextItem = useCallback(() => {
    setCursor((c) => c + 1);
    setGameState(GAME_STATE.LOADING);
  }, []);

  const pauseGame = useCallback(() => {
    setPaused(true);
    safePlay(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts, safePlay]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    safePlay(sounds.pauseOut, 0.5);

    if (gameState === GAME_STATE.FEEDBACK) {
      setPausableTimeout(() => {
        const isCorrect = selectedOp === correctOp;
        const livesAfter = isCorrect ? lives : lives - 1;
        if (livesAfter <= 0) endGame(); else advanceToNextItem();
      }, FEEDBACK_DELAY_MS / 2);
    }
  }, [safePlay, gameState, selectedOp, correctOp, lives, endGame, advanceToNextItem, setPausableTimeout]);

  const getCorrectOption = useCallback((serie, q) => {
    const serieKey = ANSWER_KEY?.[serie];
    return serieKey ? serieKey[q] : null;
  }, []);

  const computeScoreDelta = useCallback((rtMs, lvl) => {
    const base = gameSettings.score?.baseCorrect ?? 100;
    const mult = gameSettings.score?.levelMultiplier ?? 15;
    const bonusMax = gameSettings.score?.timeBonusMax ?? 60;
    const rtSec = rtMs / 1000;
    const frac = clamp(1 - rtSec / 20, 0, 1);
    const bonus = Math.round(frac * bonusMax);
    return base + lvl * mult + bonus;
  }, []);

  const onSelectOption = useCallback((opIdx) => {
    if (paused || locked || gameState !== GAME_STATE.PLAYING) return;

    const now = Date.now();
    const rt = itemStartTime ? Math.max(0, now - itemStartTime) : 0;

    setSelectedOp(opIdx);
    setAttempts((a) => a + 1);
    setResponseTimesMs((arr) => arr.concat(rt));

    const isCorrect = opIdx === correctOp;

    if (isCorrect) {
      safePlay(sounds.correct, 0.8);
      setCorrectCount((c) => c + 1);
      setFeedbackMsg("Correcto.");
      setScore((s) => s + computeScoreDelta(rt, level));
    } else {
      safePlay(sounds.incorrect, 0.8);
      setErrorCount((e) => e + 1);
      setFeedbackMsg("Incorrecto.");
      setLives((v) => v - 1);
    }

    setGameState(GAME_STATE.FEEDBACK);

    setPausableTimeout(() => {
      const livesAfter = isCorrect ? lives : lives - 1;
      if (livesAfter <= 0) endGame(); else advanceToNextItem();
    }, FEEDBACK_DELAY_MS);
  }, [advanceToNextItem, computeScoreDelta, correctOp, endGame, gameState, itemStartTime, level, lives, locked, paused, safePlay, setPausableTimeout]);

  // 7. EFECTOS
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN || paused) return;
    if (countdown <= 0) {
      setGameState(GAME_STATE.LOADING);
      safePlay(sounds.gameStart, 0.8);
      return;
    }
    const id = setPausableTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, gameState, paused, safePlay, setPausableTimeout]);

  useEffect(() => {
    if (gameState !== GAME_STATE.LOADING || paused) return;
    if (!currentItem) { endGame(); return; }

    const ans = getCorrectOption(currentItem.serie, currentItem.q);
    if (!ans) {
      setFeedbackMsg(`Falta clave: ${currentItem.serie} p${currentItem.q}`);
      setLocked(true);
      setGameState(GAME_STATE.PLAYING);
      return;
    }

    setCorrectOp(ans);
    setSelectedOp(null);
    setFeedbackMsg("");
    setLocked(false);
    setItemStartTime(Date.now());
    setGameState(GAME_STATE.PLAYING);
    setMaxLevelReached((prev) => Math.max(prev, cursor + 1));
    setLevel(cursor + 1);
  }, [cursor, currentItem, endGame, gameState, getCorrectOption, paused]);

  useEffect(() => {
    if (!paused) return;
    clearAllTimeouts();
  }, [paused, clearAllTimeouts]);

  const hudRight = useMemo(() => {
    const total = itemBank.length || 0;
    return `${Math.min(cursor + 1, total)}/${total}`;
  }, [cursor, itemBank.length]);

  // 8. RENDER
  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && (
        <div className={styles.countdown}>{countdown}</div>
      )}

      <div className={styles.hud}>
        <div>❤️ Vidas: {lives}</div>
        <div>🧩 Nivel: {level}</div>
        <div>💰 Puntaje: {score}</div>
        <div>📌 Ítem: {hudRight}</div>
      </div>

      <div className={styles.stage}>
        <div className={styles.mainPanel}>
          {currentItem && (
            <img className={styles.mainImage} src={currentItem.mainSrc} alt="Matriz" draggable="false" />
          )}
        </div>

        <div className={styles.optionsGrid}>
          {currentItem?.options?.map((op) => (
            <button
              key={op.opIdx}
              className={`${styles.optionCard} ${selectedOp === op.opIdx ? styles.selected : ""} ${gameState === GAME_STATE.FEEDBACK && correctOp === op.opIdx ? styles.correct : ""} ${gameState === GAME_STATE.FEEDBACK && selectedOp === op.opIdx && correctOp !== op.opIdx ? styles.incorrect : ""} ${locked ? styles.locked : ""}`}
              onClick={() => onSelectOption(op.opIdx)}
              disabled={locked || paused || gameState !== GAME_STATE.PLAYING}
            >
              <img className={styles.optionImage} src={op.src} alt="Opción" draggable="false" />
              <div className={styles.optionIndex}>O{op.opIdx}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>{feedbackMsg || "Selecciona la opción correcta."}</div>

      {paused && (
        <PauseMenu
          visible={paused}
          onResume={resumeGame}
          onRestart={() => window.location.reload()}
          onQuit={endGame}
        />
      )}
    </div>
  );
}