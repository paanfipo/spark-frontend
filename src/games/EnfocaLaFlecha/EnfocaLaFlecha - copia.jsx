import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './EnfocaLaFlecha.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { enfocaLaFlechaConfig } from './EnfocaLaFlecha.config';

const GAME_DURATION = 45000; 
const GAME_STATE = { COUNTDOWN: 'countdown', PLAYING: 'playing', GAME_OVER: 'game_over' };

export default function EnfocaLaFlecha({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1); 
  const [paused, setPaused] = useState(false);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [levelStats, setLevelStats] = useState([]); 
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const [lives, setLives] = useState(3);

  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  const countdownRef = useRef(null);
  const trialStartTimeRef = useRef(null);
  

  const safePlay = useCallback((snd) => { if (soundEnabled) playSound(snd); }, [soundEnabled]);

  // 1. CÁLCULO DE MÉTRICAS (Igual que Matriz de Memoria)
  const calculateFinalMetrics = useCallback(() => {
    const correctas = levelStats.filter(s => s.correct);
    const totalPresentados = levelStats.length;
    const tasaAciertos = totalPresentados > 0 ? (correctas.length / totalPresentados) * 100 : 0;
    
    const tiempos = correctas.map(s => s.rt);
    const avgTime = tiempos.length > 0 ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;

    let estabilidad = 0;
    if (tiempos.length > 1) {
      const varianza = tiempos.reduce((acc, x) => acc + Math.pow(x - avgTime, 2), 0) / tiempos.length;
      estabilidad = avgTime > 0 ? 1 - (Math.sqrt(varianza) / avgTime) : 0;
    }

    // ESTE ES EL OBJETO QUE ENVIAMOS AL FINAL
    return {
      tasa_aciertos: parseFloat(tasaAciertos.toFixed(2)),
      tiempo_respuesta_promedio_ms: parseFloat(avgTime.toFixed(2)),
      errores_comision: levelStats.filter(s => !s.correct && s.rt !== null).length,
      errores_omision: levelStats.filter(s => s.rt === null).length,
      estabilidad_desempeno: parseFloat(estabilidad.toFixed(2)),
      score: score,
      estrellas_obtenidas: level - 1 // Nivel completado
    };
  }, [levelStats, score, level]);

  // 2. CONTEO INICIAL
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setGameState(GAME_STATE.PLAYING);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay]);

  // 3. GENERADOR DE ESTÍMULOS
  const generateTrial = useCallback(() => {
    const dirs = ['Left', 'Right', 'Up', 'Down'];
    const target = dirs[Math.floor(Math.random() * 4)];
    let distractors = target;

    if (level === 2) {
      distractors = Math.random() > 0.5 ? target : dirs[Math.floor(Math.random() * 4)];
    } else if (level === 3) {
      distractors = dirs[Math.floor(Math.random() * 4)];
    }

    setCurrentTrial({ target, distractors });
    trialStartTimeRef.current = Date.now();
  }, [level]);

  // 4. MOTOR DEL JUEGO (PRIMER ESTÍMULO)
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !currentTrial) {
      generateTrial();
    }
  }, [gameState, currentTrial, generateTrial]);

  // 5. AQUÍ ESTÁ EL TIMER DE 45 SEGUNDOS QUE FALTABA
  // MOTOR DEL TIEMPO (Corregido)
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1000;
          
          if (newTime <= 0) {
            clearInterval(timer);
            // IMPORTANTE: Finaliza el juego aquí
            const finalMetrics = calculateFinalMetrics();
            onGameOver?.(finalMetrics);
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState, paused, onGameOver, calculateFinalMetrics]);

  // 6. MANEJO DE TECLAS Y RESPUESTAS
  const handleInput = useCallback((dir) => {
    if (paused || gameState !== GAME_STATE.PLAYING || !currentTrial) return;

    const rt = Date.now() - trialStartTimeRef.current;
    const isCorrect = dir === currentTrial.target;

    if (isCorrect) {
      safePlay(sounds.correct);
      setScore(s => s + 10);
    } else {
      safePlay(sounds.incorrect);

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        const finalMetrics = calculateFinalMetrics();
        onGameOver?.(finalMetrics);
        return; // Detenemos la ejecución
      }
    }

    setLevelStats(prev => [...prev, { correct: isCorrect, rt, level }]);
    
    if (levelStats.length > 0 && levelStats.length % 7 === 0) {
      setLevel(l => Math.min(l + 1, 3));
    }

    generateTrial();
  }, [currentTrial, gameState, paused, level, safePlay, levelStats.length, generateTrial, lives, onGameOver, calculateFinalMetrics]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        handleInput(e.key.replace('Arrow', ''));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleInput]);

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      {gameState === GAME_STATE.PLAYING && (
        <>
          <header className={styles.hud}>
            <div>Tiempo: {Math.ceil(timeLeft / 1000)}s</div>
            <div>Puntos: {score}</div>
            <div>
                Vidas: {'❤️'.repeat(Math.max(0, lives))}
                    {'🤍'.repeat(Math.max(0, 3 - lives))}
            </div>
          </header>
          
          <div className={styles.grid}>
            {currentTrial && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px' }}>
                <div style={{ fontSize: '6rem', opacity: level > 1 ? 0.5 : 0, color: 'white' }}>
                  {getArrowIcon(currentTrial.distractors)}
                </div>
                <div style={{ fontSize: '10rem', color: '#f1c40f', filter: 'drop-shadow(0 0 15px gold)' }}>
                  {getArrowIcon(currentTrial.target)}
                </div>
                <div style={{ fontSize: '6rem', opacity: level > 1 ? 0.5 : 0, color: 'white' }}>
                  {getArrowIcon(currentTrial.distractors)}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <PauseMenu 
        visible={paused} 
        onResume={() => setPaused(false)} 
        onRestart={() => window.location.reload()} 
        onHowTo={() => onGameOver?.({ goToInstructions: true })}
      />
    </div>
  );
}

function getArrowIcon(dir) {
  const map = { Up: '⬆️', Down: '⬇️', Left: '⬅️', Right: '➡️' };
  return map[dir] || '';
}