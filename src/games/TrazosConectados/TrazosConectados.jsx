import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './TrazosConectados.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu';
import { playSound, sounds } from '../../utils/sounds';
import { trazosConectadosConfig, gameSettings, levelsData } from './TrazosConectados.config';

const GAME_STATE = { COUNTDOWN: 'countdown', PLAYING: 'playing', FEEDBACK: 'feedback', GAME_OVER: 'game_over' };

export default function TrazosConectados({ onGameOver }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [levelStartTime, setLevelStartTime] = useState(null);
  const [isFirstStart, setIsFirstStart] = useState(true);

  const [lives, setLives] = useState(gameSettings.startingLives);

  // --- MÉTRICAS ---
  const [erroresConexion, setErroresConexion] = useState(0);
  const [userPath, setUserPath] = useState([]);
  const [levelStats, setLevelStats] = useState([]);

  const level = levelsData[levelIndex];
  const countdownRef = useRef(null);

  const safePlay = useCallback((snd, vol = 1) => {
    try { playSound(snd, vol); } catch (e) {}
  }, []);

  // --- CENTRADO GEOMÉTRICO POR NIVEL (OFFSET) ---
  // Ajusta estos valores si tus coordenadas base no están pensadas para 600x400.
  const STAGE_W = 600;
  const STAGE_H = 400;

  const { offsetX, offsetY } = React.useMemo(() => {
    const xs = level.points.map(p => p.x);
    const ys = level.points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const figureCenterX = (minX + maxX) / 2;
    const figureCenterY = (minY + maxY) / 2;

    return {
      offsetX: (STAGE_W / 2) - figureCenterX,
      offsetY: (STAGE_H / 2) - figureCenterY,
    };
  }, [level.points]);

  // --- LÓGICA DE TRAZADO ---
  const handlePointClick = (pointIndex) => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;

    const nextExpectedPoint = userPath.length;

    if (pointIndex === level.sequence[nextExpectedPoint]) {
      const newPath = [...userPath, pointIndex];
      setUserPath(newPath);
      safePlay(sounds.click, 0.4);

      if (newPath.length === level.sequence.length) {
        handleLevelComplete(newPath);
      }
    } else {
      setErroresConexion(prev => prev + 1);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setTimeout(() => endGame(), 500);
        }
        return newLives;
      });
      safePlay(sounds.incorrect, 0.5);
    }
  };

  const handleLevelComplete = (finalPath) => {
    const timeMs = Date.now() - levelStartTime;
    safePlay(sounds.correct, 0.7);
    setGameState(GAME_STATE.FEEDBACK);

    setLevelStats(prev => [...prev, {
      timeMs,
      erroresConexion,
      totalPoints: level.sequence.length
    }]);

    setTimeout(() => {
      if (levelIndex + 1 < levelsData.length) {
        setLevelIndex(prev => prev + 1);
        setErroresConexion(0);
        setUserPath([]);
        setGameState(GAME_STATE.PLAYING);
        setLevelStartTime(Date.now());
      } else {
        onGameOver(calculateFinalMetrics());
      }
    }, 1500);
  };

  // --- ESTRUCTURA DE INICIO ---
  useEffect(() => {
    if (isFirstStart) {
      safePlay(sounds.start);
      let timeLeft = 3;
      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft > 0 ? timeLeft : null);
        if (timeLeft === 0) {
          clearInterval(countdownRef.current);
          setGameState(GAME_STATE.PLAYING);
          setIsFirstStart(false);
          setLevelStartTime(Date.now());
        }
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [isFirstStart, safePlay]);

  const calculateFinalMetrics = useCallback(() => {
    const currentLevelProgress = {
      timeMs: levelStartTime ? Date.now() - levelStartTime : 0,
      erroresConexion: erroresConexion,
      totalPoints: level.sequence.length
    };

    const allStats = [...levelStats, currentLevelProgress];

    const totalTimeMs = allStats.reduce((sum, s) => sum + s.timeMs, 0);
    const totalErrors = allStats.reduce((sum, s) => sum + s.erroresConexion, 0);

    const totalPointsInGame = allStats.reduce((sum, s) => sum + s.totalPoints, 0);
    const precision = Math.max(0, 100 - (totalErrors * (100 / (totalPointsInGame || 1))));

    return {
      indice_precision_visoconstructiva: parseFloat(precision.toFixed(2)),
      tiempo_total_trazado_ms: totalTimeMs,
      errores_conexion_recuento: totalErrors,
      desviacion_espacial_promedio: parseFloat((totalErrors * 0.85).toFixed(2)),
      score: Math.round(precision * 10)
    };
  }, [levelStats, erroresConexion, levelStartTime, level.sequence.length]);

  const endGame = () => {
    const finalPayload = calculateFinalMetrics();
    onGameOver(finalPayload);
  };

  const handleReset = useCallback(() => {
    setGameState(GAME_STATE.COUNTDOWN); 
    setCountdown(3);
    setPaused(false);
    setUserPath([]); 
    setErroresConexion(0);
    setLives(gameSettings.startingLives); 
    setIsFirstStart(true); 
    }, []);

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)}>
        ⏸ Pausa
      </button>

      {countdown && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div className={styles.hudLeft} />
        <div className={styles.hudCenter}>
          <div className={styles.statsBadge}>
            <span>Nivel: {levelIndex + 1}</span>
            <span className={styles.statDivider}></span>
            <span>Puntos: {userPath.length} / {level.sequence.length}</span>
          </div>
        </div>
        <div className={styles.hudRight}>
          <div className={styles.livesContainer}>
            {Array.from({ length: gameSettings.startingLives }).map((_, i) => (
              <span key={i} className={i < lives ? styles.heartRed : styles.heartEmpty}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.gameBody}>
        <div
          className={styles.canvasArea}
          style={{ filter: (paused || countdown) ? 'blur(4px)' : 'none' }}
        >
          <div className={styles.stage}>
            {/* Guía punteada */}
            <svg className={styles.modelLayer}>
              <polyline
                points={level.sequence
                  .map(idx => `${level.points[idx].x + offsetX},${level.points[idx].y + offsetY}`)
                  .join(' ')
                }
                className={styles.modelGuide}
              />
            </svg>

            {/* Línea del usuario */}
            <svg className={styles.svgLayer}>
              <polyline
                points={userPath
                  .map(idx => `${level.points[idx].x + offsetX},${level.points[idx].y + offsetY}`)
                  .join(' ')
                }
                className={styles.userLine}
              />
            </svg>

            {/* Puntos */}
            {level.points.map((pt, i) => (
              <div
                key={i}
                className={`${styles.node} ${userPath.includes(i) ? styles.activeNode : ''}`}
                style={{ left: pt.x + offsetX, top: pt.y + offsetY }}
                onClick={() => handlePointClick(i)}
              >
                {level.showNumbers && <span>{level.sequence.indexOf(i) + 1}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.instructions}>Une los puntos en orden para formar la figura.</div>
      </footer>

      <PauseMenu 
      visible={paused} 
      onResume={() => setPaused(false)} 
      onRestart={handleReset} 
    />
    </div>
  );
}
