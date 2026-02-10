import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './QueSentidoTiene.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { SENTIDO_DATA } from '../../data/objects';

const GAME_STATE = { COUNTDOWN: 'countdown', PLAYING: 'playing', FEEDBACK: 'feedback', GAME_OVER: 'game_over' };

export default function QueSentidoTiene({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5); // Tiempo rápido por palabra
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' o 'incorrect'

  const [metrics, setMetrics] = useState({ aciertos: 0, errores: 0, tiempos: [] });
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  const safePlay = useCallback((snd) => {
    if (soundEnabled) try { playSound(snd); } catch (e) {}
  }, [soundEnabled]);

  // --- MÉTRICAS ---
  const calculateFinalMetrics = useCallback(() => {
    const total = metrics.aciertos + metrics.errores;
    const avgTime = total > 0 ? metrics.tiempos.reduce((a, b) => a + b, 0) / total : 0;
    
    // Desviación estándar para Variabilidad
    const variance = total > 1 ? metrics.tiempos.reduce((a, b) => a + Math.pow(b - avgTime, 2), 0) / total : 0;
    const stdDev = Math.sqrt(variance);

    return {
      score,
      precision_semantica: total > 0 ? (metrics.aciertos / total) * 100 : 0,
      tiempo_medio_ms: avgTime,
      errores_recuento: metrics.errores,
      variabilidad_ms: stdDev
    };
  }, [metrics, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(calculateFinalMetrics());
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- LÓGICA DE RESPUESTA ---
  const processAnswer = useCallback((direction) => {
    if (gameState !== GAME_STATE.PLAYING || paused) return;

    if (timerRef.current) clearInterval(timerRef.current);
    const responseTime = Date.now() - startTimeRef.current;
    const currentWord = SENTIDO_DATA[currentIdx];
    
    const isCorrect = (direction === 'right' && currentWord.value === 'positivo') || 
                      (direction === 'left' && currentWord.value === 'negativo');

    if (isCorrect) {
      safePlay(sounds.correct);
      setFeedback('correct');
      setScore(s => s + Math.ceil(timeLeft * 20));
      setMetrics(m => ({ ...m, aciertos: m.aciertos + 1, tiempos: [...m.tiempos, responseTime] }));
    } else {
      safePlay(sounds.incorrect);
      setFeedback('incorrect');
      setLives(l => l - 1);
      setMetrics(m => ({ ...m, errores: m.errores + 1, tiempos: [...m.tiempos, responseTime] }));
      if (lives <= 1) { setTimeout(endGame, 1000); return; }
    }

    setGameState(GAME_STATE.FEEDBACK);
    setTimeout(() => {
      if (currentIdx + 1 >= SENTIDO_DATA.length) endGame();
      else {
        setCurrentIdx(prev => prev + 1);
        setFeedback(null);
        setGameState(GAME_STATE.PLAYING);
        setTimeLeft(Math.max(5 - (currentIdx * 0.1), 1.5)); // Dificultad incremental
        startTimeRef.current = Date.now();
      }
    }, 800);
  }, [gameState, paused, currentIdx, lives, timeLeft, safePlay, endGame]);

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') processAnswer('left');
      if (e.key === 'ArrowRight') processAnswer('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processAnswer]);

  // Timer
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0.1) { clearInterval(timerRef.current); processAnswer('none'); return 0; }
          return t - 0.1;
        });
      }, 100);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState, paused, processAnswer]);

  // Countdown
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      safePlay(sounds.start);
      setTimeout(() => { setGameState(GAME_STATE.PLAYING); startTimeRef.current = Date.now(); }, 3000);
    }
  }, [gameState, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)}>⏸ Pausa</button>

      <header className={styles.hud}>
        <div className={styles.hudSection}>Puntos: {score}</div>
        <div className={styles.hudSection}>Nivel: {currentIdx + 1}</div>
        <div className={styles.hudSection}>Vidas: {'❤️'.repeat(lives)}{'🤍'.repeat(3-lives)}</div>
      </header>

      <div className={styles.timerTrack}>
        <div className={styles.timerFill} style={{ width: `${(timeLeft / 5) * 100}%` }} />
      </div>

      <main className={`${styles.mainArea} ${feedback === 'incorrect' ? styles.shake : ''}`}>
        <div className={styles.targetWord}>{SENTIDO_DATA[currentIdx]?.word}</div>
        
        <div className={styles.indicators}>
          <div className={styles.label}>⬅ NEGATIVO</div>
          <div className={styles.label}>POSITIVO ➡️</div>
        </div>
      </main>

      <PauseMenu visible={paused} onResume={() => setPaused(false)} onRestart={() => window.location.reload()} />
    </div>
  );
}