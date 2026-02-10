import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './EnfoqueCambiante.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { gameSettings, levelsData } from './EnfoqueCambiante.config';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over',
};

export default function EnfoqueCambiante({ onGameOver }) {
  // --- ESTADOS DE FLUJO ---
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(gameSettings.startingLives);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);

  const [trialInLevel, setTrialInLevel] = useState(0);

  // --- LÓGICA DEL JUEGO ---
  const [activeRule, setActiveRule] = useState('number'); // 'number' o 'letter'
  const [stimulus, setStimulus] = useState({ letter: '', number: null });
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [trialStats, setTrialStats] = useState([]); // Historial de cada respuesta
  const [feedback, setFeedback] = useState(null); // { isCorrect: boolean }

  const safePlay = useCallback((snd, vol = 1) => {
    try { playSound(snd, vol); } catch (e) {}
  }, []);

  // --- GENERACIÓN DE ESTÍMULO ---
  const generateTrial = useCallback(() => {
  const config = levelsData[level - 1] || levelsData[levelsData.length - 1];

  let newRule = activeRule;
  const totalTrials = trialInLevel;

  if (config.switchEvery) {
    if (totalTrials > 0 && totalTrials % config.switchEvery === 0) {
      newRule = activeRule === 'number' ? 'letter' : 'number';
    }
  } else if (config.randomSwitchProb) {
    if (Math.random() < config.randomSwitchProb) {
      newRule = activeRule === 'number' ? 'letter' : 'number';
    }
  }

  const pool = gameSettings.vowels.concat(gameSettings.consonants);
  const ltr = pool[Math.floor(Math.random() * pool.length)];
  const num = Math.floor(Math.random() * 8) + 2;

  setActiveRule(newRule);
  setStimulus({ letter: ltr, number: num });
  setGameState(GAME_STATE.PLAYING);
  setLevelStartTime(Date.now());
}, [level, activeRule, trialInLevel]);


  // --- MANEJO DE RESPUESTA ---
  const handleResponse = (userDecision) => {
  if (gameState !== GAME_STATE.PLAYING || paused) return;

  if (!levelStartTime) {
    setLevelStartTime(Date.now());
    return;
  }

  // RT con tope (evita tiempos absurdos)
  const rtRaw = Date.now() - levelStartTime;
  const rt = Math.min(rtRaw, gameSettings.maxResponseTime);

  const isVowel = gameSettings.vowels.includes(stimulus.letter);
  const isEven = stimulus.number % 2 === 0;

  // Ensayo “mixto”
  const isMixed = (isVowel && !isEven) || (!isVowel && isEven);

  const prevRule = trialStats.length > 0
    ? trialStats[trialStats.length - 1].rule
    : activeRule;

  const isSwitch = trialStats.length > 0 && activeRule !== prevRule;

  const correctAnswer = activeRule === 'number' ? isEven : isVowel;
  const isCorrect = userDecision === correctAnswer;

  const wouldBeCorrectWithPrev =
    prevRule === 'number'
      ? (userDecision === isEven)
      : (userDecision === isVowel);

  const isPerseverative = isSwitch && isMixed && !isCorrect && wouldBeCorrectWithPrev;

  const currentTrialData = {
    rule: activeRule,
    isSwitch,
    isMixed,
    rt,
    correct: isCorrect,
    perseverative: isPerseverative,
  };

  // ✅ guardar stats
  const nextTrialStats = [...trialStats, currentTrialData];
  setTrialStats(nextTrialStats);

  // ✅ contador SOLO del nivel actual
  const nextTrialInLevel = trialInLevel + 1;
  setTrialInLevel(nextTrialInLevel);

  // ✅ feedback UI
  setFeedback({ isCorrect });
  setGameState(GAME_STATE.FEEDBACK);

  // ✅ score / vidas
  if (isCorrect) {
    safePlay(sounds.click, 0.4);
    setScore(prev => prev + (10 * level));
  } else {
    safePlay(sounds.incorrect, 0.5);
    setLives(prev => prev - 1);
  }

  // ✅ siguiente paso
  setTimeout(() => {
    const config = levelsData[level - 1] || levelsData[levelsData.length - 1];

    // Si perdió la última vida en este intento
    if (!isCorrect && lives <= 1) {
      endGame(nextTrialStats);
      return;
    }

    // ✅ fin de nivel (usa trials DEL NIVEL, no acumulados)
    if (nextTrialInLevel >= config.trials) {
      if (level < levelsData.length) {
        setLevel(prev => prev + 1);

        // ✅ AQUÍ va el reset del contador del nivel
        setTrialInLevel(0);

        // ✅ genera ensayo del siguiente nivel
        setTimeout(() => generateTrial(), 0);
      } else {
        endGame(nextTrialStats);
      }
      return;
    }

    // Continúa en el mismo nivel
    generateTrial();
  }, 600);
};




  // --- MÉTRICAS FINALES ---
  const calculateFinalMetrics = useCallback((stats) => {
  const switchTrials = stats.filter(s => s.isSwitch);
  const stayTrials = stats.filter(s => !s.isSwitch);

  const switchCorrect = switchTrials.filter(s => s.correct);
  const stayCorrect = stayTrials.filter(s => s.correct);

  const avgRTSwitch = switchCorrect.reduce((a, b) => a + b.rt, 0) / (switchCorrect.length || 1);
  const avgRTStay = stayCorrect.reduce((a, b) => a + b.rt, 0) / (stayCorrect.length || 1);

  // ✅ SOLO ensayos informativos para perseveración (switch + mixed)
  const informativeSwitchTrials = stats.filter(s => s.isSwitch && s.isMixed);
  const perseverativeCount = informativeSwitchTrials.filter(s => s.perseverative).length;

  return {
    costo_cambio_ms: Math.round(Math.max(0, avgRTSwitch - avgRTStay)),
    precision_cambio_porcentaje: Math.round((switchCorrect.length / (switchTrials.length || 1)) * 100),
    tasa_errores_perseverativos: Math.round((perseverativeCount / (informativeSwitchTrials.length || 1)) * 100),
    tiempo_medio_sin_cambio_ms: Math.round(avgRTStay),
    score
  };
}, [score]);




  const endGame = (finalStats) => {
  safePlay(sounds.gameOver);
  setGameState(GAME_STATE.GAME_OVER);

  const payload = calculateFinalMetrics(finalStats);
  console.log("Enviando métricas:", payload);

  if (onGameOver) onGameOver(payload);
};



  // --- EFECTOS INICIALES (IGUAL QUE MATRIZ) ---
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      safePlay(sounds.start);
      let timeLeft = 3;
      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft > 0 ? timeLeft : null);
        if (timeLeft === 0) {
          clearInterval(countdownRef.current);
          generateTrial();
        }
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [gameState, generateTrial, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)}>⏸ Pausa</button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      {gameState !== GAME_STATE.COUNTDOWN && (
        <>
          <header className={styles.hud}>
            <div>Puntaje: {score}</div>
            <div>Nivel: {level}</div>
            <div>Vidas: {'❤️'.repeat(lives)}{'🤍'.repeat(3 - lives)}</div>
          </header>

          <div className={styles.gameBody}>
            <div className={`${styles.ruleBanner} ${activeRule === 'number' ? styles.ruleNumber : styles.ruleLetter}`}>
              {activeRule === 'number' ? "¿ES PAR?" : "¿ES VOCAL?"}
            </div>

            <div className={`${styles.stimulusCard} ${gameState === GAME_STATE.FEEDBACK ? (feedback.isCorrect ? styles.correctCard : styles.incorrectCard) : ''}`}>
              {stimulus.letter}{stimulus.number}
            </div>

            <div className={styles.buttonGroup}>
              <button className={`${styles.btnResponse} ${styles.btnYes}`} onClick={() => handleResponse(true)}>SÍ</button>
              <button className={`${styles.btnResponse} ${styles.btnNo}`} onClick={() => handleResponse(false)}>NO</button>
            </div>
          </div>

          <footer className={styles.footer}>
            {activeRule === 'number' ? "Regla: Mira solo el número" : "Regla: Mira solo la letra"}
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