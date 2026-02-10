// src/games/RecuerdaLosObjetos/RecuerdaLosObjetos.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

import styles from './RecuerdaLosObjetos.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

// --- Importa Banco de Objetos ---
import { OBJECT_BANK_GENERAL } from '../../data/objects.js';



const ALL_OBJECTS = OBJECT_BANK_GENERAL;

// --- Configuración del Juego (Se queda igual) ---
const MAX_STAGE = 8;
const SHOW_ITEM_MS = 1000;
const GAP_MS = 300;
const FEEDBACK_DELAY_MS = 1200;

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_LEVEL: 'start_level',
  SHOWING: 'showing_sequence',
  WAITING: 'waiting_input',
  FEEDBACK: 'feedback',
  NEXT_LEVEL: 'next_level',
  GAME_OVER: 'game_over'
};


// --- Utilidad ---
const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);


export default function RecuerdaLosObjetos({ onGameOver }) {

  // --- UI ---
  const [countdown, setCountdown] = useState(3); // Empieza en 3 para la cuenta atrás
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN); // Estado inicial
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );

  // --- Juego  ---
  const [stage, setStage] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [gridObjects, setGridObjects] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [currentObject, setCurrentObject] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [notification, setNotification] = useState('');
  const [isRetry, setIsRetry] = useState(false);
  const [lives, setLives] = useState(3);

  // --- Métricas ---
  const [maxSpan, setMaxSpan] = useState(0);
  const [totalAciertos, setTotalAciertos] = useState(0);
  const [erroresComision, setErroresComision] = useState(0);
  const [erroresOmision, setErroresOmision] = useState(0);
  const [tiemposRespuesta, setTiemposRespuesta] = useState([]);
  const [totalSecuencias, setTotalSecuencias] = useState(0);
  const [secuenciasCorrectas, setSecuenciasCorrectas] = useState(0);
  const [erroresOrden, setErroresOrden] = useState(0);


  // --- Refs  ---
  const sequenceStartTime = useRef(null);
  const timeoutsRef = useRef([]);
  const countdownRef = useRef(null);


  // --- safePlay, setPausableTimeout, clearAllTimeouts ---
  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { /* no romper flujo */ }
  }, [soundEnabled]);

  const setPausableTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // ✅ === Fin de juego ===
  // (Renombrado de handleGameEnd a endGame)
  const endGame = useCallback(() => {
    if (gameState === GAME_STATE.GAME_OVER) return;
    setGameState(GAME_STATE.GAME_OVER);
    clearAllTimeouts();
    safePlay(sounds.gameOver);

    const tiempoPromedioMs = tiemposRespuesta.length
      ? tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length
      : 0;
      
    const rawMetrics = {
      maxObjectSpan: maxSpan,

      totalSecuencias,
      secuenciasCorrectas,

      erroresComision,
      erroresOrden,
      erroresOmision,

      tiempoRespuestaMs: parseFloat(tiempoPromedioMs.toFixed(2)),
    };


    onGameOver?.(rawMetrics);

  }, [
    gameState, clearAllTimeouts, safePlay, tiemposRespuesta, maxSpan, totalAciertos,
    erroresComision, erroresOmision, lives, stage, onGameOver
  ]); 

  // ✅ === Post feedback (Actualizado) ===
  const handleFeedbackContinuation = useCallback((wasCorrect) => {
    if (wasCorrect) {
      if (stage >= MAX_STAGE) {
        endGame(); 
      } else {
        setFeedback('');
        setStage(s => s + 1);
        setGameState(GAME_STATE.NEXT_LEVEL);
      }
    } else {
      // ✅ Si se acabaron las vidas, fin del juego
      if (lives <= 0) {
        endGame(); 
      } else {
        setFeedback('');
        setGameState(GAME_STATE.NEXT_LEVEL); 
      }
    }
  }, [stage, lives, endGame]); // Agregamos lives a las dependencias

  // === Evaluación  ===
  const evaluarSecuencia = useCallback((selection, type) => {
    setGameState(GAME_STATE.FEEDBACK);
    clearAllTimeouts();

    setTotalSecuencias(t => t + 1);


    const isCorrect = (type === 'correct');

    if (isCorrect) {
      setSecuenciasCorrectas(c => c + 1);
      const rt = Date.now() - sequenceStartTime.current;
      setTiemposRespuesta(t => [...t, rt]);
      setTotalAciertos(a => a + 1);
      setMaxSpan(s => Math.max(s, selection.length));
      setFeedback('correct');
      setNotification('¡Correcto!');
      safePlay(sounds.correct);
    } else {
  if (type === 'commission_error') setErroresComision(e => e + 1);
  if (type === 'order_error')      setErroresOrden(o => o + 1);
  if (type === 'omission_error')   setErroresOmision(o => o + 1);

  // ✅ Restamos una vida
  const newLives = lives - 1;
  setLives(newLives);

  setFeedback('incorrect');

  setNotification(newLives <= 0 ? 'Juego terminado.' : `Te quedan ${newLives} ${newLives === 1 ? 'vida' : 'vidas'}. ¡Inténtalo de nuevo!`);
  safePlay(sounds.incorrect);
}


    setPausableTimeout(() => handleFeedbackContinuation(isCorrect), FEEDBACK_DELAY_MS);
  }, [clearAllTimeouts, setPausableTimeout, handleFeedbackContinuation, isRetry, safePlay]);

  // === Mostrar secuencia (Se queda igual) ===
  const showSequence = useCallback((seq) => {
    setGameState(GAME_STATE.SHOWING);
    setUserInput([]);
    setFeedback('');
    setNotification('Memoriza...');
    setCurrentObject(null);

    seq.forEach((obj, idx) => {
      const onTime = (SHOW_ITEM_MS + GAP_MS) * idx;
      setPausableTimeout(() => {
        setCurrentObject(obj);
        safePlay(sounds.click, 0.3); // Sonido al mostrar
      }, onTime);
    });

    const totalShowTime = (SHOW_ITEM_MS + GAP_MS) * seq.length;
    setPausableTimeout(() => {
      setCurrentObject(null);
      setGameState(GAME_STATE.WAITING);
      setNotification('¡Tu turno! Haz clic en orden.');
      sequenceStartTime.current = Date.now();
    }, totalShowTime + SHOW_ITEM_MS);
  }, [setPausableTimeout, safePlay]);

  // === Pausa (Se queda igual) ===
  const pauseGame = useCallback(() => {
    setPaused(true);
    safePlay(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts, safePlay]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    safePlay(sounds.pauseOut, 0.5);
    if (gameState === GAME_STATE.SHOWING) {
      showSequence(sequence);
    }
    if (gameState === GAME_STATE.FEEDBACK) {
      handleFeedbackContinuation(feedback === 'correct');
    }
  }, [gameState, sequence, feedback, showSequence, handleFeedbackContinuation, safePlay]);

  // === Reset (Se queda igual) ===
  const resetGame = useCallback(() => {
    clearAllTimeouts();
    setStage(1);
    setSequence([]);
    setGridObjects([]);
    setUserInput([]);
    setCurrentObject(null);
    setFeedback('');
    setNotification('Preparando...');
    setIsRetry(false);
    setLives(3);
    setMaxSpan(0);
    setTotalAciertos(0);
    setErroresComision(0);
    setErroresOmision(0);
    setTiemposRespuesta([]);
    setTotalSecuencias(0);
    setSecuenciasCorrectas(0);
    setErroresOrden(0);

    sequenceStartTime.current = null;
    setGameState(GAME_STATE.START_LEVEL);
  }, [clearAllTimeouts]);


  
  // ✅ === Generación de nivel  ===
  const generateLevel = useCallback((currentStage) => {
    const sequenceLength = Math.min(currentStage + 2, 8);  // 3..8
    const gridRows = currentStage < 4 ? 3 : 4;            // 3x3 o 4x4
    const gridSize = gridRows * gridRows;                 // 9 o 16
    const distractorCount = gridSize - sequenceLength;

    const shuffled = shuffleArray(ALL_OBJECTS);
    const newSequence = shuffled.slice(0, sequenceLength);
    const newDistractors = shuffled.slice(sequenceLength, sequenceLength + distractorCount);
    const newGrid = shuffleArray([...newSequence, ...newDistractors]);

    setSequence(newSequence);
    setGridObjects(newGrid);
    showSequence(newSequence);
  }, [showSequence]); // showSequence añadido como dependencia

  // === Handlers de clic  ===
  const handleClickObject = (clickedObject) => {
    if (paused || gameState !== GAME_STATE.WAITING || feedback) return;
    if (userInput.length >= sequence.length) return;

    safePlay(sounds.click, 0.5);

    const newSelection = [...userInput, clickedObject];
    setUserInput(newSelection);

    const idx = userInput.length;
    const correctObject = sequence[idx];

if (clickedObject === correctObject) {
  if (newSelection.length === sequence.length) {
    evaluarSecuencia(newSelection, 'correct');
  }
} else {
  // Diferenciar error de orden vs error de comisión
  if (sequence.includes(clickedObject)) {
    evaluarSecuencia(newSelection, 'order_error');
  } else {
    evaluarSecuencia(newSelection, 'commission_error');
  }
}

  };

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('soundEnabled', String(next));
  }, [soundEnabled]);

  // === Efectos  ===
  
 // Inicia/reinicia la cuenta atrás cada vez que entramos a GAME_STATE.COUNTDOWN
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
      resetGame(); // arranca el juego
    }
  }, 1000);

  // Limpieza al salir de GAME_STATE.COUNTDOWN o al desmontar
  return () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };
}, [gameState, resetGame, safePlay]);


  // Hook para la tecla ESC (Pausa)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (gameState === GAME_STATE.COUNTDOWN) return; // No pausar en la cuenta atrás
        setPaused((isPaused) => {
          if (isPaused) { resumeGame(); return false; }
          else { pauseGame(); return true; }
        });
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [pauseGame, resumeGame, gameState]); // gameState añadido

  // Hook para generar niveles
  useEffect(() => {
    if (!paused && (gameState === GAME_STATE.START_LEVEL || gameState === GAME_STATE.NEXT_LEVEL)) {
      generateLevel(stage);
    }
  }, [gameState, stage, paused, generateLevel]); // generateLevel añadido

  // Hook para limpiar timeouts al desmontar
  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);


  const gridStyle = React.useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${stage < 4 ? 3 : 4}, 1fr)`,
    gap: '20px', // ✅ Aumentamos el espacio entre emojis
    width: '100%',
    // ✅ Hacemos que la caja contenedora sea mucho más ancha
    maxWidth: stage < 4 ? '500px' : '650px', 
    margin: '0 auto',
    padding: '20px'
  }), [stage]);
    // Si el juego termina, no renderiza nada (el esqueleto mostrará el resumen)
  if (gameState === GAME_STATE.GAME_OVER) return null;

  
  return (
    <>
      {/* Capa de juego que sí se desenfoca al pausar */}
      <div className={styles.gameContainer} style={paused ? { filter: 'blur(3px)' } : undefined}>
        
          
          <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === GAME_STATE.COUNTDOWN}>
            ⏸ Pausa
          </button>

          {/* Muestra la cuenta atrás */ }
          {gameState === GAME_STATE.COUNTDOWN && countdown !== null && (
             <div className={styles.countdown}>{countdown}</div>
          )}
          
          {/* Oculta el HUD y el juego durante la cuenta atrás */ }
          {gameState !== GAME_STATE.COUNTDOWN && (
            <>
              <div className={styles.hud}>
                <div className={styles.statItem}><strong>Nivel:</strong> {stage}</div>
                <div className={styles.statItem}><strong>Objetos:</strong> {sequence.length}</div>
                <div className={styles.statItem}><strong>Aciertos:</strong> {totalAciertos}</div>
                <div className={styles.statItem}><strong>Errores:</strong> {erroresComision + erroresOmision}</div>
                <div className={styles.statItem}>
                  <strong>Vidas:</strong> 
                  <span className={styles.livesHeart}>
                    {'❤️'.repeat(Math.max(0, lives))}
                    {'🤍'.repeat(Math.max(0, 3 - lives))}
                  </span>
                </div>
              </div>

              <div className={styles.gameArea}>
                {gameState === GAME_STATE.SHOWING && (
                  <div className={styles.sequenceViewer}>
                    {currentObject
                      ? <span className={styles.emoji}>{currentObject}</span>
                      : <span className={styles.placeholder}>+</span>}
                  </div>

                  
                )}

                {(gameState === GAME_STATE.WAITING || gameState === GAME_STATE.FEEDBACK) && (
                  <div className={styles.playBlock}>
                    
                    <div className={styles.grid} style={gridStyle}>
                      {gridObjects.map((obj, idx) => {
                        const isClicked = userInput.includes(obj);
                        const isLast = userInput[userInput.length - 1] === obj;
                        return (
                          <button
                            key={`${obj}-${idx}`}
                            className={[
                              styles.cell,
                              isClicked ? styles.clicked : '',
                              feedback === 'correct' && isLast ? styles.correct : '',
                              feedback === 'incorrect' && isLast ? styles.incorrect : '',
                            ].join(' ')}
                            onClick={() => handleClickObject(obj)}
                            disabled={paused || gameState !== GAME_STATE.WAITING || isClicked}
                            type="button"
                          >
                            <span className={styles.emoji}>{obj}</span>
                          </button>
                        );
                      })}
                    </div>                   
                  </div>
                )}
              </div>
            </>
          )}

          {gameState !== GAME_STATE.COUNTDOWN && (
            <div className={styles.instructions}>
              {gameState === GAME_STATE.SHOWING
                ? 'Memoriza la secuencia...'
                : gameState === GAME_STATE.WAITING
                ? '¡Tu turno! Haz clic en orden.'
                : notification}
            </div>
          )}
      </div>

      {/* Menú de pausa: FUERA del shell borroso; recibe los clics y se ve nítido */}
      <PauseMenu
        visible={paused}
        onResume={resumeGame}
        onRestart={() => {
          // Limpia timeouts del juego en curso
          clearAllTimeouts();
          // Limpia también un conteo previo si existiera
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          // Sale del pause y vuelve al estado GAME_STATE.COUNTDOWN
          setPaused(false);
          setGameState(GAME_STATE.COUNTDOWN); // esto dispara el useEffect de arriba
        }}
        onToggleSound={toggleSound}
        isSoundEnabled={soundEnabled}
        onHowTo={() => alert("La función 'Cómo jugar' se debe conectar al GamePlayer.")}
      />

    </>
  );
}