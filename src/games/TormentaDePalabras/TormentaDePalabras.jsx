import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './TormentaDePalabras.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { TORMENTA_DATA } from '../../data/objects';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

export default function TormentaDePalabras({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [targetLetter, setTargetLetter] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [wordList, setWordList] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Refs para métricas y control
  const countdownRef = useRef(null);
  const timerRef = useRef(null);
  const timeoutsRef = useRef([]);
  const startTimeRef = useRef(null);
  const lastWordTimeRef = useRef(null);
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  // Métricas solicitadas
  const [metrics, setMetrics] = useState({
    validas: [],
    comision: 0,
    perseveraciones: 0,
    tiemposInterRespuesta: [],
    latenciaInicial: null
  });

  const safePlay = useCallback((snd, vol = 1) => {
    if (soundEnabled) try { playSound(snd, vol); } catch (e) {}
  }, [soundEnabled]);

  // --- LÓGICA DE PAUSA (Igual a Matriz) ---
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

  // --- CÁLCULO DE MÉTRICAS ---
  const calculateFinalMetrics = useCallback(() => {
    const totalValidas = metrics.validas.length;
    const tiempoTotal = 60 - timeLeft;
    
    // Variabilidad (Desviación Estándar de tiempos inter-respuesta)
    let variabilidad = 0;
    if (metrics.tiemposInterRespuesta.length > 1) {
      const media = metrics.tiemposInterRespuesta.reduce((a, b) => a + b, 0) / metrics.tiemposInterRespuesta.length;
      const varianza = metrics.tiemposInterRespuesta.reduce((acc, x) => acc + Math.pow(x - media, 2), 0) / metrics.tiemposInterRespuesta.length;
      variabilidad = Math.sqrt(varianza);
    }

    return {
      total_validas: totalValidas,
      tasa_produccion: parseFloat(((totalValidas / (tiempoTotal || 1)) * 60).toFixed(2)),
      errores_comision: metrics.comision,
      perseveraciones: metrics.perseveraciones,
      latencia_inicial: metrics.latenciaInicial || 0,
      variabilidad_inter_respuesta: parseFloat(variabilidad.toFixed(2)),
      score: score
    };
  }, [metrics, timeLeft, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(calculateFinalMetrics());
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- MANEJO DE ENTRADA ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const word = inputValue.trim().toUpperCase();
    if (!word || gameState !== GAME_STATE.PLAYING || paused) return;

    const now = Date.now();
    
    // Latencia Inicial (Primera palabra)
    if (metrics.latenciaInicial === null) {
      setMetrics(m => ({ ...m, latenciaInicial: now - startTimeRef.current }));
    }

    const timeSinceLast = now - (lastWordTimeRef.current || startTimeRef.current);
    let isError = false;
    let errorType = null;

    if (wordList.includes(word)) {
      errorType = 'perseveracion';
      isError = true;
    } else if (!word.startsWith(targetLetter) || word.length < 3) {
      errorType = 'comision';
      isError = true;
    }

    if (isError) {
      safePlay(sounds.incorrect);
      if (errorType === 'comision') {
        setLives(l => {
          const next = l - 1;
          if (next <= 0) setTimeout(endGame, 100);
          return next;
        });
      }
      setMetrics(m => ({
        ...m,
        perseveraciones: errorType === 'perseveracion' ? m.perseveraciones + 1 : m.perseveraciones,
        comision: errorType === 'comision' ? m.comision + 1 : m.comision
      }));
    } else {
      safePlay(sounds.correct);
      setWordList(prev => [word, ...prev]);
      setScore(s => s + 100);
      setMetrics(m => ({
        ...m,
        validas: [...m.validas, word],
        tiemposInterRespuesta: [...m.tiemposInterRespuesta, timeSinceLast]
      }));
    }

    setInputValue('');
    lastWordTimeRef.current = now;
  };

  // --- EFECTOS (Countdown y Timer) ---
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      const banco = TORMENTA_DATA.letras_faciles;
      setTargetLetter(banco[Math.floor(Math.random() * banco.length)]);
      setCountdown(3);
      safePlay(sounds.start);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setGameState(GAME_STATE.PLAYING);
            startTimeRef.current = Date.now();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay]);

  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); endGame(); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState, paused, endGame]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div className={styles.hudSection}>Puntuación: {score}</div>
        <div className={styles.hudSection}>Letra: <span className={styles.targetLetter}>{targetLetter}</span></div>
        <div className={styles.hudSection}>
          Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}
        </div>
      </header>

      <main className={styles.mainArea}>
        <div className={styles.timerTrack}>
          <div className={styles.timerFill} style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: timeLeft < 10 ? '#e74c3c' : '#2ecc71' }} />
        </div>

        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            className={styles.wordInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe y presiona Enter..."
            autoFocus
            disabled={gameState !== GAME_STATE.PLAYING || paused}
          />
        </form>

        <div className={styles.wordCloud}>
          {wordList.map((w, i) => (
            <span key={i} className={styles.wordTag}>{w}</span>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        Palabras válidas: {wordList.length} | Tiempo: {timeLeft}s
      </footer>

      <PauseMenu 
        visible={paused} 
        onResume={resumeGame} 
        onRestart={() => window.location.reload()} 
      />
    </div>
  );
}