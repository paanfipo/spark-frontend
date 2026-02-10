import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ComparacionDeColores.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { comparacionDeColoresConfig, gameSettings, levelsData } from './ComparacionDeColores.config';

const FEEDBACK_DELAY = 1000;

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  START_TRIAL: 'start_trial',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over'
};

export default function ComparacionColores({ onGameOver }) {
  // --- ESTADOS BASE (Similares a Matriz) ---
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  const timerRef = useRef(null);

  // --- ESTADOS ESPECÍFICOS DEL JUEGO ---
  const [stimulus, setStimulus] = useState(null);
  const [levelStats, setLevelStats] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('soundEnabled') !== 'false'
  );

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { }
  }, [soundEnabled]);

  // --- MÉTRICAS ---
  const calculateFinalMetrics = useCallback(() => {
    if (levelStats.length === 0) return { score: 0, precision_incongruente: 0, tiempo_reaccion_ms: 0, errores_comision: 0, errores_omision: 0 };

    const incongruentTrials = levelStats.filter(s => s.isIncongruent);
    const correctIncongruent = incongruentTrials.filter(s => s.isCorrect).length;
    const precisionInc = incongruentTrials.length > 0 ? (correctIncongruent / incongruentTrials.length) * 100 : 0;

    const correctTrials = levelStats.filter(s => s.isCorrect);
    const avgRT = correctTrials.length > 0 
      ? correctTrials.reduce((sum, s) => sum + s.rt, 0) / correctTrials.length 
      : 0;

    return {
      precision_incongruente: parseFloat(precisionInc.toFixed(2)),
      tiempo_reaccion_ms: Math.round(avgRT),
      errores_comision: levelStats.filter(s => s.isComision).length,
      errores_omision: levelStats.filter(s => s.isOmision).length,
      score: score
    };
  }, [levelStats, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    const metrics = calculateFinalMetrics();
    onGameOver?.(metrics);
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- LÓGICA DE TURNOS ---
  const generateTrial = useCallback(() => {
    const config = levelsData[level - 1] || levelsData[levelsData.length - 1];
    
    // 1. Definir significado de la palabra
    const meaningColor = gameSettings.colors[Math.floor(Math.random() * gameSettings.colors.length)];
    
    // 2. Definir incongruencia (tinta)
    const isIncongruent = Math.random() < config.incongruenceProb;
    let inkHex;
    if (isIncongruent) {
      const others = gameSettings.colors.filter(c => c.hex !== meaningColor.hex);
      inkHex = others[Math.floor(Math.random() * others.length)].hex;
    } else {
      inkHex = meaningColor.hex;
    }

    // 3. Definir parche (¿coincide con el significado?)
    const isMatch = Math.random() < 0.5;
    let patchHex;
    if (isMatch) {
      patchHex = meaningColor.hex;
    } else {
      const others = gameSettings.colors.filter(c => c.hex !== meaningColor.hex);
      patchHex = others[Math.floor(Math.random() * others.length)].hex;
    }

    setStimulus({ word: meaningColor.name, ink: inkHex, patch: patchHex, isMatch, isIncongruent });
    setGameState(GAME_STATE.PLAYING);
    setStartTime(Date.now());

    // Temporizador de Omisión
    timerRef.current = setTimeout(() => handleResponse(null), gameSettings.maxResponseTime);
  }, [level]);

  const handleResponse = (userAnswer) => {
    if (gameState !== GAME_STATE.PLAYING || paused) return;
    clearTimeout(timerRef.current);

    const rt = Date.now() - startTime;
    const isOmision = userAnswer === null;
    const isCorrect = !isOmision && userAnswer === stimulus.isMatch;
    const isComision = !isOmision && !isCorrect;

    setLevelStats(prev => [...prev, {
      isCorrect,
      isIncongruent: stimulus.isIncongruent,
      rt: isOmision ? gameSettings.maxResponseTime : rt,
      isOmision,
      isComision
    }]);

    setGameState(GAME_STATE.FEEDBACK);

    if (isCorrect) {
      safePlay(sounds.click, 0.4);
      setScore(s => s + (10 * level));
    } else {
      safePlay(sounds.incorrect, 0.5);
      setLives(l => l - 1);
    }

    setTimeout(() => {
      if (lives <= 1 && !isCorrect) {
        endGame();
      } else {
        const config = levelsData[level - 1] || levelsData[levelsData.length - 1];
        if (levelStats.length + 1 >= config.trials && level < levelsData.length) {
          setLevel(l => l + 1);
        }
        generateTrial();
      }
    }, FEEDBACK_DELAY);
  };

  // --- CICLO DE VIDA (Countdown y Pausa) ---
  useEffect(() => {
    if (gameState !== GAME_STATE.COUNTDOWN) return;
    setCountdown(3);
    safePlay(sounds.start);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          generateTrial();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [gameState, generateTrial, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        激 Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      {gameState !== GAME_STATE.COUNTDOWN && stimulus && (
        <>
          <header className={styles.hud}>
            <div>Puntaje: {score}</div>
            <div>Nivel: {level}</div>
            <div>Vidas: {'❤️'.repeat(lives)}{'🤍'.repeat(3 - lives)}</div>
          </header>

          <main className={styles.gameBody}>
            <div className={styles.stimulusArea}>
              <div className={styles.wordDisplay} style={{ color: stimulus.ink }}>
                {stimulus.word}
              </div>
              <div className={styles.colorPatch} style={{ backgroundColor: stimulus.patch }} />
            </div>

            <div className={styles.buttonGroup}>
              <button 
                className={`${styles.btnResponse} ${styles.btnYes}`} 
                onClick={() => handleResponse(true)}
                disabled={gameState === GAME_STATE.FEEDBACK}
              >SÍ</button>
              <button 
                className={`${styles.btnResponse} ${styles.btnNo}`} 
                onClick={() => handleResponse(false)}
                disabled={gameState === GAME_STATE.FEEDBACK}
              >NO</button>
            </div>
          </main>

          <footer className={styles.footer}>
            <div className={styles.instructions}>
              {gameState === GAME_STATE.FEEDBACK 
                ? (levelStats[levelStats.length-1].isCorrect ? '¡Correcto!' : 'Incorrecto')
                : '¿El significado de la palabra coincide con el color del parche?'}
            </div>
          </footer>
        </>
      )}

      <PauseMenu 
        visible={paused} 
        onResume={() => setPaused(false)} 
        onRestart={() => window.location.reload()}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isSoundEnabled={soundEnabled}
      />
    </div>
  );
}