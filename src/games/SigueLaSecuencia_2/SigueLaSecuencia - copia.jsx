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

  
  // --- Estados ---
  const [countdown, setCountdown] = useState(3); // ✅ Empieza en 3
  const [gameState, setGameState] = useState('countdown'); // ✅ Estado inicial
  const [stage, setStage] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [feedback, setFeedback] = useState('');
  const [notification, setNotification] = useState('');
  const [isRetry, setIsRetry] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  // Métricas
  const [maxSpan, setMaxSpan] = useState(0);
  const [totalAciertos, setTotalAciertos] = useState(0);
  const [erroresComision, setErroresComision] = useState(0);
  const [erroresOmision, setErroresOmision] = useState(0);
  const [tiemposRespuesta, setTiemposRespuesta] = useState([]);

  const sequenceStartTime = useRef(null);

  // --- Lógica de Pausa ---
  const [paused, setPaused] = useState(false);
  const timeoutsRef = useRef([]);

    // ✅ Countdown control (como en MatrizMemoria)
  const countdownRef = useRef(null);
  const countdownStartedRef = useRef(false);


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
  // (Renombrado de handleGameEnd a endGame)
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
    gameState, onGameOver, maxSpan, stage, totalAciertos, reintentos,
    tiemposRespuesta, erroresComision, erroresOmision, clearAllTimeouts
  ]); // Dependencias simplificadas

  // ✅ === Post feedback (Actualizado) ===
  const handleFeedbackContinuation = useCallback((wasCorrect) => {
    if (wasCorrect) {
      if (stage >= MAX_STAGE) {
        endGame(); // 👈 Llama a la nueva función endGame
      } else {
        setFeedback('');
        setStage((s) => s + 1);
        setGameState('next_level');
      }
    } else {
      if (isRetry) {
        endGame(); // 👈 Llama a la nueva función endGame
      } else {
        setFeedback('');
        setIsRetry(true);
        setGameState('next_level');
      }
    }
  }, [stage, isRetry, endGame]); // 👈 Dependencia actualizada

  // === Mostrar secuencia (Se queda igual) ===
  const showSequence = useCallback((seq) => {
    setGameState('showing_sequence');
    setUserInput([]);
    setFeedback('');
    setNotification('Memoriza la secuencia…');
    setHighlightIndex(-1);

    seq.forEach((num, idx) => {
      const onTime = (HIGHLIGHT_MS + GAP_MS) * idx;
      setPausableTimeout(() => {
        setHighlightIndex(num);
        playSound(sounds.click, 0.4); // Sonido al mostrar
      }, onTime);
      setPausableTimeout(() => setHighlightIndex(-1), onTime + HIGHLIGHT_MS);
    });

    const totalShowTime = (HIGHLIGHT_MS + GAP_MS) * seq.length;
    setPausableTimeout(() => {
      setGameState('waiting_input');
      setNotification('¡Tu turno! Repite la secuencia.');
      sequenceStartTime.current = Date.now();
    }, totalShowTime);

  }, [setPausableTimeout]);

  // === Pausa (Lógica se queda igual) ===
  const pauseGame = useCallback(() => {
    setPaused(true);
    playSound(sounds.pauseIn, 0.5);
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    playSound(sounds.pauseOut, 0.5);

    if (gameState === 'showing_sequence') {
      showSequence(sequence);
    }
    if (gameState === 'feedback') {
      handleFeedbackContinuation(feedback === 'correct');
    }

  }, [gameState, sequence, feedback, showSequence, handleFeedbackContinuation]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (gameState === 'countdown') return; // No pausar en cuenta atrás
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
  }, [pauseGame, resumeGame, gameState]); // gameState añadido

  // === Evaluación (Se queda igual) ===
  const evaluarSecuencia = useCallback((entrada, endTime) => {
    setGameState('feedback');
    clearAllTimeouts();

    let comision = 0;
    for (let i = 0; i < entrada.length; i++) {
      if (i >= sequence.length || entrada[i] !== sequence[i]) {
        comision++;
      }
    }
    const omision = (comision === 0 && entrada.length < sequence.length) ? (sequence.length - entrada.length) : 0;

    const isCorrect = comision === 0 && omision === 0;

    if (isCorrect) {
      const rt = endTime - sequenceStartTime.current;
      setTiemposRespuesta((t) => [...t, rt]);
      setTotalAciertos((a) => a + 1);
      setMaxSpan((s) => Math.max(s, sequence.length));
      setFeedback('correct');
      setNotification('¡Correcto!');
      setIsRetry(false);
      playSound(sounds.correct);
    } else {
      if (comision > 0) setErroresComision((e) => e + 1);
      if (omision > 0) setErroresOmision((o) => o + 1);

      setFeedback('incorrect');
      playSound(sounds.incorrect);
      if (isRetry) {
        setNotification('Fallaste nuevamente.');
      } else {
        setNotification('Fallaste. Reintenta este nivel.');
        setReintentos((r) => r + 1);
      }
    }

    setPausableTimeout(() => handleFeedbackContinuation(isCorrect), FEEDBACK_DELAY_MS);

  }, [sequence, isRetry, clearAllTimeouts, setPausableTimeout, handleFeedbackContinuation]);


  // === Sonido  ===
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

  // === Reset (Simplificado) ===
  const resetGame = useCallback(() => {
    clearAllTimeouts();
    setStage(1);
    setSequence([]);
    setUserInput([]);
    setHighlightIndex(-1);
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
  
 
  // === Generación de nivel (Se queda igual) ===
  const generateSequence = (currentStage) => {
    const length = Math.min(currentStage + 1, 10);
    return Array.from({ length }, () => Math.floor(Math.random() * 10));
  };

  // ✅ === Efectos (Modificados) ===
  
 
useEffect(() => {
  if (gameState !== 'countdown') return;

  // Evita que se reinicie más de una vez
  if (countdownRef.current) return;

  playSound(sounds.start);
  setCountdown(3);

  let timeLeft = 3;
  countdownRef.current = setInterval(() => {
    timeLeft -= 1;
    setCountdown(timeLeft > 0 ? timeLeft : null);

    if (timeLeft === 0) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;

      // IMPORTANTE: NO resetGame
      setGameState('start_level');
    }
  }, 1000);

  return () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };
}, [gameState]);




  // useEffect para generar nueva secuencia
  useEffect(() => {
    if (!paused && (gameState === 'start_level' || gameState === 'next_level')) {
      const newSeq = generateSequence(stage);
      setSequence(newSeq);
      showSequence(newSeq);
    }
  }, [gameState, stage, paused, showSequence]); // showSequence es useCallback
  
  // useEffect para limpiar timeouts
  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);


  // === Clic (Se queda igual) ===
  const handleClickNumber = (number) => {
    if (paused || gameState !== 'waiting_input') return; // Simplificado
    if (userInput.length >= sequence.length) return;

    playSound(sounds.click, 0.5);

    const newInput = [...userInput, number];
    setUserInput(newInput);

    const currentInputIndex = newInput.length - 1;
    if (sequence[currentInputIndex] !== number) {
      evaluarSecuencia(newInput, Date.now());
      return;
    }

    if (newInput.length === sequence.length) {
      const endTime = Date.now();
      evaluarSecuencia(newInput, endTime);
    }
  };


  // ✅ Si el juego termina, no renderiza nada
  if (gameState === 'game_over') {
    return null;
  }

  return (
    <div className={styles.gameContainer}>
     <button className={styles.pauseButton} onClick={pauseGame} disabled={gameState === 'countdown'}>
        ⏸ Pausa
     </button>

     {/* 1. Muestra la cuenta atrás */}
     {gameState === 'countdown' && countdown !== null && (
        <div className={styles.countdown}>{countdown}</div>
     )}

      {/* 2. Muestra el Juego (HUD, Grid, Footer) SOLO si NO es countdown */}
      {gameState !== 'countdown' && (
        <> 
          <header className={styles.hud}>
            <div className={styles.statItem}><span>Nivel:</span><strong>{stage}</strong></div>
            <div className={styles.statItem}><span>Aciertos:</span><strong>{totalAciertos}</strong></div>
            <div className={styles.statItem}><span>Errores:</span><strong>{erroresComision}</strong></div>
            <div className={styles.statItem}><span>Reintentos:</span><strong>{reintentos}</strong></div>
          </header>

          <div className={styles.grid}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
              <button
                key={number}
                className={[
                  styles.cell,
                  highlightIndex === number ? styles.pattern : '',
                  feedback === 'correct' && userInput.length > 0 && userInput[userInput.length - 1] === number ? styles.correct : '',
                  feedback === 'incorrect' && userInput.length > 0 && userInput[userInput.length - 1] === number ? styles.incorrect : '',
                ].join(' ')}
                onClick={() => handleClickNumber(number)}
                disabled={gameState === 'showing_sequence' || gameState === 'feedback' || paused}
                type="button"
              >
                {number}
              </button>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.sequenceInfo}>
              Tu secuencia: {userInput.length}/{sequence.length}
            </div>
            <div className={styles.instructions}>
              {notification}
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
                setGameState('countdown'); 
              }}
              onToggleSound={toggleSound}
              isSoundEnabled={soundEnabled}
              onHowTo={() => { 
                alert("La función 'Cómo jugar' se debe conectar al GamePlayer.");
              }}
            />
    </div>
  );
}