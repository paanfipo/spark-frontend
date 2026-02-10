import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Afin.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { SINONIMOS_DATA } from '../../data/objects';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over',
};

export default function Afin({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [currentLevel, setCurrentLevel] = useState(0); 
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lives, setLives] = useState(3);

  
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10); 
  const [paused, setPaused] = useState(false);
  
  const [metrics, setMetrics] = useState({
    aciertos: 0,
    erroresConfusion: 0,
    tiemposRespuesta: [],
  });

  const lastStartTimeRef = useRef(Date.now());
  const countdownRef = useRef(null);
  const timerRef = useRef(null);
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { }
  }, [soundEnabled]);

  // --- LÓGICA DE CARGA DE NIVEL ---
  const loadChallenge = useCallback(() => {
    const data = SINONIMOS_DATA[currentLevel];
    if (!data) return;

    const allOptions = [
      { text: data.correct, isCorrect: true },
      ...data.distractors.map(d => ({ text: d, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    setOptions(allOptions);
    setSelectedId(null); // Limpiamos selección anterior
    
    const newTimeBase = Math.max(10 - Math.floor(currentLevel / 2), 3);
    setTimeLeft(newTimeBase);
    
    setGameState(GAME_STATE.PLAYING);
    lastStartTimeRef.current = Date.now();
  }, [currentLevel]);

  const calculateFinalMetrics = useCallback(() => {
    const totalIntentos = metrics.aciertos + metrics.erroresConfusion;
    const avgTime = metrics.tiemposRespuesta.length > 0
      ? metrics.tiemposRespuesta.reduce((a, b) => a + b, 0) / metrics.tiemposRespuesta.length
      : 0;

    return {
      score: score,
      precision_semantica: totalIntentos > 0 ? (metrics.aciertos / totalIntentos) * 100 : 0,
      tiempo_medio_ms: parseFloat(avgTime.toFixed(2)),
      errores_confusion: metrics.erroresConfusion,
      latencia_maxima_ms: metrics.tiemposRespuesta.length > 0 ? Math.max(...metrics.tiemposRespuesta) : 0,
    };
  }, [metrics, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(calculateFinalMetrics());
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- INTERACCIÓN ---
  const handleOptionClick = useCallback((opt, index) => {
    if (gameState !== GAME_STATE.PLAYING || paused) return;

    const responseTime = Date.now() - lastStartTimeRef.current;
    setSelectedId(index);
    setGameState(GAME_STATE.FEEDBACK);

    if (timerRef.current) clearInterval(timerRef.current);

    if (opt?.isCorrect) {
      safePlay(sounds.correct);
      setScore(s => s + Math.ceil(timeLeft * 10));
      setMetrics(m => ({
        ...m,
        aciertos: m.aciertos + 1,
        tiemposRespuesta: [...m.tiemposRespuesta, responseTime]
      }));
    } else {
      // SI FALLA O SE ACABA EL TIEMPO: Restar vida
      safePlay(sounds.incorrect);
      const newLives = lives - 1;
      setLives(newLives);

      setMetrics(m => ({
        ...m,
        erroresConfusion: m.erroresConfusion + 1,
        tiemposRespuesta: [...m.tiemposRespuesta, responseTime]
      }));

      // Si se queda sin vidas, terminar después del feedback
      if (newLives <= 0) {
        setTimeout(() => endGame(), 1000);
        return; 
      }
    }

    setTimeout(() => {
      if (currentLevel + 1 >= SINONIMOS_DATA.length) {
        endGame();
      } else {
        setCurrentLevel(prev => prev + 1);
      }
    }, 1200);
  }, [gameState, paused, currentLevel, timeLeft, safePlay, endGame, lives]); 

  // --- EFECTOS ---
  
  // Este efecto carga el reto cada vez que cambia el nivel
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN && gameState !== GAME_STATE.GAME_OVER) {
      loadChallenge();
    }
  }, [currentLevel, loadChallenge]);

  // Cuenta atrás inicial
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      setCountdown(3);
      safePlay(sounds.start);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            loadChallenge();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [gameState, loadChallenge, safePlay]);

  // Temporizador de la barra
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0.1) {
            clearInterval(timerRef.current);
            handleOptionClick(null, -1); // Error por tiempo
            return 0;
          }
          return t - 0.1;
        });
      }, 100);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState, paused, handleOptionClick]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  const currentData = SINONIMOS_DATA[currentLevel];

  return (
    <div className={styles.gameContainer}>
      {/* Botón de pausa con sus funciones restauradas */}
      <button 
        className={styles.pauseButton} 
        onClick={() => setPaused(true)} 
        disabled={gameState === GAME_STATE.COUNTDOWN}
      >
        <span className={styles.pauseIcon}>⏸</span> Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div className={styles.hudData}>
          <div className={styles.hudSection}>Puntos: {score}</div>
          <div className={styles.hudSection}>Nivel: {currentLevel + 1}</div>
          <div className={styles.hudSection}>
            Vidas: <span className={styles.hearts}>
              {'❤️'.repeat(Math.max(0, lives))}
              {'🤍'.repeat(Math.max(0, 3 - lives))}
            </span>
          </div>
        </div>
        
        <div className={styles.timerTrack}>
          <div 
            className={styles.timerFill} 
            style={{ 
              width: `${(timeLeft / 10) * 100}%`,
              backgroundColor: timeLeft < 3 ? '#ff4757' : '#2ecc71',
              transition: 'width 0.1s linear'
            }} 
          />
        </div>
      </header>

      <main className={styles.mainArea}>
        <div className={styles.targetWord}>{SINONIMOS_DATA[currentLevel]?.target}</div>
        <div className={styles.optionsGrid}>
          {options.map((opt, i) => (
            <button
              key={i}
              className={`
                ${styles.optionBtn} 
                ${gameState === GAME_STATE.FEEDBACK && opt.isCorrect ? styles.correct : ''}
                ${gameState === GAME_STATE.FEEDBACK && selectedId === i && !opt.isCorrect ? styles.incorrect : ''}
              `}
              onClick={() => handleOptionClick(opt, i)}
              disabled={gameState !== GAME_STATE.PLAYING}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        Selecciona la palabra con mayor afinidad semántica.
      </footer>

      {/* Menú de pausa conectado */}
      <PauseMenu 
        visible={paused} 
        onResume={() => setPaused(false)} 
        onRestart={() => window.location.reload()} 
      />
    </div>
  );
}