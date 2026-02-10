import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ElLectorDelCosmos.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { COSMOS_DATA } from '../../data/objects';

const GAME_STATE = { COUNTDOWN: 'countdown', PLAYING: 'playing', FEEDBACK: 'feedback', GAME_OVER: 'game_over' };

export default function ElLectorDelCosmos({ onGameOver }) {
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [selectedWords, setSelectedWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  
  const [totalErrors, setTotalErrors] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const timeoutsRef = useRef([]);

  const safePlay = useCallback((snd) => {
    try { playSound(snd); } catch (e) {}
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // ✅ 1. Modificamos setupLevel para que sea más robusta
  const setupLevel = useCallback(() => {
    const currentData = COSMOS_DATA[level % COSMOS_DATA.length];
    if (!currentData) return;

    const allWords = [...currentData.sentence, ...currentData.distractors]
      .map(w => ({ text: w, id: Math.random() }))
      .sort(() => Math.random() - 0.5);
    
    setAvailableWords(allWords);
    setSelectedWords([]);
    setLevelStartTime(Date.now());
  }, [level]); // Ahora sí depende de level correctamente

  // ✅ 2. Nuevo useEffect para cargar el nivel cuando el nivel cambie y estemos en PLAYING
  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      setupLevel();
    }
  }, [level, gameState, paused, setupLevel]);

  const finishGame = useCallback(() => {
    const finalMetrics = {
      score,
      precision_sintactica: Math.round((selectedWords.length / (selectedWords.length + totalErrors || 1)) * 100),
      tiempo_construccion_ms: Date.now() - levelStartTime,
      errores_seleccion: totalErrors,
      nivel_final: level + 1
    };
    setGameState(GAME_STATE.GAME_OVER);
    onGameOver?.(finalMetrics);
  }, [score, totalErrors, levelStartTime, selectedWords, level, onGameOver]);

  const handleWordClick = (wordObj) => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;

    const currentData = COSMOS_DATA[level % COSMOS_DATA.length];
    const nextExpectedWord = currentData.sentence[selectedWords.length];

    if (wordObj.text === nextExpectedWord) {
      safePlay(sounds.correct);
      const newSelection = [...selectedWords, wordObj.text];
      setSelectedWords(newSelection);
      
      setAvailableWords(prev => prev.filter(w => w.id !== wordObj.id));

      if (newSelection.length === currentData.sentence.length) {
        setScore(s => s + 500);
        setGameState(GAME_STATE.FEEDBACK);
        
        const id = setTimeout(() => {
          if (level + 1 >= COSMOS_DATA.length) {
            finishGame();
          } else {
            // ✅ Solo cambiamos el nivel y el estado. 
            // El useEffect de arriba se encargará de llamar a setupLevel()
            setLevel(l => l + 1);
            setGameState(GAME_STATE.PLAYING);
          }
        }, 1500);
        timeoutsRef.current.push(id);
      }
    } else {
      safePlay(sounds.incorrect);
      setTotalErrors(e => e + 1);
      setLives(l => {
        const next = l - 1;
        if (next <= 0) {
          setTimeout(finishGame, 200);
          return 0;
        }
        return next;
      });
    }
  };

  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      let c = 3;
      safePlay(sounds.start);
      const timer = setInterval(() => {
        c--;
        setCountdown(c > 0 ? c : null);
        if (c === 0) {
          clearInterval(timer);
          setGameState(GAME_STATE.PLAYING);
          // setupLevel() ya no es necesario aquí porque el useEffect lo disparará
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, safePlay]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => { setPaused(true); clearAllTimeouts(); }}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div className={styles.hudSection}>Puntos: {score}</div>
        <div className={styles.hudSection}>Fase: {level + 1}</div>
        <div className={styles.hudSection}>
          Vidas: {'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(Math.max(0, 3 - lives))}
        </div>
      </header>

      <main className={styles.mainArea}>
        <div className={styles.sentenceBox}>
          {selectedWords.map((w, i) => (
            <span key={i} className={styles.wordConfirmed}>{w}</span>
          ))}
          <span className={styles.cursor}>|</span>
        </div>

        <div className={styles.wordPool}>
          {availableWords.map((w) => (
            <button key={w.id} className={styles.wordBubble} onClick={() => handleWordClick(w)}>
              {w.text}
            </button>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        {gameState === GAME_STATE.FEEDBACK ? '¡Excelente!' : 'Forma la oración correcta'}
      </footer>

      <PauseMenu visible={paused} onResume={() => setPaused(false)} onRestart={() => window.location.reload()} />
    </div>
  );
}