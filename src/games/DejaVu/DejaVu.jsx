import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './DejaVu.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { DEJAVU_SYMBOLS } from '../../data/objects.js';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_LEVEL: 'start_level',
  MEMORIZATION: 'memorization',
  INTERMISSION: 'intermission',
  RECOGNITION: 'recognition',
  GAME_OVER: 'game_over'
};

const ALL_OBJECTS = DEJAVU_SYMBOLS;

const LEVEL_CONFIG = {
  1: { numTargets: 5, numDistractors: 5, showTimeMs: 1500 },
  2: { numTargets: 7, numDistractors: 7, showTimeMs: 1000 },
  3: { numTargets: 12, numDistractors: 12, showTimeMs: 600 },
};

const MAX_LEVEL = 3;
const INTERMISSION_MS = 2000;
const FEEDBACK_MS = 600;

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

export default function DejaVu({ onGameOver }) {
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );
  
  const [level, setLevel] = useState(1);
  const [testSequence, setTestSequence] = useState([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [notification, setNotification] = useState('');
  const [lives, setLives] = useState(3);

  const [metrics, setMetrics] = useState({
    errores_comision: 0,
    errores_omision: 0,
    total_respuestas: 0,
    respuestas_correctas: 0,
    reactionTimes: []
  });

  const timeoutsRef = useRef([]);
  const countdownRef = useRef(null);
  const reactionTimeStartRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch {}
  }, [soundEnabled]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const setPausableTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // ✅ NUEVA: Función de Reset Maestro
  const resetGame = useCallback(() => {
    clearAllTimeouts();
    setLives(3);
    setLevel(1);
    setCurrentTestIndex(0);
    setFeedback('');
    setNotification('Preparando...');
    setMetrics({
      errores_comision: 0,
      errores_omision: 0,
      total_respuestas: 0,
      respuestas_correctas: 0,
      reactionTimes: []
    });
    setGameState(GAME_STATE.START_LEVEL);
  }, [clearAllTimeouts]);

  const endGame = useCallback((victory = false) => {
    setGameState(GAME_STATE.GAME_OVER);
    clearAllTimeouts();

    const { 
      respuestas_correctas, 
      total_respuestas, 
      errores_comision, 
      errores_omision, 
      reactionTimes 
    } = metrics;

    // 1. % Aciertos (Precisión)
    const precision = total_respuestas ? (respuestas_correctas / total_respuestas) * 100 : 0;

    // 2. Tiempo medio de respuesta (en milisegundos)
    const rtPromedio = reactionTimes.length 
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
      : 0;

    safePlay(victory ? sounds.win : sounds.gameOver, 0.8);

    // Enviamos las 4 métricas exactas que definiste
    onGameOver?.({
      precision_total_pct: +precision.toFixed(2),        // 1. % Aciertos
      tiempo_respuesta_medio_ms: +rtPromedio.toFixed(2), // 2. Tiempo medio
      errores_comision,                                  // 3. Errores de comisión
      errores_omision,                                   // 4. Errores de omisión
      nivel_alcanzado: level,
      victoria: victory
    });
  }, [metrics, safePlay, onGameOver, level, clearAllTimeouts]);

  const generateLevel = useCallback((lvl) => {
    const cfg = LEVEL_CONFIG[lvl];
    if (!cfg) return endGame(true);

    const shuffled = shuffleArray(ALL_OBJECTS);
    const targets = shuffled.slice(0, cfg.numTargets);
    const distractors = shuffled.slice(cfg.numTargets, cfg.numTargets + cfg.numDistractors);

    setTestSequence(shuffleArray([
      ...targets.map(i => ({ item: i, type: 'target' })),
      ...distractors.map(i => ({ item: i, type: 'distractor' }))
    ]));

    let t = 500;
    setGameState(GAME_STATE.MEMORIZATION);
    setNotification('Memoriza los objetos...');
    setCurrentTestIndex(0);
    setFeedback('');

    targets.forEach(obj => {
      setPausableTimeout(() => setCurrentItem(obj), t);
      t += cfg.showTimeMs;
      setPausableTimeout(() => setCurrentItem(null), t);
      t += 300;
    });

    setPausableTimeout(() => {
      setNotification('¡Prepárate!');
      setCurrentItem('?');
      setGameState(GAME_STATE.INTERMISSION);
    }, t + 200);

    setPausableTimeout(() => {
      setGameState(GAME_STATE.RECOGNITION);
    }, t + INTERMISSION_MS);

  }, [setPausableTimeout, endGame]);

  const handleUserResponse = useCallback((response) => {
    if (gameState !== GAME_STATE.RECOGNITION || feedback) return;

    const current = testSequence[currentTestIndex];
    if (!current) return;

    const rt = Date.now() - reactionTimeStartRef.current;
    const wasTarget = current.type === 'target';
    const isCorrect = (response === 'yes' && wasTarget) || (response === 'no' && !wasTarget);

    setMetrics(m => ({
      ...m,
      respuestas_correctas: m.respuestas_correctas + (isCorrect ? 1 : 0),
      errores_comision: m.errores_comision + (!isCorrect && response === 'yes' ? 1 : 0),
      errores_omision: m.errores_omision + (!isCorrect && response === 'no' ? 1 : 0),
      total_respuestas: m.total_respuestas + 1,
      reactionTimes: [...m.reactionTimes, rt]
    }));

    if (!isCorrect) {
      setLives(v => {
        const n = v - 1;
        if (n <= 0) setPausableTimeout(() => endGame(false), FEEDBACK_MS);
        return n;
      });
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    safePlay(isCorrect ? sounds.correct : sounds.incorrect);

    setPausableTimeout(() => {
      setFeedback('');
      if (currentTestIndex + 1 < testSequence.length) {
        setCurrentTestIndex(prev => prev + 1);
      } else {
        if (level >= MAX_LEVEL) {
          endGame(true);
        } else {
          setLevel(l => l + 1);
          setGameState(GAME_STATE.START_LEVEL);
        }
      }
    }, FEEDBACK_MS);

  }, [gameState, feedback, testSequence, currentTestIndex, level, safePlay, setPausableTimeout, endGame]);

  // ✅ EFECTO CORREGIDO: Llama a resetGame()
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      safePlay(sounds.start, 0.8);
      let t = 3;
      setCountdown(3);
      const timer = setInterval(() => {
        t -= 1;
        setCountdown(t > 0 ? t : null);
        if (t === 0) {
          clearInterval(timer);
          resetGame();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, resetGame, safePlay]);

  useEffect(() => {
    if (!paused && gameState === GAME_STATE.START_LEVEL) {
      generateLevel(level);
    }
  }, [gameState, paused, level, generateLevel]);

  useEffect(() => {
    if (gameState === GAME_STATE.RECOGNITION && !feedback) {
      const item = testSequence[currentTestIndex];
      if (item) {
        setCurrentItem(item.item);
        setNotification('¿Viste este objeto antes?');
        reactionTimeStartRef.current = Date.now();
      }
    }
  }, [gameState, feedback, currentTestIndex, testSequence]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
  <div className={styles.gameContainer}>
    <button 
      className={styles.pauseButton} 
      onClick={() => {safePlay(sounds.click, 0.5); setPaused(true)}} 
      disabled={gameState === GAME_STATE.COUNTDOWN}
    >
      <span className={styles.pauseIcon}>II</span> Pausa
    </button>

    {gameState === GAME_STATE.COUNTDOWN && (
      <div className={styles.countdown}>{countdown}</div>
    )}

    {gameState !== GAME_STATE.COUNTDOWN && (
      <>
        {/* ✅ Este es el HUD limpio, igual al de MatrizMemoria */}
        <header className={styles.hud}>
          <div>Nivel: {level}</div>
          <div>
            Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}
          </div>
          <div>
            Precisión: {metrics.total_respuestas ? Math.round((metrics.respuestas_correctas / metrics.total_respuestas) * 100) : 0}%
          </div>
        </header>

        {/* Visor central del juego */}
        <div className={`${styles.viewer} ${feedback === 'correct' ? styles.viewerCorrect : feedback === 'incorrect' ? styles.viewerIncorrect : ''}`}>
          {feedback && <div className={styles.feedbackOverlay}>{feedback === 'correct' ? '✅' : '❌'}</div>}
          {currentItem && !feedback && <span className={styles.emoji}>{currentItem}</span>}
        </div>

        {/* Instrucciones dinámicas */}
        <div className={styles.instructions}>{notification}</div>

        {/* Botones de respuesta que aparecen en la fase de reconocimiento */}
        {gameState === GAME_STATE.RECOGNITION && (
          <div className={styles.responseButtons}>
            <button className={`${styles.responseButton} ${styles.noButton}`} onClick={() => handleUserResponse('no')} disabled={!!feedback}>NO</button>
            <button className={`${styles.responseButton} ${styles.yesButton}`} onClick={() => handleUserResponse('yes')} disabled={!!feedback}>SÍ</button>
          </div>
        )}
      </>
    )}

    <PauseMenu
      visible={paused}
      onResume={() => { safePlay(sounds.click, 0.5); setPaused(false); }}
      onRestart={() => { clearAllTimeouts(); setGameState(GAME_STATE.COUNTDOWN); setPaused(false); }}
      onToggleSound={() => setSoundEnabled(!soundEnabled)}
      isSoundEnabled={soundEnabled}
      onHowTo={() => { safePlay(sounds.click, 0.5); clearAllTimeouts(); setPaused(false); onGameOver?.({ goToInstructions: true }); }}
    />
  </div>
);
}