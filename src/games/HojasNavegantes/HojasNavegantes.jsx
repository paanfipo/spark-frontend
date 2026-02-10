import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './HojasNavegantes.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { hojasNavegantesConfig, gameSettings, levelsData } from './HojasNavegantes.config';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

export default function HojasNavegantes({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(gameSettings.startingLives);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const [stimulus, setStimulus] = useState(null);
  const [stats, setStats] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [leafPos, setLeafPos] = useState({ x: 50, y: 50 }); // %

  const countdownRef = useRef(null);
  const movementIntervalRef = useRef(null);

  // Para pausar/reanudar movimiento sin perder la dirección/velocidad del ensayo actual
  const activeMoveDirRef = useRef(null);
  const activeSpeedRef = useRef(0);

  const safePlay = useCallback((snd, vol = 1) => {
    try { playSound(snd, vol); } catch (e) {}
  }, []);

  const getLevelConfig = useCallback((lvl) => {
    const idx = Math.max(0, Math.min(levelsData.length - 1, (lvl || 1) - 1));
    return levelsData[idx];
  }, []);

  const clearMovement = useCallback(() => {
    if (movementIntervalRef.current) {
      clearInterval(movementIntervalRef.current);
      movementIntervalRef.current = null;
    }
  }, []);

  const startMovement = useCallback((moveDir, speed) => {
    clearMovement();
    activeMoveDirRef.current = moveDir;
    activeSpeedRef.current = speed;

    movementIntervalRef.current = setInterval(() => {
      setLeafPos(prev => ({
        x: prev.x + (moveDir === 'right' ? speed : -speed),
        y: prev.y
      }));
    }, 50);
  }, [clearMovement]);

  // --- GENERACIÓN DE ENSAYO ---
  const generateTrial = useCallback((forcedLevel = null) => {
    const lvl = forcedLevel || level;
    const config = getLevelConfig(lvl);

    const lastTrial = stats.length > 0 ? stats[stats.length - 1] : null;

    // 1) Determinar si hay cambio de regla (cambio de color)
    const isSwitch = stats.length > 0 && Math.random() < config.switchProb;

    // 2) Determinar color actual: si hay cambio, alterna; si no, mantiene o inicia aleatorio
    const currentColor = isSwitch
      ? (lastTrial.color === 'NARANJA' ? 'VERDE' : 'NARANJA')
      : (lastTrial?.color || (Math.random() > 0.5 ? 'NARANJA' : 'VERDE'));

    // 3) Direcciones: movimiento y punta (pueden ser congruentes o en conflicto)
    const moveDir = Math.random() > 0.5 ? 'right' : 'left';
    const pointDir = Math.random() > 0.5 ? 'right' : 'left';

    // 4) Respuesta correcta según regla
    const correctAnswer = currentColor === 'NARANJA' ? moveDir : pointDir;

    // 5) Posición inicial (si se mueve a la derecha, inicia fuera por izquierda, y viceversa)
    setLeafPos({ x: moveDir === 'right' ? -10 : 110, y: 35 + Math.random() * 30 });

    setStimulus({
      color: currentColor,
      moveDir,
      pointDir,
      answer: correctAnswer,
      isSwitch,
      level: lvl,
      speed: config.speed
    });

    setGameState(GAME_STATE.PLAYING);
    setStartTime(Date.now());

    if (!paused) startMovement(moveDir, config.speed);
  }, [level, stats, paused, getLevelConfig, startMovement]);

  // --- MANEJO DE RESPUESTA ---
  const handleResponse = useCallback((userDir) => {
    if (gameState !== GAME_STATE.PLAYING || paused || !stimulus || !startTime) return;

    clearMovement();

    const rt = Date.now() - startTime;
    const isCorrect = userDir === stimulus.answer;

    // Error perseverativo: en ensayo de cambio, el usuario aplica la regla del color anterior.
    // Operacionalización: respuesta incorrecta bajo la regla actual, pero correcta si se aplicara la regla previa.
    const lastColor = stats.length > 0 ? stats[stats.length - 1].color : stimulus.color;
    const wouldBeCorrectPrevRule = (lastColor === 'NARANJA')
      ? (userDir === stimulus.moveDir)
      : (userDir === stimulus.pointDir);

    const isPerseverative = Boolean(stimulus.isSwitch && !isCorrect && wouldBeCorrectPrevRule);

    const trialData = {
      color: stimulus.color,
      isSwitch: stimulus.isSwitch,
      rt,
      isCorrect,
      isPerseverative
    };

    setStats(prev => [...prev, trialData]);

    const nextLives = isCorrect ? lives : (lives - 1);

    if (isCorrect) {
      safePlay(sounds.click, 0.4);
      setScore(s => s + (10 * stimulus.level));
    } else {
      safePlay(sounds.incorrect, 0.5);
      setLives(nextLives);
    }

    setGameState(GAME_STATE.FEEDBACK);

    setTimeout(() => {
      // Game over por vidas
      if (nextLives <= 0) {
        endGame();
        return;
      }

      const config = getLevelConfig(stimulus.level);
      const trialsCompleted = stats.length + 1; // incluye el ensayo recién registrado
      const levelCompleted = trialsCompleted >= config.trials;

      if (!levelCompleted) {
        generateTrial(stimulus.level);
        return;
      }

      // Siguiente nivel o fin del juego
      if (stimulus.level < levelsData.length) {
        setLevel(stimulus.level + 1);
        setGameState(GAME_STATE.COUNTDOWN);
        setCountdown(3);
        return;
      }

      endGame();
    }, 600);
  }, [gameState, paused, stimulus, startTime, stats.length, lives, safePlay, clearMovement, generateTrial, getLevelConfig]);

  // --- MÉTRICAS FINALES ---
  const calculateFinalMetrics = useCallback(() => {
    const switchTrials = stats.filter(s => s.isSwitch);
    const stayTrials = stats.filter(s => !s.isSwitch);

    const avg = (arr) => {
      const valid = arr.filter(x => typeof x === 'number' && Number.isFinite(x));
      if (valid.length === 0) return null;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    const avgRTSwitchCorrect = avg(switchTrials.filter(s => s.isCorrect).map(s => s.rt));
    const avgRTStayCorrect = avg(stayTrials.filter(s => s.isCorrect).map(s => s.rt));

    const costoCambio = (avgRTSwitchCorrect != null && avgRTStayCorrect != null)
      ? Math.max(0, avgRTSwitchCorrect - avgRTStayCorrect)
      : 0;

    return {
      costo_cambio_ms: Math.round(costoCambio),
      precision_cambio: Math.round((switchTrials.filter(s => s.isCorrect).length / (switchTrials.length || 1)) * 100),
      tasa_perseverativos: Math.round((stats.filter(s => s.isPerseverative).length / (stats.length || 1)) * 100),
      tiempo_sin_cambio: Math.round(avgRTStayCorrect ?? 0),
      score: score
    };
  }, [stats, score]);

  const endGame = useCallback(() => {
    clearMovement();
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(calculateFinalMetrics());
  }, [clearMovement, safePlay, onGameOver, calculateFinalMetrics]);

  // --- EFECTOS: COUNTDOWN ---
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;

    safePlay(sounds.start);

    let t = 3;
    setCountdown(t);

    countdownRef.current = setInterval(() => {
      t -= 1;
      setCountdown(t > 0 ? t : null);

      if (t === 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        generateTrial(level);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameState, generateTrial, level, safePlay]);

  // --- EFECTOS: PAUSA ---
  useEffect(() => {
    if (!paused) {
      // reanudar movimiento si está en PLAYING
      if (gameState === GAME_STATE.PLAYING && stimulus) {
        startMovement(activeMoveDirRef.current || stimulus.moveDir, activeSpeedRef.current || stimulus.speed || 0);
      }
      return;
    }

    // pausar
    clearMovement();
  }, [paused, gameState, stimulus, clearMovement, startMovement]);

  // Cleanup global
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      clearMovement();
    };
  }, [clearMovement]);

  const ruleLabel = useMemo(() => {
    if (!stimulus) return '';
    return stimulus.color === 'NARANJA' ? 'MOVIMIENTO' : 'PUNTA';
  }, [stimulus]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button
  className={styles.pauseButton}
  onClick={() => setPaused(true)}
  disabled={gameState === GAME_STATE.COUNTDOWN}
>
  ⏸ Pausa
</button>


      {gameState === GAME_STATE.COUNTDOWN && (
        <div className={styles.countdownWrapper}>
          <div className={styles.countdown}>{countdown}</div>
        </div>
      )}

      {gameState !== GAME_STATE.COUNTDOWN && stimulus && (
        <>
          <header className={styles.hud}>
            <div className={styles.hudItem}><span className={styles.hudLabel}>Puntos</span><span className={styles.hudValue}>{score}</span></div>
            <div className={styles.hudItem}><span className={styles.hudLabel}>Nivel</span><span className={styles.hudValue}>{level}</span></div>
            <div className={styles.hudItem}><span className={styles.hudLabel}>Vidas</span><span className={styles.hudValue}>{'❤️'.repeat(lives)}{'🤍'.repeat(gameSettings.startingLives - lives)}</span></div>
          </header>

          <main className={styles.gameBody}>
            <div className={`${styles.ruleIndicator} ${stimulus.color === 'NARANJA' ? styles.bgNaranja : styles.bgVerde}`}>
              Regla: {ruleLabel}
            </div>

            <div
              className={styles.leaf}
              style={{
                left: `${leafPos.x}%`,
                top: `${leafPos.y}%`,
                color: gameSettings.colors[stimulus.color],
                transform: `rotate(${stimulus.pointDir === 'right' ? '0deg' : '180deg'})`
              }}
              aria-label="Estímulo"
            >
              🍃
            </div>

            <div className={styles.buttonGroup}>
  <button
    className={styles.btnNav}
    onClick={() => handleResponse('left')}
    disabled={paused}
    aria-label="Izquierda"
  >
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  </button>

  <button
    className={styles.btnNav}
    onClick={() => handleResponse('right')}
    disabled={paused}
    aria-label="Derecha"
  >
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>
</div>

          </main>

          <footer className={styles.footer}>
            <div className={styles.instructions}>
              {stimulus.color === 'NARANJA'
                ? '¿Hacia dónde se desplaza la hoja?'
                : '¿Hacia dónde apunta el dibujo de la hoja?'}
            </div>
          </footer>
        </>
      )}

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => window.location.reload()}
      />
    </div>
  );
}
