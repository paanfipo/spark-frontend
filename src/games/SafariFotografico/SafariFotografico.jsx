import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './SafariFotografico.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { SAFARI_TARGETS, SAFARI_DISTRACTORS } from '../../data/objects';

const GAME_DURATION = 60000;
const STIMULUS_DURATION = 1200; // Tiempo que el animal está en pantalla
const INTER_TRIAL_INTERVAL = 1000;

const GAME_STATE = { COUNTDOWN: 'countdown', PLAYING: 'playing', GAME_OVER: 'game_over' };

export default function SafariFotografico({ onGameOver }) { 
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [paused, setPaused] = useState(false);
  
  const [currentAnimal, setCurrentAnimal] = useState(null); // { type: 'duck' | 'other', pos: {x, y} }
  const [levelStats, setLevelStats] = useState([]);

  const trialStartTimeRef = useRef(null);
  const timeoutsRef = useRef([]);
  const hasRespondedRef = useRef(false);

  const safePlay = useCallback((snd) => {
    if (localStorage.getItem('soundEnabled') !== 'false') playSound(snd);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const calculateFinalMetrics = useCallback(() => {
    const aciertos = levelStats.filter(s => s.type === 'duck' && s.correct);
    const tiempos = aciertos.map(s => s.rt);
    const avgRT = tiempos.length > 0 ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;

    let variabilidad = 0;
    if (tiempos.length > 1) {
      const media = avgRT;
      const varianza = tiempos.reduce((acc, x) => acc + Math.pow(x - media, 2), 0) / tiempos.length;
      variabilidad = Math.sqrt(varianza);
    }

    const totalDucks = levelStats.filter(s => s.type === 'duck').length;

    return {
      score,
      total_aciertos: aciertos.length,
      tasa_aciertos: totalDucks > 0 ? (aciertos.length / totalDucks) * 100 : 0,
      errores_comision: levelStats.filter(s => s.type === 'other' && s.responded).length,
      errores_omision: levelStats.filter(s => s.type === 'duck' && !s.responded).length,
      tiempo_medio_reaccion_ms: parseFloat(avgRT.toFixed(2)),
      variabilidad_tr: parseFloat(variabilidad.toFixed(2)),
    };
  }, [levelStats, score]);

  // 1. Declaramos la función así para que JS la reconozca en todo el archivo
  function spawnAnimal() {
    if (gameState === GAME_STATE.GAME_OVER || paused) return;

    clearAllTimeouts();
    hasRespondedRef.current = false;
    
    const isDuck = Math.random() < 0.7; 
    const newAnimal = {
      type: isDuck ? 'duck' : 'other',
      emoji: isDuck 
        ? SAFARI_TARGETS[0] 
        : SAFARI_DISTRACTORS[Math.floor(Math.random() * SAFARI_DISTRACTORS.length)],
      pos: { x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 }
    };

    setCurrentAnimal(newAnimal);
    trialStartTimeRef.current = Date.now();

    const timeoutId = setTimeout(() => {
      if (!hasRespondedRef.current) {
        handleResponse(null); 
      }
    }, STIMULUS_DURATION);
    timeoutsRef.current.push(timeoutId);
  }

  // 2. Ahora handleResponse puede usar spawnAnimal sin problemas
  const handleResponse = useCallback((responded) => {
    if (hasRespondedRef.current || paused) return;
    hasRespondedRef.current = true;

    const rt = Date.now() - trialStartTimeRef.current;
    const type = currentAnimal?.type;
    let isCorrect = false;

    if (responded) {
      if (type === 'duck') {
        isCorrect = true;
        safePlay(sounds.correct);
        setScore(s => s + 15);
      } else {
        safePlay(sounds.incorrect);
        setLives(l => {
          const nl = l - 1;
          if (nl <= 0) {
            onGameOver?.(calculateFinalMetrics());
            return 0;
          }
          return nl;
        });
      }
    } else {
      isCorrect = type !== 'duck';
    }

    setLevelStats(prev => [...prev, { type, responded: !!responded, correct: isCorrect, rt: responded ? rt : null }]);
    
    setCurrentAnimal(null);
    // Llamamos a la función normal
    setTimeout(spawnAnimal, INTER_TRIAL_INTERVAL);
  }, [currentAnimal, paused, safePlay, calculateFinalMetrics, onGameOver]);
 

  // Manejo de eventos (Igual que tus otros juegos)
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timer);
            setGameState(GAME_STATE.PLAYING);
            spawnAnimal();
            return null;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, spawnAnimal]);

  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1000) {
            clearInterval(timer);
            onGameOver?.(calculateFinalMetrics());
            return 0;
          }
          return t - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, paused, calculateFinalMetrics, onGameOver]);

  return (
    <div className={styles.gameContainer} onClick={() => handleResponse(true)}>
      <button className={styles.pauseButton} onClick={(e) => { e.stopPropagation(); setPaused(true); }} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div>Tiempo: {Math.ceil(timeLeft / 1000)}s</div>
        <div>Puntos: {score}</div>
        <div>Vidas: {'❤️'.repeat(lives)}{'🤍'.repeat(3 - lives)}</div>
      </header>

      <div className={styles.field}>
        {currentAnimal && (
          <div 
            className={`${styles.animal} ${styles[currentAnimal.type]}`}
            style={{ left: `${currentAnimal.pos.x}%`, top: `${currentAnimal.pos.y}%` }}
          >
            {currentAnimal.emoji}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {currentAnimal ? "¡DISPARA LA FOTO!" : "Espera..."}
      </div>

      <PauseMenu visible={paused} onResume={() => setPaused(false)} onRestart={() => window.location.reload()} />
    </div>
  );
}