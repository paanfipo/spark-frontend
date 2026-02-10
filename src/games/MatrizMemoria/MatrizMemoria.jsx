// src/games/MatrizMemoria/MatrizMemoria.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MatrizMemoria.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { gameSettings } from './MatrizMemoria.config';

const PATTERN_DELAY = 1500;
const FEEDBACK_DELAY = 1800;

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_LEVEL: 'start_level',
  SHOWING: 'showing_pattern',
  WAITING: 'waiting_input',
  FEEDBACK: 'feedback',
  NEXT_LEVEL: 'next_level',
  GAME_OVER: 'game_over',
  // ...
};

export default function MatrizMemoria({ onGameOver }) { 

  const [gridSize, setGridSize] = useState(gameSettings.startingGridSize);

  const evaluatingRef = useRef(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);


  const [pattern, setPattern] = useState([]);
  const [userSelection, setUserSelection] = useState([]);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN); // ✅ Empieza a jugar
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [levelStats, setLevelStats] = useState([]);
  const [aciertosPorTablero, setAciertosPorTablero] = useState([]);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );

  const toggleSound = useCallback(() => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem('soundEnabled', newSoundState.toString());
  }, [soundEnabled]);

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { /* no romper flujo */ }
  }, [soundEnabled]);

  
  // ✅ calculateFinalMetrics
  const calculateFinalMetrics = useCallback(() => { 
  if (levelStats.length === 0) return {
    score: score,
    span_visoespacial_max: 0,
    tasa_aciertos: 0,
    total_aciertos: 0,
    errores_comision: 0,
    errores_omision: 0,
    tiempo_respuesta_promedio_ms: 0,
    estrellas_obtenidas: 0,
    estabilidad_desempeno: 0
};

  const totalAciertos = levelStats.reduce((sum, s) => sum + s.aciertos, 0);
  const totalErroresComision = levelStats.reduce((sum, s) => sum + s.erroresComision, 0);
  const totalErroresOmision = levelStats.reduce((sum, s) => sum + s.erroresOmision, 0);
  const totalResponseTime = levelStats.reduce((sum, s) => sum + s.responseTimeMs, 0);

  const totalObjetivos = totalAciertos + totalErroresOmision; // = total celdas objetivo presentadas
  const tiempoRespuestaPromedio = totalResponseTime / levelStats.length;
  const aciertosPorTablero = levelStats.map(s => s.aciertos);


  let estabilidadDesempeno = 0;

  if (aciertosPorTablero.length > 1) {
    const media =
      aciertosPorTablero.reduce((a, b) => a + b, 0) /
      aciertosPorTablero.length;

    const varianza =
      aciertosPorTablero.reduce(
        (acc, x) => acc + Math.pow(x - media, 2),
        0
      ) / aciertosPorTablero.length;

    const desviacion = Math.sqrt(varianza);

    estabilidadDesempeno = media > 0 ? 1 - desviacion / media : 0;
  }


  // Span visoespacial máximo (máx #celdas correctas en un tablero PERFECTO)
  const spanVisoespacialMax = Math.max(
    0,
    ...levelStats
      .filter(s => s.erroresComision === 0 && s.erroresOmision === 0)
      .map(s => s.aciertos)
  );

  // Tasa de aciertos (%)
  const tasaAciertos = totalObjetivos > 0
    ? (totalAciertos / totalObjetivos) * 100
    : 0;



  return {
    // MÉTRICAS PRINCIPALES 
    span_visoespacial_max: spanVisoespacialMax,
    tasa_aciertos: parseFloat(tasaAciertos.toFixed(2)),


    // SECUNDARIAS
    total_aciertos: totalAciertos,
    errores_comision: totalErroresComision,
    errores_omision: totalErroresOmision,
    tiempo_respuesta_promedio_ms: parseFloat(tiempoRespuestaPromedio.toFixed(2)),

    // gameplay
    estrellas_obtenidas: level - 1,
    score: score,
    estabilidad_desempeno: parseFloat(estabilidadDesempeno.toFixed(2)),

  };
}, [levelStats, level, score]);



  const endGame = useCallback(() => {
    playSound(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = calculateFinalMetrics();
    

    if (onGameOver) {
      onGameOver(rawMetrics);
    }
  }, [onGameOver, calculateFinalMetrics]); 

  // === PAUSA  ===
  const timeoutsRef = useRef([]);

  const setPausableTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const pauseGame = useCallback(() => {
    setPaused(true);
    playSound(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    playSound(sounds.pauseOut, 0.5);

    if (gameState === GAME_STATE.SHOWING) {
      setPausableTimeout(() => {
        setGameState(GAME_STATE.WAITING);
        setLevelStartTime(Date.now());
        evaluatingRef.current = false;
      }, PATTERN_DELAY);
    }

    if (gameState === GAME_STATE.FEEDBACK) {
      const patternSet = new Set(pattern);
      const selectionSet = new Set(userSelection);
      const aciertos = [...selectionSet].filter(cell => patternSet.has(cell)).length;
      const erroresComision = selectionSet.size - aciertos;
      const wasCorrect = aciertos === pattern.length && erroresComision === 0;

      if (wasCorrect) {
        setPausableTimeout(() => {
          setScore(prev => prev + 10 * level);
          setLevel(prev => prev + 1);
          setGameState(GAME_STATE.NEXT_LEVEL);
        }, FEEDBACK_DELAY);
      } else {
        if (lives <= 0) {
          setPausableTimeout(() => {
            endGame(); 
            evaluatingRef.current = false;
          }, FEEDBACK_DELAY);
        } else {
          setPausableTimeout(() => {
            setLevel(prev => Math.max(1, prev - 1));
            setGameState(GAME_STATE.NEXT_LEVEL);
          }, FEEDBACK_DELAY);
        }
      }
    }
  }, [
    gameState, pattern, userSelection, level, lives, endGame 
  ]); 

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPaused(isCurrentlyPaused => {
          if (isCurrentlyPaused) {
            resumeGame(); return false;
          } else {
            pauseGame(); return true;
          }
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pauseGame, resumeGame]);
  // === FIN DE PAUSA ===


  // Inicia/reinicia la cuenta atrás cada vez que entramos a 'countdown'
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;

    // Coloca el número en 3 y suena el inicio
    setCountdown(3);
    safePlay(sounds.start);

    // Limpia cualquier intervalo previo por seguridad
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    let timeLeft = 3;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft > 0 ? timeLeft : null);

      if (timeLeft === 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setGameState(GAME_STATE.START_LEVEL); 
      }
    }, 1000);

    // Limpieza al salir de 'countdown' o al desmontar
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameState, safePlay]); 
  // --- FIN DE AÑADIR HOOK ---


  // === LÓGICA DEL JUEGO  ===
 const generateNewPattern = useCallback(() => {
    setGameState(GAME_STATE.SHOWING);
    setUserSelection([]);
    const newPattern = new Set();
    
    // Fórmula de dificultad: Empieza con 3, aumenta 1 cada 2 niveles
    const itemsCount = gameSettings.startingPatternLength + Math.floor((level - 1) / 2);
    // Tope de seguridad para no llenar todo el tablero
    const patternSize = Math.min(itemsCount, (gridSize * gridSize) - 1);

    while (newPattern.size < patternSize) {
      // AQUÍ ESTABA EL ERROR: Usar gridSize en lugar de GRID_SIZE
      const randomIndex = Math.floor(Math.random() * (gridSize * gridSize));
      newPattern.add(randomIndex);
    }
    setPattern(Array.from(newPattern));

    // Tiempo dinámico: más items = un poco más de tiempo para ver
    const showTime = gameSettings.showTimeBase + (patternSize * gameSettings.showTimePerItem);

    setPausableTimeout(() => {
      setGameState(GAME_STATE.WAITING);
      setLevelStartTime(Date.now());
      evaluatingRef.current = false;
    }, showTime); // Usamos el tiempo calculado
  }, [level, gridSize, setPausableTimeout]); // Agregamos gridSize a dependencias

  useEffect(() => {
    if (!paused && (gameState === GAME_STATE.START_LEVEL|| gameState === GAME_STATE.NEXT_LEVEL)) {
      generateNewPattern();
    }
  }, [gameState, generateNewPattern, paused]);

 
  
  const evaluateAndAdvance = useCallback((selectionArray, wasImmediateError = false) => {
    if (evaluatingRef.current) return;
    evaluatingRef.current = true;

    setGameState(GAME_STATE.FEEDBACK);
    const responseTimeMs = Date.now() - levelStartTime;

    const patternSet = new Set(pattern);
    const selectionSet = new Set(selectionArray);

    const aciertos = [...selectionSet].filter(cell => patternSet.has(cell)).length;
    const erroresComision = selectionSet.size - aciertos;
    const erroresOmision = patternSet.size - aciertos;

    const wasCorrect = !wasImmediateError && (aciertos === pattern.length && erroresComision === 0);

    setLevelStats(prev => [...prev, { level, responseTimeMs, aciertos, erroresComision, erroresOmision }]);

    setAciertosPorTablero(prev => [...prev, aciertos]);


    if (wasCorrect) {
      playSound(sounds.correct);
      setPausableTimeout(() => {
        setScore(prev => prev + 10 * level);
        
        // --- NUEVO: Lógica para agrandar el tablero ---
        // Cada 3 niveles (3, 6, 9...), si no hemos llegado al máximo, crecemos.
        if (level % 3 === 0 && gridSize < gameSettings.maxGridSize) {
             setGridSize(prev => prev + 1);
        }
        // ---------------------------------------------

        setLevel(prev => prev + 1);
        setGameState(GAME_STATE.NEXT_LEVEL);
      }, FEEDBACK_DELAY);
    } else {
      playSound(sounds.incorrect);
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setPausableTimeout(() => {
          endGame();
          evaluatingRef.current = false;
        }, FEEDBACK_DELAY);
      } else {
        setPausableTimeout(() => {
          setLevel(prev => Math.max(1, prev - 1));
          setGameState(GAME_STATE.NEXT_LEVEL);
        }, FEEDBACK_DELAY);
      }
    }
  }, [level, lives, score, pattern, levelStartTime, endGame, setPausableTimeout]); // endGame y setPausableTimeout añadidos

  const handleCellClick = (index) => {
    if (paused || gameState !== 'waiting_input' || evaluatingRef.current) return;

    playSound(sounds.click, 0.5);

    setUserSelection(prev => {
      const set = new Set(prev);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      const nextSelection = Array.from(set);

      const justTurnedOnWrong = set.has(index) && !pattern.includes(index);
      if (justTurnedOnWrong) {
        evaluateAndAdvance(nextSelection, true);
        return nextSelection;
      }

      if (set.size === pattern.length) {
        evaluateAndAdvance(nextSelection, false);
        return nextSelection;
      }

      if (set.size > pattern.length) {
        evaluateAndAdvance(nextSelection, true);
        return nextSelection;
      }
      return nextSelection;
    });
  };

  const getCellClass = (index) => {
    if (gameState === GAME_STATE.FEEDBACK) {
      const isCorrect = pattern.includes(index) && userSelection.includes(index);
      const isOmission = pattern.includes(index) && !userSelection.includes(index);
      const isCommission = !pattern.includes(index) && userSelection.includes(index);
      if (isCorrect) return styles.correct;
      if (isOmission) return styles.omission;
      if (isCommission) return `${styles.incorrect} ${styles.errorMark}`;
      if (pattern.includes(index)) return styles.patternReveal;
    }
    if (gameState === GAME_STATE.SHOWING && pattern.includes(index)) return styles.pattern;
    if (gameState === GAME_STATE.WAITING && userSelection.includes(index)) return styles.selected;
    return '';
  };

  //if (gameState === GAME_STATE.GAME_OVER) return null;
  const gridStyle = React.useMemo(() => ({
  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
  gap: '8px',
  width: '100%',
  height: '100%',
}), [gridSize]);

if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {/* 1. Muestra la cuenta atrás */}
      {gameState === GAME_STATE.COUNTDOWN && countdown !== null && (
         <div className={styles.countdown}>{countdown}</div>
      )}

      
      {gameState !== GAME_STATE.COUNTDOWN && (
        <> 
          <header className={styles.hud}>
            <div>Puntuación: {score}</div>
            <div>Nivel: {level}</div>
            <div>Vidas: {'❤️'.repeat(Math.max(0, lives))}
                        {'🤍'.repeat(Math.max(0, 3 - lives))}
            </div>
          </header>

          <div
            className={styles.grid}
            
            style={{
               ...gridStyle, 
               ...(paused ? { pointerEvents: 'none', filter: 'grayscale(0.15)', opacity: 0.9 } : {})
            }}
          >
            
            {Array.from({ length: gridSize * gridSize }).map((_, index) => (
              <div
                  key={index}
                  role="button"
                  tabIndex={gameState === GAME_STATE.WAITING ? 0 : -1} // Solo navegable cuando se puede jugar
                  className={`${styles.cell} ${getCellClass(index)}`}
                  onClick={() => handleCellClick(index)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCellClick(index)}
              />
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.instructions}>
              {gameState === GAME_STATE.SHOWING && 'Observa el patrón...'}
              {gameState === GAME_STATE.WAITING && 'Selecciona las casillas del patrón.'}
              {gameState === GAME_STATE.FEEDBACK && (userSelection.some(c => !pattern.includes(c)) ? '❌ Error' : '✔️ Correcto')}
            </div>
          </div>
        </>
      )}

      
      <PauseMenu
        visible={paused}
        onResume={resumeGame}
        onRestart={() => {
          clearAllTimeouts();
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setPaused(false);
          setGameState(GAME_STATE.COUNTDOWN); 
        }}
        onToggleSound={toggleSound}
        isSoundEnabled={soundEnabled}
        onHowTo={() => { 
          safePlay(sounds.click, 0.5);
          clearAllTimeouts();
          setPaused(false);
          onGameOver?.({ goToInstructions: true }); // Envía la orden al padre
        }}
      />
    </div>
  );
}

