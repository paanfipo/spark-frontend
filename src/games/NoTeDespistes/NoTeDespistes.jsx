import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './NoTeDespistes.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { gameSettings } from './NoTeDespistes.config';

const FIXATION_DELAY = 600;
const CUE_DELAY = 400;
const TARGET_TIMEOUT = 2000; // Tiempo límite para responder

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  FIXATION: 'fixation',
  CUE: 'cue',
  TARGET: 'target',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over',
};

export default function NoTeDespistes({ onGameOver }) { 
  // Estados de control
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  const timeoutsRef = useRef([]);
  const evaluatingRef = useRef(false);

  // Estados de juego
  const [trialData, setTrialData] = useState({ cueDir: null, targetSide: null, isValid: true });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [levelStats, setLevelStats] = useState([]);
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  // --- UTILIDADES ---
  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { console.error(e); }
  }, [soundEnabled]);

  const setPausableTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // --- MÉTRICAS (Basado en tu estructura de Matriz) ---
  const calculateFinalMetrics = useCallback(() => { 
    if (levelStats.length === 0) return {
      score, tiempo_medio_reaccion_validos: 0, costo_reorientacion: 0,
      errores_comision: 0, errores_omision: 0, variabilidad_tr: 0, tasa_aciertos: 0
    };

    const validTrials = levelStats.filter(s => s.correct && s.isValid);
    const invalidTrials = levelStats.filter(s => s.correct && !s.isValid);
    const todosLosAciertos = levelStats.filter(s => s.correct).map(s => s.rt);

    const avgRTValid = validTrials.length > 0 
      ? validTrials.reduce((sum, s) => sum + s.rt, 0) / validTrials.length 
      : 0;

    const avgRTInvalid = invalidTrials.length > 0 
      ? invalidTrials.reduce((sum, s) => sum + s.rt, 0) / invalidTrials.length 
      : 0;

    // Variabilidad (Desviación estándar)
    let variabilidad = 0;
    if (todosLosAciertos.length > 1) {
      const media = todosLosAciertos.reduce((a, b) => a + b, 0) / todosLosAciertos.length;
      const varianza = todosLosAciertos.reduce((acc, x) => acc + Math.pow(x - media, 2), 0) / todosLosAciertos.length;
      variabilidad = Math.sqrt(varianza);
    }

    return {
      score: score,
      tiempo_medio_reaccion_validos: parseFloat(avgRTValid.toFixed(2)),
      costo_reorientacion: parseFloat((avgRTInvalid - avgRTValid).toFixed(2)),
      errores_comision: levelStats.filter(s => !s.correct && s.rt !== null).length,
      errores_omision: levelStats.filter(s => s.rt === null).length,
      variabilidad_tr: parseFloat(variabilidad.toFixed(2)),
      tasa_aciertos: parseFloat(((levelStats.filter(s => s.correct).length / levelStats.length) * 100).toFixed(2)),
      estrellas_obtenidas: level - 1
    };
  }, [levelStats, score, level]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = calculateFinalMetrics();
    if (onGameOver) onGameOver(rawMetrics);
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- MOTOR DEL JUEGO ---
  const generateTrial = useCallback(() => {
    if (gameState === GAME_STATE.GAME_OVER) return;

    setGameState(GAME_STATE.FIXATION);
    const isValid = Math.random() < 0.6; // 60% válido
    const cueDir = Math.random() < 0.5 ? 'left' : 'right';
    const targetSide = isValid ? cueDir : (cueDir === 'left' ? 'right' : 'left');

    setTrialData({ cueDir, targetSide, isValid });
    evaluatingRef.current = false;

    // Secuencia Posner
    setPausableTimeout(() => {
      setGameState(GAME_STATE.CUE);
      setPausableTimeout(() => {
        setGameState(GAME_STATE.TARGET);
        setTrialStartTime(Date.now());
      }, CUE_DELAY);
    }, FIXATION_DELAY);
  }, [gameState]);

  // Manejo de respuesta
  const handleInput = useCallback((side) => {
    if (paused || gameState !== GAME_STATE.TARGET || evaluatingRef.current) return;
    evaluatingRef.current = true;

    const rt = Date.now() - trialStartTime;
    const isCorrect = side === trialData.targetSide;

    if (isCorrect) {
      safePlay(sounds.correct);
      setScore(s => s + (trialData.isValid ? 10 : 20));
      setLevelStats(prev => [...prev, { correct: true, rt, isValid: trialData.isValid }]);
      setPausableTimeout(generateTrial, 500);
    } else {
      safePlay(sounds.incorrect);
      const newLives = lives - 1;
      setLives(newLives);
      setLevelStats(prev => [...prev, { correct: false, rt, isValid: trialData.isValid }]);

      if (newLives <= 0) {
        endGame();
      } else {
        setPausableTimeout(generateTrial, 800);
      }
    }
  }, [gameState, paused, trialData, trialStartTime, lives, generateTrial, safePlay, endGame]);

  // --- EFECTOS (IGUAL QUE MATRIZ) ---
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      setCountdown(3);
      safePlay(sounds.start);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setGameState(GAME_STATE.FIXATION);
            generateTrial();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay, generateTrial]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') handleInput('left');
      if (e.key === 'ArrowRight') handleInput('right');
      if (e.key === 'Escape') setPaused(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      
      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div>Puntuación: {score}</div>
        <div>Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}</div>
      </header>

      <div className={styles.stage}>
        <div className={`${styles.box} ${gameState === GAME_STATE.TARGET && trialData.targetSide === 'left' ? styles.hasTarget : ''}`}>
           {gameState === GAME_STATE.TARGET && trialData.targetSide === 'left' && <span className={styles.star}>⭐</span>}
        </div>

        <div className={styles.center}>
          {gameState === GAME_STATE.FIXATION && '+'}
          {gameState === GAME_STATE.CUE && (trialData.cueDir === 'left' ? '⬅️' : '➡️')}
        </div>

        <div className={`${styles.box} ${gameState === GAME_STATE.TARGET && trialData.targetSide === 'right' ? styles.hasTarget : ''}`}>
           {gameState === GAME_STATE.TARGET && trialData.targetSide === 'right' && <span className={styles.star}>⭐</span>}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.instructions}>
          {gameState === GAME_STATE.FIXATION && 'Mira el centro...'}
          {gameState === GAME_STATE.CUE && '¡Atento!'}
          {gameState === GAME_STATE.TARGET && '¡REACCIONA!'}
        </div>
      </div>

      <PauseMenu visible={paused} onResume={() => setPaused(false)} onRestart={() => window.location.reload()} />
    </div>
  );
}