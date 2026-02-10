import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './RutaLuces.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { rutaLucesConfig } from './RutaLuces.config'; // 👈 Asegúrate que el nombre coincida

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  MEMORIZE: 'memorize',
  WAITING: 'waiting',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

const FEEDBACK_DELAY = 1500;

export default function RutaLuces({ onGameOver }) {
  // 1. Estados
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [countdown, setCountdown] = useState(3);
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [clickedCircle, setClickedCircle] = useState({ idx: null, status: null });
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [levelStats, setLevelStats] = useState([]);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  // 2. Refs y Config
  const evaluatingRef = useRef(false);
  const timeoutsRef = useRef([]);
  const countdownRef = useRef(null);
  const config = rutaLucesConfig.levels[level];

  const [positions] = useState([
    { top: '25%', left: '15%' }, { top: '30%', left: '40%' }, { top: '25%', left: '65%' }, { top: '32%', left: '85%' },
    { top: '60%', left: '10%' }, { top: '55%', left: '35%' }, { top: '65%', left: '60%' }, { top: '58%', left: '82%' },
    { top: '85%', left: '20%' }, { top: '80%', left: '50%' }, { top: '88%', left: '75%' }, { top: '75%', left: '90%' }
  ]);

  // 3. Funciones de Utilidad
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

  // 4. Lógica de Métricas
  const calculateFinalMetrics = useCallback(() => {
    const totalAciertos = levelStats.filter(s => s.correct).length;
    const maxSpan = Math.max(0, ...levelStats.filter(s => s.correct).map(s => s.length));
    
    return {
      amplitud_maxima: maxSpan,
      porcentaje_correctas: (totalAciertos / Math.max(1, levelStats.length)) * 100,
      tiempo_total_ms: levelStats.reduce((a, b) => a + b.responseTimeMs, 0),
      errores_orden: levelStats.filter(s => !s.correct).length,
      score: score
    };
  }, [levelStats, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(calculateFinalMetrics());
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // 5. Ciclo de Vida y Flujo
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          setGameState(GAME_STATE.MEMORIZE);
          startSequence();
          return 0;
        }
        return c - 1;
      });
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

  // 6. Manejo de Clics (ORDEN DIRECTO)
  const handleCircleClick = (idx) => {
    if (paused || gameState !== GAME_STATE.WAITING || evaluatingRef.current) return;

    const currentStep = userInput.length;
    const targetIdx = sequence[currentStep]; // ✅ Directo

    if (idx === targetIdx) {
      setClickedCircle({ idx, status: 'correct' });
      setTimeout(() => setClickedCircle({ idx: null, status: null }), 300);
      safePlay(sounds.click, 0.6);
      
      const nextInput = [...userInput, idx];
      setUserInput(nextInput);

      if (nextInput.length === sequence.length) {
        evaluatingRef.current = true;
        setLevelStats(prev => [...prev, { length: sequence.length, correct: true, responseTimeMs: Date.now() - levelStartTime }]);
        setScore(s => s + (10 * level));
        setGameState(GAME_STATE.FEEDBACK);
        safePlay(sounds.correct);
        setPausableTimeout(() => {
          if (level < 5) { 
            setLevel(l => l + 1);
            setGameState(GAME_STATE.MEMORIZE);
            startSequence();
          } else {
              // Si llega al final, termina el juego
              endGame(); 
          }
        }, FEEDBACK_DELAY);
      }
    } else {
      setClickedCircle({ idx, status: 'incorrect' });
      setTimeout(() => setClickedCircle({ idx: null, status: null }), 500);
      evaluatingRef.current = true;
      setLevelStats(prev => [...prev, { length: sequence.length, correct: false, responseTimeMs: Date.now() - levelStartTime }]);
      setLives(l => l - 1);
      safePlay(sounds.incorrect);
      if (lives <= 1) setPausableTimeout(endGame, FEEDBACK_DELAY); 
      else setPausableTimeout(startSequence, FEEDBACK_DELAY);
    }
  };

  // 7. Render Final
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
                className={`${styles.circle} ${activeCircle === i ? styles.active : ''} 
                  ${clickedCircle.idx === i && clickedCircle.status === 'correct' ? styles.circleCorrect : ''}
                  ${clickedCircle.idx === i && clickedCircle.status === 'incorrect' ? styles.circleIncorrect : ''}`}
                style={{ top: pos.top, left: pos.left }}
                onClick={() => handleCircleClick(i)}
              />
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.instructions}>
              {gameState === GAME_STATE.MEMORIZE && 'Observa el camino...'}
              {gameState === GAME_STATE.WAITING && '¡Repite el mismo orden!'}
              {gameState === GAME_STATE.FEEDBACK && (lives <= 0 ? '❌ Fin del juego' : '✔️ ¡Bien!')}
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