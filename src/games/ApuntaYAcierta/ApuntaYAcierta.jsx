import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ApuntaYAcierta.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

const GAME_STATE = { 
  COUNTDOWN: 'countdown', 
  PLAYING: 'playing', 
  GAME_OVER: 'game_over' 
};

export default function ApuntaYAcierta({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  
  // Lógica de movimiento
  const [objectPos, setObjectPos] = useState(-10);
  const speedRef = useRef(0.5);
  const requestRef = useRef();
  
  const errorsRef = useRef([]);
  const counts = useRef({ anticipacion: 0, retraso: 0, aciertos: 0 });
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  const safePlay = useCallback((snd, vol = 1) => {
    if (soundEnabled) try { playSound(snd, vol); } catch (e) {}
  }, [soundEnabled]);

  const clearAllTimeouts = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  // Animación del objeto
  const animate = useCallback(() => {
    if (!paused && gameState === GAME_STATE.PLAYING) {
      setObjectPos(prev => {
        let next = prev + speedRef.current;
        return next > 110 ? -10 : next;
      });
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [paused, gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const handleShoot = () => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;

    const targetPoint = 50; 
    const diff = objectPos - targetPoint; 
    const margin = 6; // Margen de acierto
    const diffInMs = (diff / speedRef.current) * 16.6;

    if (Math.abs(diff) <= margin) {
      safePlay(sounds.correct);
      setScore(s => s + 150);
      counts.current.aciertos++;
    } else {
      safePlay(sounds.incorrect);
      if (diff < 0) counts.current.anticipacion++;
      else counts.current.retraso++;
      
      // ✅ SISTEMA DE VIDAS
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setTimeout(finishGame, 200);
        return next;
      });
    }

    errorsRef.current.push(Math.abs(diffInMs));
    setObjectPos(-10); 
    speedRef.current = Math.min(speedRef.current + 0.08, 2.5); // Aumenta dificultad
  };

  const finishGame = useCallback(() => {
    const total = errorsRef.current.length || 1;
    const meanError = errorsRef.current.reduce((a, b) => a + b, 0) / total;
    const variance = errorsRef.current.reduce((a, b) => a + Math.pow(b - meanError, 2), 0) / total;

    const finalMetrics = {
      score,
      precision_temporal_porcentaje: Math.round((counts.current.aciertos / total) * 100),
      error_medio_ms: Math.round(meanError),
      errores_anticipacion: counts.current.anticipacion,
      errores_retraso: counts.current.retraso,
      desviacion_error_ms: Math.sqrt(variance)
    };
    
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(finalMetrics);
  }, [score, onGameOver]);

  // ✅ CONTEO REGRESIVO (IGUAL A MATRIZ)
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);

    let timeLeftC = 3;
    countdownRef.current = setInterval(() => {
      timeLeftC -= 1;
      setCountdown(timeLeftC > 0 ? timeLeftC : null);
      if (timeLeftC === 0) {
        clearInterval(countdownRef.current);
        setGameState(GAME_STATE.PLAYING);
      }
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer} onClick={handleShoot}>
      <button className={styles.pauseButton} onClick={(e) => { e.stopPropagation(); setPaused(true); }}>
        ⏸ Pausa
      </button>

      {/* ✅ CONTEO REGRESIVO VISUAL */}
      {gameState === GAME_STATE.COUNTDOWN && countdown !== null && (
        <div className={styles.countdown}>{countdown}</div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && (
        <>
          <header className={styles.hud}>
            <div>Puntos: {score}</div>
            <div>Tiempo: {timeLeft}s</div>
            {/* ✅ VIDAS CON CORAZONES BLANCOS */}
            <div>Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}</div>
          </header>

          <main className={styles.mainArea}>
            <div className={styles.targetLine}>
              <div className={styles.targetCenter}></div>
            </div>
            <div className={styles.projectile} style={{ left: `${objectPos}%` }}></div>
          </main>

          <footer className={styles.footer}>
            <div className={styles.instructions}>
              Pulsa cuando el círculo pase por el centro del blanco.
            </div>
          </footer>
        </>
      )}

      <PauseMenu 
        visible={paused} 
        onResume={() => setPaused(false)} 
        onRestart={() => {
            setLives(3);
            setScore(0);
            setGameState(GAME_STATE.COUNTDOWN);
            setPaused(false);
        }} 
      />
    </div>
  );
}