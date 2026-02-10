// src/games/SigueLaSecuencia/SigueLaSecuencia.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './SigueLaSecuencia.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

const MAX_STAGE = 9;
const HIGHLIGHT_MS = 600;
const GAP_MS = 400;
const FEEDBACK_DELAY_MS = 900;

// ✅ Acepta solo onGameOver
export default function SigueLaSecuencia({ onGameOver }) {

  // --- UI ---
    const [countdown, setCountdown] = useState(3); // ✅ Empieza en 3 para la cuenta atrás
    const [gameState, setGameState] = useState('countdown'); // ✅ Estado inicial
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
    const [reintentos, setReintentos] = useState(0);
  
    // --- Métricas (Se queda igual) ---
    const [maxSpan, setMaxSpan] = useState(0);
    const [totalAciertos, setTotalAciertos] = useState(0);
    const [erroresComision, setErroresComision] = useState(0);
    const [erroresOmision, setErroresOmision] = useState(0);
    const [tiemposRespuesta, setTiemposRespuesta] = useState([]);
  
    // --- Refs (Se queda igual) ---
    const sequenceStartTime = useRef(null);
    const timeoutsRef = useRef([]);
    const countdownRef = useRef(null);
  
  
    // --- safePlay, setPausableTimeout, clearAllTimeouts (Se quedan igual) ---
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
  
    // ✅ === Fin de juego (Simplificado) ===

  const endGame = useCallback(() => {
    if (gameState === 'game_over') return;

    setGameState('game_over');
    clearAllTimeouts();
    playSound(sounds.gameOver);

    // ✅ Prepara el objeto de MÉTRICAS CRUDAS
    const rawMetrics = {
      maxSpan: maxSpan,
      stage: stage,
      totalAciertos: totalAciertos,
      reintentos: reintentos,
      tiemposRespuesta: tiemposRespuesta,
      erroresComision: erroresComision,
      erroresOmision: erroresOmision,
    };
    
    onGameOver?.(rawMetrics);

  }, [
    gameState, clearAllTimeouts, safePlay, tiemposRespuesta, maxSpan, totalAciertos,
    erroresComision, erroresOmision, reintentos, stage, onGameOver
  ]); // Dependencias simplificadas

 // ✅ === Post feedback (Actualizado) ===
   const handleFeedbackContinuation = useCallback((wasCorrect) => {
     if (wasCorrect) {
       if (stage >= MAX_STAGE) {
         endGame(); // 👈 Llama a la nueva función endGame
       } else {
         setFeedback('');
         setStage(s => s + 1);
         setIsRetry(false);
         setGameState('next_level');
       }
     } else {
       if (isRetry) {
         endGame(); // 👈 Llama a la nueva función endGame
       } else {
         setFeedback('');
         setIsRetry(true);
         setGameState('next_level'); // Reintenta mismo nivel
       }
     }
   }, [stage, isRetry, endGame]); // 👈 Dependencia actualizada
 
   // === Evaluación (Se queda igual) ===
   const evaluarSecuencia = useCallback((selection, type) => {
     setGameState('feedback');
     clearAllTimeouts();
 
     const isCorrect = (type === 'correct');
 
     if (isCorrect) {
       const rt = Date.now() - sequenceStartTime.current;
       setTiemposRespuesta(t => [...t, rt]);
       setTotalAciertos(a => a + 1);
       setMaxSpan(s => Math.max(s, selection.length));
       setFeedback('correct');
       setNotification('¡Correcto!');
       safePlay(sounds.correct);
     } else {
       if (type === 'commission_error') setErroresComision(e => e + 1);
       if (type === 'omission_error')   setErroresOmision(o => o + 1);
       setFeedback('incorrect');
       setNotification(isRetry ? 'Fallaste nuevamente.' : 'Error. Reintenta este nivel.');
       if (!isRetry) setReintentos(r => r + 1);
       safePlay(sounds.incorrect);
     }
 
     setPausableTimeout(() => handleFeedbackContinuation(isCorrect), FEEDBACK_DELAY_MS);
   }, [clearAllTimeouts, setPausableTimeout, handleFeedbackContinuation, isRetry, safePlay]);
 
   // === Mostrar secuencia (Se queda igual) ===
   const showSequence = useCallback((seq) => {
     setGameState('showing_sequence');
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
       setGameState('waiting_input');
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
     if (gameState === 'showing_sequence') {
       showSequence(sequence);
     }
     if (gameState === 'feedback') {
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
     setReintentos(0);
     setMaxSpan(0);
     setTotalAciertos(0);
     setErroresComision(0);
     setErroresOmision(0);
     setTiemposRespuesta([]);
     sequenceStartTime.current = null;
     setGameState('start_level');
   }, [clearAllTimeouts]);
  
 
 
// ✅ === Generación de nivel (Se queda igual) ===
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
  
  // === Handlers de clic (Se queda igual) ===
   const handleClickObject = (clickedObject) => {
     if (paused || gameState !== 'waiting_input' || feedback) return;
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
       evaluarSecuencia(newSelection, 'commission_error');
     }
   };
 
   const toggleSound = useCallback(() => {
     const next = !soundEnabled;
     setSoundEnabled(next);
     localStorage.setItem('soundEnabled', String(next));
   }, [soundEnabled]);
 
   // === Efectos (Modificados) ===
   
  // Inicia/reinicia la cuenta atrás cada vez que entramos a 'countdown'
 useEffect(() => {
   if (gameState !== 'countdown') return;
 
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
 
   // Limpieza al salir de 'countdown' o al desmontar
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
         if (gameState === 'countdown') return; // No pausar en la cuenta atrás
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
     if (!paused && (gameState === 'start_level' || gameState === 'next_level')) {
       generateLevel(stage);
     }
   }, [gameState, stage, paused, generateLevel]); // generateLevel añadido
 
   // Hook para limpiar timeouts al desmontar
   useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);
 
   // === Render ===
   
 
 
   // ✅ Si el juego termina, no renderiza nada (el esqueleto mostrará el resumen)
   if (gameState === 'game_over') return null;
 
   const gridStyle = {
     gridTemplateColumns: `repeat(${stage < 4 ? 3 : 4}, 1fr)`,
   };
 
   return (
     <>
       {/* Capa de juego que sí se desenfoca al pausar */}
       <div className={styles.gameApp}>
         <div className={styles.gameShell} style={paused ? { filter: 'blur(3px)' } : undefined}>
           
           <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === 'countdown'}>
             ⏸ Pausa
           </button>
 
           {/* Muestra la cuenta atrás */ }
           {gameState === 'countdown' && countdown !== null && (
              <div className={styles.countdown}>{countdown}</div>
           )}
           
           {/* Oculta el HUD y el juego durante la cuenta atrás */ }
           {gameState !== 'countdown' && (
             <>
               <div className={styles.infoRow}>
                 <div className={styles.statItem}><strong>Nivel:</strong> {stage}</div>
                 <div className={styles.statItem}><strong>Objetos:</strong> {sequence.length}</div>
                 <div className={styles.statItem}><strong>Aciertos:</strong> {totalAciertos}</div>
                 <div className={styles.statItem}><strong>Errores:</strong> {erroresComision + erroresOmision}</div>
                 <div className={styles.statItem}><strong>Reintentos:</strong> {reintentos}</div>
               </div>
 
               <div className={styles.gameArea}>
                 {gameState === 'showing_sequence' && (
                   <div className={styles.sequenceViewer}>
                     {currentObject
                       ? <span className={styles.emoji}>{currentObject}</span>
                       : <span className={styles.placeholder}>+</span>}
                   </div>
                 )}
 
                 {(gameState === 'waiting_input' || gameState === 'feedback') && (
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
                           disabled={paused || gameState !== 'waiting_input' || isClicked}
                           type="button"
                         >
                           <span className={styles.emoji}>{obj}</span>
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>
               <div className={styles.notice}>{notification}</div>
             </>
           )}
 
         </div>
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
     // Sal del pause y vuelve al estado 'countdown'
     setPaused(false);
     setGameState('countdown'); // esto dispara el useEffect de arriba
   }}
   onToggleSound={toggleSound}
   isSoundEnabled={soundEnabled}
   onHowTo={() => alert("La función 'Cómo jugar' se debe conectar al GamePlayer.")}
 />
 
     </>
   );
 }