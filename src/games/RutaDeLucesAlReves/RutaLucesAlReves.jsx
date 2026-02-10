import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './RutaLucesAlReves.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { rutaDeLucesAlRevesConfig } from './RutaLucesAlReves.config';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  MEMORIZE: 'memorize',
  WAITING: 'waiting',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

const FEEDBACK_DELAY = 1500;
const USER_TIMEOUT_MS = 8000;

export default function RutaLuces({ onGameOver }) {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [levelStats, setLevelStats] = useState([]);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const evaluatingRef = useRef(false);
  const timeoutsRef = useRef([]);

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const config = rutaDeLucesAlRevesConfig.levels[level];

  const [clickedCircle, setClickedCircle] = useState({ idx: null, status: null });

  // Posiciones para los círculos
 /* const [positions] = useState(() => 
    Array.from({ length: 12 }, (_, i) => ({
      top: `${20 + Math.floor(i / 4) * 25}%`,
      left: `${15 + (i % 4) * 20}%`
    }))
  );*/

  // Dentro de tu componente RutaLuces
const [positions] = useState([
  // Fila 1 (Más abajo para no tocar el texto)
  { top: '25%', left: '15%' },
  { top: '30%', left: '40%' },
  { top: '25%', left: '65%' },
  { top: '32%', left: '85%' },
  
  // Fila 2 (Camino de regreso/sinuoso)
  { top: '60%', left: '10%' },
  { top: '55%', left: '35%' },
  { top: '65%', left: '60%' },
  { top: '58%', left: '82%' },
  
  // Fila 3 (Para niveles avanzados)
  { top: '85%', left: '20%' },
  { top: '80%', left: '50%' },
  { top: '88%', left: '75%' },
  { top: '75%', left: '90%' }
]);

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) {}
  }, [soundEnabled]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const setPausableTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  // ✅ Métricas igual que en Matriz
  const calculateFinalMetrics = useCallback(() => {
    if (levelStats.length === 0) return { amplitud_inversa_max: 0, score: 0 };
    
    const totalAciertos = levelStats.filter(s => s.correct).length;
    const maxInverseSpan = Math.max(0, ...levelStats.filter(s => s.correct).map(s => s.length));
    const totalResponseTime = levelStats.reduce((sum, s) => sum + s.responseTimeMs, 0);
    const totalErroresOrden = levelStats.filter(s => !s.correct && !s.omission).length;
    const totalErroresOmision = levelStats.filter(s => s.omission).length;

    return {
      amplitud_inversa_max: maxInverseSpan,
      porcentaje_secuencias_correctas: (totalAciertos / levelStats.length) * 100,
      errores_orden: totalErroresOrden,
      errores_omision: totalErroresOmision,
      tiempo_total_respuesta_ms: totalResponseTime,
      score: score
    };
  }, [levelStats, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = calculateFinalMetrics();
    onGameOver?.(rawMetrics);
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // ✅ Conteo regresivo igual que en Matriz
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);
    let timeLeft = 3;
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft > 0 ? timeLeft : null);
      if (timeLeft === 0) {
        clearInterval(countdownRef.current);
        setGameState(GAME_STATE.MEMORIZE);
        startSequence();
      }
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [gameState]);

  const startSequence = useCallback(() => {
    setUserInput([]);
    evaluatingRef.current = false;
    const newSeq = Array.from({ length: config.seqLen }, () => Math.floor(Math.random() * config.circles));
    setSequence(newSeq);

    newSeq.forEach((idx, i) => {
      setPausableTimeout(() => {
        setActiveCircle(idx);
        safePlay(sounds.click, 0.4);
        setTimeout(() => setActiveCircle(null), config.speed);
      }, i * (config.speed + 300));
    });

    setPausableTimeout(() => {
      setGameState(GAME_STATE.WAITING);
      setLevelStartTime(Date.now());
    }, newSeq.length * (config.speed + 300));
  }, [config, safePlay]);

    const handleCircleClick = (idx) => {
    if (paused || gameState !== GAME_STATE.WAITING || evaluatingRef.current) return;

    const currentStep = userInput.length;
    const targetIdx = sequence[sequence.length - 1 - currentStep];

    if (idx === targetIdx) {
        // ✅ FEEDBACK VERDE
        setClickedCircle({ idx, status: 'correct' });
        setTimeout(() => setClickedCircle({ idx: null, status: null }), 300);
        
        safePlay(sounds.click, 0.6);
        const nextInput = [...userInput, idx];
        setUserInput(nextInput);

        if (nextInput.length === sequence.length) {
        evaluatingRef.current = true;
        const responseTimeMs = Date.now() - levelStartTime;
        
        // Guardamos estadísticas del acierto
        setLevelStats(prev => [...prev, { length: sequence.length, correct: true, responseTimeMs }]);
        setScore(s => s + (10 * level));
        setGameState(GAME_STATE.FEEDBACK);
        safePlay(sounds.correct);

        setPausableTimeout(() => {
            if (level < 3) setLevel(l => l + 1);
            setGameState(GAME_STATE.MEMORIZE);
            startSequence();
        }, FEEDBACK_DELAY);
        }
    } else {
        // ❌ FEEDBACK ROJO
        setClickedCircle({ idx, status: 'incorrect' });
        setTimeout(() => setClickedCircle({ idx: null, status: null }), 500);
        
        evaluatingRef.current = true;
        const responseTimeMs = Date.now() - levelStartTime;

        // Guardamos estadísticas del error
        setLevelStats(prev => [...prev, { correct: false, omission: false, responseTimeMs }]);
        setLives(l => l - 1);
        safePlay(sounds.incorrect);

        if (lives <= 1) {
        setPausableTimeout(endGame, FEEDBACK_DELAY);
        } else {
        setPausableTimeout(startSequence, FEEDBACK_DELAY);
        }
    }
    };

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => { setPaused(true); clearAllTimeouts(); }}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      {gameState !== GAME_STATE.COUNTDOWN && (
        <>
          <header className={styles.hud}>
            <div>Puntuación: {score}</div>
            <div>Nivel: {level}</div>
            <div>Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}</div>
          </header>

          <div className={styles.gameArea} style={paused ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            {positions.slice(0, config.circles).map((pos, i) => (
                <div
                    key={i}
                    className={`
                    ${styles.circle} 
                    ${activeCircle === i ? styles.active : ''} 
                    ${clickedCircle.idx === i && clickedCircle.status === 'correct' ? styles.circleCorrect : ''}
                    ${clickedCircle.idx === i && clickedCircle.status === 'incorrect' ? styles.circleIncorrect : ''}
                    `}
                    style={{ top: pos.top, left: pos.left }}
                    onClick={() => handleCircleClick(i)}
                />
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.instructions}>
                {/* ✅ Mensajes dinámicos según el estado del juego */}
                {gameState === GAME_STATE.MEMORIZE && 'Observa el patrón de luces...'}
                {gameState === GAME_STATE.WAITING && '¡Ahora repite en orden INVERSO!'}
                {gameState === GAME_STATE.FEEDBACK && (
                evaluatingRef.current && userInput.length !== sequence.length 
                ? '❌ Error de Orden' 
                : '✔️ ¡Excelente!'
                )}
            </div>
            </div>
        </>
      )}

      <PauseMenu 
        visible={paused} 
        onResume={() => { setPaused(false); startSequence(); }} 
        onRestart={() => window.location.reload()}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isSoundEnabled={soundEnabled}
      />
    </div>
  );
}