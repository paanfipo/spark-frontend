import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MosaicoEspejo.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { mosaicoEspejoConfig, gameSettings, levelsData } from './MosaicoEspejo.config';

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FEEDBACK: 'feedback',
  GAME_OVER: 'game_over',
};

export default function MosaicoEspejo({ onGameOver }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [isFirstStart, setIsFirstStart] = useState(true); // ⬅️ Nuevo estado
  const [lives, setLives] = useState(gameSettings.startingLives);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  const [erroresPosicion, setErroresPosicion] = useState(0);
  const [erroresColor, setErroresColor] = useState(0);
  const [levelStats, setLevelStats] = useState([]);

  const level = levelsData[levelIndex];
  const [userGrid, setUserGrid] = useState([]);
  const countdownRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) {}
  }, [soundEnabled]);

  const pauseGame = useCallback(() => {
    setPaused(true);
    safePlay(sounds.pauseIn, 0.5);
  }, [safePlay]);

  const resumeGame = useCallback(() => {
    setPaused(false);
    safePlay(sounds.pauseOut, 0.5);
  }, [safePlay]);

  // --- LÓGICA DE INICIO Y NIVELES ---
  useEffect(() => {
    // Inicializar el tablero siempre que cambie el nivel
    setUserGrid(Array(level.gridSize * level.gridSize).fill(null));

    if (isFirstStart) {
      // 1. Sonido de inicio solo la primera vez
      safePlay(sounds.start, 0.6); 

      // 2. Ejecutar conteo 3-2-1
      let timeLeft = 3;
      setCountdown(3);
      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft > 0) {
          setCountdown(timeLeft);
          safePlay(sounds.click, 0.3); // Sonido de tick opcional
        } else {
          clearInterval(countdownRef.current);
          setCountdown(null);
          setGameState(GAME_STATE.PLAYING);
          setIsFirstStart(false); // Ya no es el primer inicio
          setLevelStartTime(Date.now());
        }
      }, 1000);
    } else {
      // Si no es el primer inicio, saltamos directo a jugar
      setGameState(GAME_STATE.PLAYING);
      setLevelStartTime(Date.now());
    }

    return () => clearInterval(countdownRef.current);
  }, [levelIndex, isFirstStart]); // Se dispara al cambiar de nivel

  // --- MANEJO DE CLIC ---
  const handleCellClick = (index) => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;

    setUserGrid((prevGrid) => {
      const newGrid = [...prevGrid];
      const palette = [null, ...level.colors];
      const currentIndex = palette.indexOf(newGrid[index]);
      const nextColor = palette[(currentIndex + 1) % palette.length];

      newGrid[index] = nextColor;

      const targetColor = level.pattern[index];
      if (nextColor !== null && nextColor !== targetColor) {
        setErroresColor(prev => prev + 1);
        if (targetColor === null) setErroresPosicion(prev => prev + 1);
        safePlay(sounds.click, 0.4);
      } else {
        safePlay(sounds.click, 0.4);
      }
      return newGrid;
    });
  };

  // --- VERIFICACIÓN DE VICTORIA ---
  useEffect(() => {
    if (gameState !== GAME_STATE.PLAYING || userGrid.length === 0) return;

    const isCorrect = userGrid.every((color, idx) => color === level.pattern[idx]);
    if (isCorrect) {
      const timeMs = Date.now() - levelStartTime;
      setLevelStats(prev => [...prev, { timeMs, erroresPosicion, erroresColor }]);
      
      safePlay(sounds.correct);
      setGameState(GAME_STATE.FEEDBACK);

      setTimeout(() => {
        if (levelIndex + 1 < levelsData.length) {
          setLevelIndex(prev => prev + 1);
          setErroresColor(0);
          setErroresPosicion(0);
          // El useEffect superior se encargará de poner el estado en PLAYING
        } else {
          onGameOver(calculateFinalMetrics());
        }
      }, 1500);
    }
  }, [userGrid]);

  const calculateFinalMetrics = () => {
    const totalTime = levelStats.reduce((sum, s) => sum + s.timeMs, 0) / 1000;
    const totalPosErrors = levelStats.reduce((sum, s) => sum + s.erroresPosicion, 0);
    const totalColorErrors = levelStats.reduce((sum, s) => sum + s.erroresColor, 0);
    const precision = Math.max(0, 100 - (totalPosErrors + totalColorErrors));

    return {
      precision_reconstruccion_visoespacial: precision,
      tiempo_total_construccion_s: totalTime,
      errores_posicion_recuento: totalPosErrors,
      errores_color_recuento: totalColorErrors,
      indice_eficiencia_visoconstructiva: (precision / (totalTime || 1)).toFixed(2),
      score: Math.round(precision * 10)
    };
  };

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={pauseGame}>⏸ Pausa</button>

      {countdown && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div>Nivel: {levelIndex + 1}</div>
        <div>Vidas: {"❤️".repeat(lives)}</div>
      </header>

      <div className={styles.layout} style={{ filter: (paused || countdown) ? 'blur(4px)' : 'none' }}>
        <div className={styles.mosaicoContainer}>
          <p>Modelo</p>
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${level.gridSize}, 1fr)` }}>
            {level.pattern.map((color, i) => (
              <div key={`m-${i}`} className={styles.cell} style={{ backgroundColor: color || 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </div>

        <div className={styles.mosaicoContainer}>
          <p>Tu Mosaico</p>
          <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${level.gridSize}, 1fr)` }}>
            {userGrid.map((color, i) => (
              <div 
                key={`u-${i}`} 
                className={styles.cellInteractable} 
                style={{ backgroundColor: color || 'rgba(255,255,255,0.2)' }}
                onClick={() => handleCellClick(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
  <div className={styles.instructions}>
    Replica el patrón de la izquierda. Haz clic varias veces en una celda para cambiar su color.
  </div>
</footer>

      <PauseMenu visible={paused} onResume={resumeGame} />
    </div>
  );
}