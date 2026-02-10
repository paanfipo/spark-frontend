import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './CazadorDeBurbujas.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { cazadorDeBurbujasConfig } from './CazadorDeBurbujas.config';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_LEVEL: 'start_level',
  SHOWING: 'showing_pattern', 
  MOVING: 'moving',           
  WAITING: 'waiting_input',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

const FEEDBACK_DELAY = 1800;

export default function CazadorDeBurbujas({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  const evaluatingRef = useRef(false);
  const requestRef = useRef();
  const levelStartTimeRef = useRef(null); 

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [items, setItems] = useState([]);
  const [levelStats, setLevelStats] = useState([]);
  const [paused, setPaused] = useState(false);
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  const config = cazadorDeBurbujasConfig.levels[level];

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) {}
  }, [soundEnabled]);

  const calculateFinalMetrics = useCallback(() => {
    const totalPossible = levelStats.reduce((sum, s) => sum + s.totalTargets, 0);
    const totalFound = levelStats.reduce((sum, s) => sum + s.aciertos, 0);
    const precision = totalPossible > 0 ? (totalFound / totalPossible) * 100 : 0;
    
    // Extraemos todos los tiempos de respuesta
    const times = levelStats.map(s => s.responseTimeMs);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    // --- CÁLCULO DE VARIABILIDAD (Desviación Estándar) ---
    let stability = 0;
    if (times.length > 1) {
      const variance = times.reduce((a, b) => a + Math.pow(b - avgTime, 2), 0) / times.length;
      stability = Math.sqrt(variance);
    }

    return {
      indice_precision_rastreo: parseFloat(precision.toFixed(2)),
      tiempo_medio_respuesta: parseFloat(avgTime.toFixed(2)),
      errores_comision: levelStats.reduce((sum, s) => sum + s.erroresComision, 0),
      errores_omision: levelStats.reduce((sum, s) => sum + s.erroresOmision, 0),
      // Ahora enviamos el cálculo real en lugar de 0
      variabilidad_tiempo_respuesta: parseFloat(stability.toFixed(2)),
      score: score
    };
  }, [levelStats, score]);

  // --- 1. Conteo Inicial ---
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);
    if (countdownRef.current) clearInterval(countdownRef.current);
    let timeLeft = 3;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft > 0 ? timeLeft : null);
      if (timeLeft === 0) {
        clearInterval(countdownRef.current);
        setGameState(GAME_STATE.START_LEVEL);
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [gameState, safePlay]);

  // --- 2. Lógica de Colisiones ---
  const resolveCollision = (items) => {
    const radius = 5; 
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radius * 2;
        if (distance < minDistance && distance > 0) {
          const tempVx = items[i].vx;
          const tempVy = items[i].vy;
          items[i].vx = items[j].vx;
          items[i].vy = items[j].vy;
          items[j].vx = tempVx;
          items[j].vy = tempVy;
          const overlap = minDistance - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          items[i].x += nx * (overlap / 2);
          items[i].y += ny * (overlap / 2);
          items[j].x -= nx * (overlap / 2);
          items[j].y -= ny * (overlap / 2);
        }
      }
    }
    return items;
  };

  // --- 3. Motor de Animación ---
  const animate = useCallback(() => {
    if (gameState === GAME_STATE.MOVING && !paused) {
      setItems(prev => {
        let nextPositions = prev.map(it => {
          let nX = it.x + it.vx;
          let nY = it.y + it.vy;
          let nVx = it.vx;
          let nVy = it.vy;
          if (nX <= 0 || nX >= 90) nVx *= -1;
          if (nY <= 0 || nY >= 90) nVy *= -1;
          return { ...it, x: nX, y: nY, vx: nVx, vy: nVy };
        });
        return resolveCollision([...nextPositions]);
      });
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, paused]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // --- 4. Creación de Nivel (Sin amontonar imágenes) ---
  useEffect(() => {
    if (!paused && gameState === GAME_STATE.START_LEVEL) {
      const { targets, distractors, speed, type } = config;
      
      // 1. Obtenemos los símbolos y los desordenamos (Shuffling)
      const allAvailableAssets = [...cazadorDeBurbujasConfig.assets[type]]
        .sort(() => Math.random() - 0.5);
      
      const newItems = [];
      const minDistance = 12; 

      for (let i = 0; i < (targets + distractors); i++) {
        let x, y, overlap, attempts = 0;
        do {
          x = Math.random() * 80 + 5;
          y = Math.random() * 80 + 5;
          overlap = newItems.some(it => Math.sqrt(Math.pow(it.x - x, 2) + Math.pow(it.y - y, 2)) < minDistance);
          attempts++;
        } while (overlap && attempts < 50);

        newItems.push({
          id: i,
          // 2. Asignamos un símbolo único de la lista desordenada
          // Usamos el índice 'i' para asegurar que no se repita
          content: allAvailableAssets[i % allAvailableAssets.length],
          isTarget: i < targets,
          x, y,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          found: false,
          error: false
        });
      }
      setItems(newItems.sort(() => Math.random() - 0.5));
      setGameState(GAME_STATE.SHOWING);
    }
  }, [gameState, paused, config]);
  // --- 5. Control de Tiempos de Fase ---
  useEffect(() => {
    if (paused) return;

    if (gameState === GAME_STATE.SHOWING) {
      const timer = setTimeout(() => setGameState(GAME_STATE.MOVING), 2500);
      return () => clearTimeout(timer);
    }

    if (gameState === GAME_STATE.MOVING) {
      const timer = setTimeout(() => {
        setGameState(GAME_STATE.WAITING);
        levelStartTimeRef.current = Date.now();
      }, config.duration);
      return () => clearTimeout(timer);
    }
  }, [gameState, paused, config.duration]);

  const handleCellClick = (id) => {
    if (paused || gameState !== GAME_STATE.WAITING || evaluatingRef.current) return;
    const item = items.find(it => it.id === id);
    if (!item || item.found || item.error) return;

    const responseTimeMs = Date.now() - levelStartTimeRef.current;

    if (item.isTarget) {
      safePlay(sounds.click);
      setItems(prev => prev.map(it => it.id === id ? { ...it, found: true } : it));
      const foundCount = items.filter(it => it.isTarget && it.found).length + 1;
      
      if (foundCount === config.targets) {
        evaluatingRef.current = true;
        setGameState(GAME_STATE.FEEDBACK);
        setLevelStats(p => [...p, { level, responseTimeMs, aciertos: config.targets, erroresComision: items.filter(it => it.error).length, erroresOmision: 0, totalTargets: config.targets }]);
        setScore(s => s + (level * 25));
        safePlay(sounds.correct);
        setTimeout(() => {
          evaluatingRef.current = false;
          if (level < 5) {
            setLevel(l => l + 1);
            setGameState(GAME_STATE.START_LEVEL);
          } else {
            onGameOver?.(calculateFinalMetrics());
          }
        }, FEEDBACK_DELAY);
      }
    } else {
      safePlay(sounds.incorrect);
      setItems(prev => prev.map(it => it.id === id ? { ...it, error: true } : it));
      setLives(l => {
        if (l <= 1) {
          setLevelStats(p => [...p, { level, responseTimeMs, aciertos: items.filter(it => it.isTarget && it.found).length, erroresComision: items.filter(it => it.error).length + 1, erroresOmision: items.filter(it => it.isTarget && !it.found).length, totalTargets: config.targets }]);
          setTimeout(() => onGameOver?.(calculateFinalMetrics()), 1000);
          return 0;
        }
        return l - 1;
      });
    }
  };

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && countdown !== null && (
        <div className={styles.countdown}>{countdown}</div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && (
        <>
          <header className={styles.hud}>
            <div>Puntuación: {score}</div>
            <div>Nivel: {level}</div>
            <div>Vidas: {'❤️'.repeat(Math.max(0, lives))}</div>
          </header>

          <div className={styles.grid}>
            {items.map((item) => (
              <div
                key={item.id}
                className={`${styles.bubble} ${item.isTarget && gameState === GAME_STATE.SHOWING ? styles.targetHighlight : ''} ${item.found ? styles.correct : ''} ${item.error ? styles.incorrect : ''}`}
                style={{ 
                  position: 'absolute', 
                  left: `${item.x}%`, 
                  top: `${item.y}%`, 
                  width: '65px', 
                  height: '65px', 
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '2rem',
                  transition: gameState === GAME_STATE.MOVING ? 'none' : 'all 0.3s ease'
                }}
                onClick={() => handleCellClick(item.id)}
              >
                {gameState !== GAME_STATE.MOVING ? item.content : '🫧'}
              </div>
            ))}
          </div>
        </>
      )}
      
      <PauseMenu
  visible={paused}
  onResume={() => setPaused(false)}
  onRestart={() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPaused(false);
    setGameState(GAME_STATE.COUNTDOWN); 
  }}
  onToggleSound={() => {}} 
  isSoundEnabled={soundEnabled}
  onHowTo={() => { 
    safePlay(sounds.click, 0.5);
    setPaused(false);
    // ✅ ESTO ES LO QUE ACTIVA EL MODAL DE TU IMAGEN
    onGameOver?.({ goToInstructions: true }); 
  }}
/>
    </div>
  );
}