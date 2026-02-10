// src/games/CajaDeRecuerdos/CajaDeRecuerdos.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './CajaDeRecuerdos.module.css'; // Crearemos este CSS después
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

// IMPORTA LAS PALABRAS DEL JS AQUI
import { WORD_BANK_GENERAL } from '../../data/words.js';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  SHOWING: 'showing_list',
  SELECTING: 'selecting_words',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

// --- Configuración del Juego ---
const TOTAL_ROUNDS = 3;
const WORDS_IN_LIST = 12;
const DISTRACTOR_COUNT = 12; // 12 palabras correctas + 12 distractoras = 24 en la cuadrícula
const SHOW_WORD_MS = 1000; // 1 segundo por palabra
const FEEDBACK_DELAY_MS = 2500; // Tiempo para mostrar feedback
const START_DELAY_MS = 100; // pausa breve tras el sonido de inicio


const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

export default function CajaDeRecuerdos({ onGameOver }) {

  // --- Palabras ---
  const FULL_WORD_BANK = WORD_BANK_GENERAL;

  // --- Estados del Juego ---
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN); // countdown, showing_list, selecting_words, feedback
  const [currentRound, setCurrentRound] = useState(1);

  
  
  // --- Listas de Palabras ---
  const [targetList, setTargetList] = useState([]); // Las 12 palabras a memorizar
  const [gridWords, setGridWords] = useState([]); // Las 24 palabras (12+12) en la cuadrícula
  const [currentWordIndex, setCurrentWordIndex] = useState(-1); // Para mostrar 1x1
  const [userSelection, setUserSelection] = useState(new Set()); // Palabras seleccionadas
  
  // --- Métricas  ---
  const [roundStats, setRoundStats] = useState([]); // [{ round: 1, correct: 0, commission: 0 }, ...]


  // --- Estados de UI y Pausa ---
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );
  
    // --- Refs  ---
    const timeoutsRef = useRef([]);
    const countdownRef = useRef(null);
    const wasPausedByUserRef = useRef(false);


  // --- Funciones de Pausa y Sonido (Estándar) ---
  const setPausableTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);
  const safePlay = useCallback((snd, vol = 1) => {
    console.log("SOUND:", snd);
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { /* no romper flujo */ }
  }, [soundEnabled]);

  // === 1. Lógica Principal del Juego ===

  // Inicia el juego después de la cuenta atrás
  const resetGame = useCallback(() => {
    clearAllTimeouts();
    // Elige 12 palabras objetivo para TODA la partida
    const shuffledBank = shuffleArray(FULL_WORD_BANK);
    setTargetList(shuffledBank.slice(0, WORDS_IN_LIST));
    
    // Elige 12 palabras distractoras (que no sean las objetivo)
    const distractors = shuffledBank.slice(WORDS_IN_LIST, WORDS_IN_LIST + DISTRACTOR_COUNT);
    const newGrid = shuffleArray([...shuffledBank.slice(0, WORDS_IN_LIST), ...distractors]);
    setGridWords(newGrid);

    // Resetea estadísticas
    setRoundStats([]);
    setCurrentRound(1);
    // Primera evaluación
    round: 1


    setCurrentWordIndex(-1);
    setUserSelection(new Set());

   
    
    setGameState(GAME_STATE.SHOWING); // Inicia la primera ronda
  }, [clearAllTimeouts]);

  // Se activa cuando gameState cambia a GAME_STATE.SHOWING
  useEffect(() => {
    if (gameState === GAME_STATE.SHOWING && !paused) {
      // Muestra cada palabra de la lista, una por una
      for (let i = 0; i < targetList.length; i++) {
        setPausableTimeout(() => {
          setCurrentWordIndex(i);
          safePlay(sounds.click, 0.3);
        }, (i + 1) * SHOW_WORD_MS);

      }
      
      // Cuando termina de mostrar la lista...
      setPausableTimeout(() => {
        setCurrentWordIndex(-1); // Oculta la palabra
        setGameState(GAME_STATE.SELECTING); // Pasa al modo de selección
      }, (targetList.length + 1) * SHOW_WORD_MS);
    }
  }, [gameState, currentRound, paused, targetList.length, setPausableTimeout, safePlay]);

  
  // === 2. Lógica de Evaluación ===

  // Maneja el clic en una palabra de la cuadrícula
  const handleWordClick = (word) => {
    if (gameState !== GAME_STATE.SELECTING || paused) return;

    
    safePlay(sounds.click, 0.5);
    setUserSelection(prevSet => {
      const newSet = new Set(prevSet);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  // Se llama al presionar "Listo"
  const handleSubmitSelection = () => {
    if (gameState !== GAME_STATE.SELECTING) return;

    clearAllTimeouts();
    setGameState(GAME_STATE.FEEDBACK);

    // Calcular métricas de esta ronda
    let correctCount = 0;
    let commissionCount = 0;
    
    userSelection.forEach(word => {
      if (targetList.includes(word)) {
        correctCount++;
      } else {
        commissionCount++;
      }
    });

    const newStat = { 
      round: currentRound, 
      correct: correctCount, 
      commission: commissionCount 
    };
    const updatedStats = [...roundStats, newStat];
    setRoundStats(updatedStats);

    setFeedbackMsg(
      `Ronda ${currentRound}: ${correctCount} correctas, ${commissionCount} intrusiones.`
    );

    safePlay(correctCount > (WORDS_IN_LIST / 2) ? sounds.correct : sounds.incorrect);

    // Decidir si el juego termina o pasa a la siguiente ronda
    setPausableTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        endGame(updatedStats); // Pasa las estadísticas finales
      } else {
        // Prepara la siguiente ronda
        setCurrentRound(r => r + 1);
        setUserSelection(new Set());
        setFeedbackMsg('');
        setCurrentWordIndex(-1);
        setGameState(GAME_STATE.SHOWING); // Vuelve a mostrar la MISMA lista
      }
    }, FEEDBACK_DELAY_MS);
  };

  // Finaliza el juego y envía datos crudos al esqueleto
  const endGame = (finalStats) => {
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = {
      roundData: finalStats,
      listSize: WORDS_IN_LIST,
    };
    onGameOver?.(rawMetrics);
  };

  // === 3. Hooks de Pausa y Arranque (Estándar) ===

  const pauseGame = useCallback(() => {
    wasPausedByUserRef.current = true;
    setPaused(true);
    safePlay(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts, safePlay]);


  const resumeGame = useCallback(() => {
    setPaused(false);
    if (wasPausedByUserRef.current) {
      safePlay(sounds.pauseOut, 0.5);
      wasPausedByUserRef.current = false;
    }

    if (gameState === GAME_STATE.FEEDBACK) {
      // Si estaba en feedback, re-lanza el timeout para la siguiente acción
      if (currentRound >= TOTAL_ROUNDS) {
        setPausableTimeout(() => endGame(roundStats), FEEDBACK_DELAY_MS);
      } else {
        setPausableTimeout(() => {
          setCurrentRound(r => r + 1);
          setUserSelection(new Set());
          setFeedbackMsg('');
          setCurrentWordIndex(-1);
          setGameState(GAME_STATE.SHOWING);
        }, FEEDBACK_DELAY_MS);
      }
    }
    // El 'useEffect' de GAME_STATE.SHOWINGse encargará de reanudar la lista
  }, [gameState, currentRound, roundStats, setPausableTimeout, endGame]);

  // Hook de arranque (Countdown)
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
      setTimeout(() => {
        resetGame();
      }, START_DELAY_MS);
    }
  }, 1000);

  // Limpieza al salir de GAME_STATE.COUNTDOWNo al desmontar
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
      if (e.key === 'Escape' && gameState !== GAME_STATE.COUNTDOWN) {
        setPaused(p => !p);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [gameState]); // gameState añadido
  
  // Hook de Pausa/Resumen
  useEffect(() => {
    if (paused) {
      pauseGame();
    } else {
      resumeGame();
    }
  }, [paused, pauseGame, resumeGame]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(s => !s);
    localStorage.setItem('soundEnabled', String(!soundEnabled));
  }, [soundEnabled]);

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);


  const gridContent = React.useMemo(() => {
    return gridWords.map(word => ({
      text: word,
      isTarget: targetList.includes(word)
    }));
  }, [gridWords, targetList]);


  if (gameState === GAME_STATE.GAME_OVER) return null;

  const renderContent = () => {
      // 1. Mostrar lista de palabras 1 a 1
      if (gameState === GAME_STATE.SHOWING) {
        if (currentWordIndex === -1) return null;
        const word = targetList[currentWordIndex];
        return (
          <div className={styles.wordViewer}>
            {word ? <span>{word}</span> : <span className={styles.placeholder}>+</span>}
          </div>
        );
      }

      // 2. Selección y Feedback
      if (gameState === GAME_STATE.SELECTING || gameState === GAME_STATE.FEEDBACK) {
        return (
          <>
            <div className={styles.grid}>
              {gridContent.map(({ text, isTarget }) => { // ✅ Ahora sí usamos gridContent
                const isSelected = userSelection.has(text);
                let feedbackClass = '';

                if (gameState === GAME_STATE.FEEDBACK) {
                  if (isSelected && isTarget) feedbackClass = styles.correct;
                  if (isSelected && !isTarget) feedbackClass = styles.commission; 
                  if (!isSelected && isTarget) feedbackClass = styles.omission; 
                }

                return (
                  <button
                    key={text}
                    className={`${styles.cell} ${isSelected ? styles.selected : ''} ${feedbackClass}`}
                    onClick={() => handleWordClick(text)}
                    disabled={gameState === GAME_STATE.FEEDBACK || paused}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
            <button
              className={styles.submitButton}
              onClick={handleSubmitSelection}
              disabled={gameState === GAME_STATE.FEEDBACK || paused || userSelection.size === 0}
            >
              Listo
            </button>
          </>
        );
      }
      return null;
    };

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN&& countdown !== null && (
         <div className={styles.countdown}>{countdown}</div>
      )}
      
      {gameState !== GAME_STATE.COUNTDOWN&& (
        <>
          <div className={styles.hud}>
            <div className={styles.statItem}>Ronda: <strong>{currentRound} / {TOTAL_ROUNDS}</strong></div>
            <div className={styles.statItem}>Palabras: <strong>{WORDS_IN_LIST}</strong></div>
            <div className={styles.statItem}>Seleccionadas: <strong>{userSelection.size}</strong></div>
          </div>
          
          <div className={styles.gameArea}>
            {renderContent()}
          </div>
          
          <div className={styles.footer}>
            {gameState === GAME_STATE.SHOWING&& (
              currentRound === 3
                ? "Última ronda: esta mide tu recuerdo consolidado"
                : "Memoriza la palabra..."
            )}

            {gameState === GAME_STATE.SELECTING && (
              currentRound === 3
                ? "Selecciona las palabras que recuerdes (ronda final)"
                : "Selecciona las palabras que recuerdes"
            )}

            {gameState === GAME_STATE.FEEDBACK && feedbackMsg}
          </div>

        </>
      )}

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => { setPaused(false); setCountdown(3); setGameState(GAME_STATE.COUNTDOWN); }}
        onToggleSound={toggleSound}
        isSoundEnabled={soundEnabled}
        onHowTo={() => alert("Función 'Cómo jugar' no conectada al esqueleto.")}
      />
    </div>
  );
}