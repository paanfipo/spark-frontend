import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './SigueLaSecuencia.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';

const MAX_STAGE = 9;
const SHOW_ITEM_MS = 700; // Tiempo que brilla el número
const GAP_MS = 300;      // Tiempo entre brillos
const FEEDBACK_DELAY_MS = 1000;

const USER_TIMEOUT_MS = 5000;

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_LEVEL: 'start_level',
  SHOWING: 'showing_sequence',
  WAITING: 'waiting_input',
  FEEDBACK: 'feedback',
  NEXT_LEVEL: 'next_level',
  GAME_OVER: 'game_over'
};

// Los dígitos disponibles en el círculo
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8]; 

export default function SigueLaSecuencia({ onGameOver }) {
  // --- UI ---
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN); 
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );

  // --- Juego ---
  const [stage, setStage] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [activeDigit, setActiveDigit] = useState(null); // Para el brillo visual
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

  // --- Refs ---
  const sequenceStartTime = useRef(null);
  const timeoutsRef = useRef([]);
  const countdownRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { }
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

  const endGame = useCallback(() => {
    if (gameState === GAME_STATE.GAME_OVER) return;
    setGameState(GAME_STATE.GAME_OVER);
    clearAllTimeouts();
    safePlay(sounds.gameOver);

    const totalSecuencias = stage - 1; // cuántas secuencias intentó
    const porcentajeSecuenciasCorrectas =
      totalSecuencias > 0
        ? (totalAciertos / totalSecuencias) * 100
        : 0;

    const tiempoRespuestaPromedioMs =
      tiemposRespuesta.length > 0
        ? tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length
        : 0;


    onGameOver?.({
      amplitud_digitos_max: maxSpan,
      porcentaje_secuencias_correctas: parseFloat(
        porcentajeSecuenciasCorrectas.toFixed(2)
      ),
      tiempo_respuesta_promedio_ms: Math.round(tiempoRespuestaPromedioMs),
      errores_orden: erroresComision, // en este juego el error es de orden
      errores_omision: erroresOmision,
    });

  }, [gameState, clearAllTimeouts, safePlay, tiemposRespuesta, maxSpan, totalAciertos, erroresComision, erroresOmision, stage, onGameOver]);

  const handleFeedbackContinuation = useCallback((wasCorrect) => {
  setFeedback('');
  
  if (wasCorrect) {
    if (stage >= MAX_STAGE) {
      endGame();
    } else {
      setStage(s => s + 1);
      setIsRetry(false);
      setGameState(GAME_STATE.NEXT_LEVEL); // ✅ Uso de constante
    }
  } else {
    if (lives <= 0) {
      endGame();
    } else {
      setIsRetry(true);
      // Generamos una nueva secuencia pero mantenemos el mismo nivel (stage)
      setGameState(GAME_STATE.NEXT_LEVEL); 
    }
  }
}, [stage, isRetry, endGame]);

  const evaluarSecuencia = useCallback((selection, isCorrect) => {
    setGameState(GAME_STATE.FEEDBACK);
    clearAllTimeouts();

    if (isCorrect) {
      const rt = Date.now() - sequenceStartTime.current;
      setTiemposRespuesta(t => [...t, rt]);
      setTotalAciertos(a => a + 1);
      setMaxSpan(s => Math.max(s, selection.length));
      setFeedback('correct');
      setNotification('¡Perfecto!');
      safePlay(sounds.correct);
    } else {
      setErroresComision(e => e + 1);
      setFeedback('incorrect');

      // ✅ Restamos una vida
      const newLives = lives - 1;
      setLives(newLives);


      // ✅ Notificación dinámica basada en vidas
      setNotification(newLives <= 0 
        ? 'Juego terminado.' 
        : `Incorrecto. Te quedan ${newLives} ${newLives === 1 ? 'vida' : 'vidas'}.`
      );

      safePlay(sounds.incorrect);
    }

    setPausableTimeout(() => handleFeedbackContinuation(isCorrect), FEEDBACK_DELAY_MS);
  }, [clearAllTimeouts, setPausableTimeout, handleFeedbackContinuation, isRetry, safePlay]);

  const showSequence = useCallback((seq) => {
    setGameState(GAME_STATE.SHOWING);
    setUserInput([]);
    setFeedback('');
    setNotification('Observa el orden...');
    setActiveDigit(null);

    seq.forEach((digit, idx) => {
      const onTime = (SHOW_ITEM_MS + GAP_MS) * idx;
      setPausableTimeout(() => {
        setActiveDigit(digit);
        safePlay(sounds.click, 0.4);
      }, onTime);

      setPausableTimeout(() => {
        setActiveDigit(null);
      }, onTime + SHOW_ITEM_MS);
    });

    const totalShowTime = (SHOW_ITEM_MS + GAP_MS) * seq.length;
    setPausableTimeout(() => {
      setGameState(GAME_STATE.WAITING);
      setNotification('¡Tu turno!');
      sequenceStartTime.current = Date.now();
    }, totalShowTime);
  }, [setPausableTimeout, safePlay]);

  const generateLevel = useCallback((currentStage) => {
    // La secuencia crece: Nivel 1 (3 números) -> Nivel 9 (11 números)
    const sequenceLength = currentStage + 2;
    const newSequence = Array.from({ length: sequenceLength }, () => 
      DIGITS[Math.floor(Math.random() * DIGITS.length)]
    );

    setSequence(newSequence);
    showSequence(newSequence);
  }, [showSequence]);

const handleDigitClick = (digit) => {
  if (paused || gameState !== GAME_STATE.WAITING || feedback) return;

  const currentStep = userInput.length;
  const isCorrectStep = digit === sequence[currentStep];

  if (isCorrectStep) {
    safePlay(sounds.click, 0.6);
    const newPath = [...userInput, digit];
    setUserInput(newPath);

    if (newPath.length === sequence.length) {
      evaluarSecuencia(newPath, true);
    }
  } else {
    // CLAVE: Guardamos el número incorrecto en el estado inmediatamente
    const finalPath = [...userInput, digit];
    setUserInput(finalPath); 
    
    // Llamamos a la evaluación con el error
    evaluarSecuencia(finalPath, false);
  }
};

  const resumeGame = useCallback(() => {
    setPaused(false);
    safePlay(sounds.pauseOut, 0.5);
    if (gameState === GAME_STATE.SHOWING) showSequence(sequence);
    if (gameState === GAME_STATE.FEEDBACK) handleFeedbackContinuation(feedback === 'correct');
  }, [gameState, sequence, feedback, showSequence, handleFeedbackContinuation, safePlay]);

  const resetGame = useCallback(() => {
    clearAllTimeouts();
    setStage(1);
    setIsRetry(false);
    setLives(3);
    setTotalAciertos(0);
    setErroresComision(0);
    setErroresOmision(0);
    setTiemposRespuesta([]);
    setGameState(GAME_STATE.START_LEVEL);
  }, [clearAllTimeouts]);

  // --- Effects ---
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
        resetGame();
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [gameState, resetGame, safePlay]);

  useEffect(() => {
      if (!paused && (gameState === GAME_STATE.START_LEVEL || gameState === GAME_STATE.NEXT_LEVEL)) {
        generateLevel(stage);
      }
    }, [gameState, stage, paused, generateLevel]);

    const digitButtons = React.useMemo(() => {
    return DIGITS.map((num, idx) => {
      const angle = (idx * 360) / DIGITS.length;
      return {
        num,
        style: {
          transform: `rotate(${angle}deg) translate(140px) rotate(-${angle}deg)`
        }
      };
    });
  }, []);

  useEffect(() => {
    // Solo se activa si estamos esperando que el usuario presione un número
    if (gameState === GAME_STATE.WAITING && !paused && !feedback) {
      
      const timer = setTimeout(() => {
        // Si el tiempo se agota:
        setErroresOmision(e => e + 1); // <--- Aquí es donde por fin sumas la métrica
        setNotification('¡Tiempo agotado!');
        evaluarSecuencia(userInput, false); // Falla el nivel por inactividad
      }, USER_TIMEOUT_MS);

      // Limpieza: Si el usuario presiona un botón antes de los 8 seg, 
      // el timer se destruye y vuelve a empezar para el siguiente número.
      return () => clearTimeout(timer);
    }
  }, [gameState, userInput.length, paused, feedback, evaluarSecuencia]);


  if (gameState === GAME_STATE.GAME_OVER) return null;

return (
  <div className={styles.gameContainer}>

    <button 
      className={styles.pauseButton} 
      onClick={() => { setPaused(true); clearAllTimeouts(); }}
      disabled={gameState === GAME_STATE.COUNTDOWN}
    >
      <span className={styles.pauseIcon}>II</span> Pausa
    </button>

     {gameState !== GAME_STATE.COUNTDOWN && (
      <div className={styles.hud}>
        <div className={styles.statItem}><strong>Nivel:</strong> {stage}/9</div>
        <div className={styles.statItem}><strong>Secuencia:</strong> {sequence.length}</div>
        <div className={styles.statItem}>
          <strong>Vidas:</strong> 
          <span className={styles.livesHeart}>
            {'❤️'.repeat(Math.max(0, lives))}
            {'🤍'.repeat(Math.max(0, 3 - lives))}
          </span>
        </div>
      </div>
    )}

    <div className={styles.gameArea}>
      {gameState === GAME_STATE.COUNTDOWN ? (
        <div className={styles.countdown}>{countdown}</div>
      ) : (
        <div className={styles.circleContainer}>
          {digitButtons.map(({ num, style }) => {
            const isLastClicked = userInput[userInput.length - 1] === num;
            
            return (
              <button
                key={num}
                className={`
                  ${styles.digitButton} 
                  ${activeDigit === num ? styles.active : ''}
                  ${feedback === 'correct' && userInput.includes(num) ? styles.correct : ''}
                  ${feedback === 'incorrect' && isLastClicked ? styles.incorrect : ''}
                `}
                style={style} // ✅ Usamos el estilo ya calculado
                onClick={() => handleDigitClick(num)}
                disabled={gameState !== GAME_STATE.WAITING || feedback !== ''}
              >
                <span>{num}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>

    {/* Mensaje inferior */}
    {gameState !== GAME_STATE.COUNTDOWN && (
      <div className={styles.instructions}>{notification || "¡Tu turno!"}</div>
    )}

    <PauseMenu
      visible={paused}
      onResume={resumeGame}
      onRestart={() => { setPaused(false); setGameState(GAME_STATE.COUNTDOWN); }}
      onToggleSound={() => setSoundEnabled(!soundEnabled)}
      isSoundEnabled={soundEnabled}
    />
  </div>
);
}