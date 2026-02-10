// src/games/ConcentrateEnElObjetivo/ConcentrateEnElObjetivo.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ConcentrateEnElObjetivo.module.css";
import PauseMenu from "../../components/MenuJuego/PauseMenu";
import { playSound, sounds } from "../../utils/sounds";

const GAME_CODE = "AT-01";
const GAME_TIME_SEC = 45;
const GRID_SIZE = 520;
const CIRCLE_SIZE = 55;
const NUM_DISTRACTORS = 12;

const DIRECTIONS = ["↑", "↓", "←", "→"];
const DIR_VECTORS = {
  "↑": { x: 0, y: -1 },
  "↓": { x: 0, y: 1 },
  "←": { x: -1, y: 0 },
  "→": { x: 1, y: 0 },
};
const KEY_MAP = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→"
};



export default function ConcentrateEnElObjetivo({ onGameOver }) {
  const [gameState, setGameState] = useState("countdown");
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [timerSec, setTimerSec] = useState(GAME_TIME_SEC);
  const [lives, setLives] = useState(3);

  const [stimulus, setStimulus] = useState({ target: null, distractors: [], scenario: "" });
  const [trials, setTrials] = useState([]);

  const [responseTimes, setResponseTimes] = useState([]);
  const [stimulusStartTime, setStimulusStartTime] = useState(null);
  const [commissionErrors, setCommissionErrors] = useState(0);
  const [omissionErrors, setOmissionErrors] = useState(0);

  const isProcessingResponse = useRef(false);
  const isEndingRef = useRef(false);
  const animationFrameRef = useRef();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const toggleSound = () => setSoundEnabled((prev) => !prev);

  const generateTrial = useCallback(() => {
    const targetArrow = DIRECTIONS[Math.floor(Math.random() * 4)];
    const isOpposite = Math.random() > 0.5;
    const baseSpeed = 1.2;
    const vector = DIR_VECTORS[targetArrow];
    const finalDx = vector.x * baseSpeed * (isOpposite ? -1 : 1);
    const finalDy = vector.y * baseSpeed * (isOpposite ? -1 : 1);

    const createObj = (isTarget = false) => ({
      x: Math.random() * (GRID_SIZE - CIRCLE_SIZE),
      y: Math.random() * (GRID_SIZE - CIRCLE_SIZE),
      dx: finalDx,
      dy: finalDy,
      arrow: isTarget ? targetArrow : DIRECTIONS[Math.floor(Math.random() * 4)],
      isTarget
    });

    return {
      scenario: isOpposite ? "CONTRARIO" : "CONGRUENTE",
      target: createObj(true),
      distractors: Array.from({ length: NUM_DISTRACTORS }).map(() => createObj(false))
    };
  }, []);

  const animate = useCallback(() => {
    if (gameState !== "playing" || paused) return;
    setStimulus(prev => {
      const move = (obj) => {
        let nx = obj.x + obj.dx;
        let ny = obj.y + obj.dy;
        if (nx < -CIRCLE_SIZE) nx = GRID_SIZE;
        if (nx > GRID_SIZE) nx = -CIRCLE_SIZE;
        if (ny < -CIRCLE_SIZE) ny = GRID_SIZE;
        if (ny > GRID_SIZE) ny = -CIRCLE_SIZE;
        return { ...obj, x: nx, y: ny };
      };
      return {
        ...prev,
        target: move(prev.target),
        distractors: prev.distractors.map(move)
      };
    });
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [gameState, paused]);

  useEffect(() => {
    if (gameState === "playing" && !paused) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, paused, animate]);

  const handleAnswer = useCallback((pressedDir) => {
  if (isProcessingResponse.current || gameState !== "playing" || paused || !stimulus.target) return;
  isProcessingResponse.current = true;

  const responseTime = stimulusStartTime
    ? Date.now() - stimulusStartTime
    : null;

  const isCorrect = pressedDir === stimulus.target.arrow;

  if (isCorrect) {
    if (soundEnabled) playSound(sounds.correct, 0.6);
    setScore(prev => prev + 50);
    setTrials(prev => [
      ...prev,
      { type: 'correct', rt: responseTime }
    ]);
    if (responseTime !== null) {
      setResponseTimes(prev => [...prev, responseTime]);
    }
  } else {
    if (soundEnabled) playSound(sounds.incorrect, 0.6);
    setLives(prev => prev - 1);
    setTrials(prev => [
      ...prev,
      { type: 'commission', rt: responseTime }
    ]);
    setCommissionErrors(prev => prev + 1);
  }

  setTimeout(() => {
    if (isEndingRef.current) return;
    setStimulus(generateTrial());
    setStimulusStartTime(Date.now());
    isProcessingResponse.current = false;
  }, 200);
}, [gameState, paused, stimulus, generateTrial, soundEnabled]);


  useEffect(() => {
    const onKeyDown = (e) => {
      const dir = KEY_MAP[e.key];
      if (dir) handleAnswer(dir);
      if (e.key === "Escape") setPaused(p => !p);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAnswer]);

  useEffect(() => {
    let intervalId;
    if (gameState === "playing" && !paused) {
      intervalId = setInterval(() => {
        setTimerSec(t => {
          if (t <= 1) {
            clearInterval(intervalId);
            setGameState("game_over");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [gameState, paused]);

  useEffect(() => {
    if ((gameState === "playing" && lives <= 0) || gameState === "game_over") {
      setGameState("game_over");
    }
  }, [lives, gameState]);

  useEffect(() => {
    if (gameState === "game_over" && !isEndingRef.current) {
      isEndingRef.current = true;
      cancelAnimationFrame(animationFrameRef.current);
        if (soundEnabled) {
          const audio = new Audio('/sounds/game-over.mp3');
          audio.volume = 0.5;
          audio.play();
        }

      const correctas = trials.filter(t => t.correct).length;


const porcentajeCorrectas =
  trials.length > 0 ? (correctas / trials.length) * 100 : 0;

const tiempoMedio =
  responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

const variabilidad =
  responseTimes.length > 1
    ? Math.sqrt(
        responseTimes
          .map(t => Math.pow(t - tiempoMedio, 2))
          .reduce((a, b) => a + b, 0) / responseTimes.length
      )
    : 0;

onGameOver?.({
  game_code: GAME_CODE,
  score,
  trials
});

    }
  }, [gameState, trials, score, onGameOver]);

  useEffect(() => {
    if (gameState === "countdown") {
      if (soundEnabled) {
        const audio = new Audio('/sounds/game-start.mp3');
        audio.volume = 0.5;
        audio.play();
      }
      let t = 3;
      const id = setInterval(() => {
        if (soundEnabled) playSound(sounds.tick, 0.3);
        t--;
        setCountdown(t > 0 ? t : null);
        if (t === 0) {
          if (soundEnabled) {
            const audio = new Audio('/sounds/game-start.mp3');
            audio.volume = 0.5;
            audio.play();
          }

          clearInterval(id);
          setStimulus(generateTrial());
          setStimulusStartTime(Date.now());
          setGameState("playing");
          isProcessingResponse.current = false;
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [gameState, generateTrial]);

  if (gameState === "game_over") return null;

  return (
    <div className={styles.gameContainer}>
      {/* Botón visible de pausa */}
      <button className={styles.pauseButton} onClick={() => setPaused(true)}>⏸ Pausa</button>

      <div className={styles.hud}>
        <div className={styles.statItem}>Vidas: {"❤️".repeat(lives)}</div>
        <div className={styles.statItem}>Puntos: <strong>{score}</strong></div>
        <div className={styles.statItem}>Tiempo: <strong>{timerSec}s</strong></div>
      </div>

      {gameState === "countdown" ? (
        <div className={styles.countdown}>{countdown}</div>
      ) : (
        <div className={styles.gameWrapper}>
          <div className={styles.scenarioLabel}>
            FLUJO: <strong>{stimulus.scenario}</strong>
          </div>
<div className={styles.gameWrapper}>
  <div className={styles.playingArea}>
    {stimulus.distractors.map((d, i) => (
      <div
        key={`dist-${i}`}
        className={`${styles.distractor} ${styles[`green${(i % 3) + 1}`]}`}
        style={{ left: d.x, top: d.y }}
      >
        {d.arrow}
      </div>
    ))}
    {stimulus.target && (
      <div
        className={styles.target}
        style={{ left: stimulus.target.x, top: stimulus.target.y }}
      >
        {stimulus.target.arrow}
      </div>
    )}
  </div>
</div>

        </div>
      )}

      <PauseMenu
        visible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => {
          setPaused(false);
          setCountdown(3);
          setGameState("countdown");
          setScore(0);
          setLives(3);
          setTimerSec(GAME_TIME_SEC);
          setTrials([]);
        }}
        onToggleSound={toggleSound}
        isSoundEnabled={soundEnabled}
        onHowTo={() => alert("Función 'Cómo jugar' no conectada al esqueleto.")}
      />
    </div>
  );
}
