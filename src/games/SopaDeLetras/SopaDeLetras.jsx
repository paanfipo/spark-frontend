import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './SopaDeLetras.module.css';
import PauseMenu from '../../components/MenuJuego/PauseMenu'; 
import { playSound, sounds } from '../../utils/sounds';
import { WORD_BANKS } from '../../data/objects';


const GRID_SIZE = 10;

const GAME_STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

export default function SopaDeLetras({ onGameOver }) { 
  const [gameState, setGameState] = useState(GAME_STATE.COUNTDOWN);
  const [grid, setGrid] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [selection, setSelection] = useState([]);
  const [cellsFound, setCellsFound] = useState([]); 
  const [level, setLevel] = useState(1);

  const wordsCount = 1 + (level * 2);

  const [wordsToFind, setWordsToFind] = useState([]);
  
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90); // 90 segundos de base
  const [paused, setPaused] = useState(false);
  
  // Métricas específicas
  const [metrics, setMetrics] = useState({
    ayudas: 0,
    erroresComision: 0,
    tiemposLocalizacion: []
  });
  
  const lastFoundTimeRef = useRef(Date.now());
  const timeoutsRef = useRef([]);
  const [soundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');

  // --- UTILIDADES ---
  const safePlay = useCallback((snd, vol = 1) => {
    if (!soundEnabled) return;
    try { playSound(snd, vol); } catch (e) { }
  }, [soundEnabled]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // --- LÓGICA DE GENERACIÓN ---
  const generateGrid = useCallback(() => {
    const count = 1 + (level * 2);
    // 1. Elegimos las palabras para ESTE nivel
    const selected = [...WORD_BANKS.NEURO]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(count, 8)); 
    
    setWordsToFind(selected); // Guardamos las del nivel
    setFoundWords([]);
    setCellsFound([]);
    setSelection([]);

    let newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    
    // 2. IMPORTANTE: Usamos 'selected' aquí, no el banco completo
    selected.forEach(word => {
      let placed = false;
      let attempts = 0; 
      while (!placed && attempts < 50) { // Evita bucle infinito
        attempts++;
        const isVert = Math.random() > 0.5;
        const r = Math.floor(Math.random() * (isVert ? GRID_SIZE - word.length : GRID_SIZE));
        const c = Math.floor(Math.random() * (isVert ? GRID_SIZE : GRID_SIZE - word.length));
        
        let canPlace = true;
        for(let i=0; i<word.length; i++) {
          if (newGrid[r + (isVert ? i : 0)][c + (isVert ? 0 : i)] !== '') canPlace = false;
        }

        if (canPlace) {
          for(let i=0; i<word.length; i++) {
            newGrid[r + (isVert ? i : 0)][c + (isVert ? 0 : i)] = word[i];
          }
          placed = true;
        }
      }
    });

    const letters = "ABCDEGHILMNOPRSTU";
    setGrid(newGrid.map(row => row.map(l => l || letters[Math.floor(Math.random() * letters.length)])));
  }, [level]); 

  // --- MÉTRICAS FINALES ---
  const calculateFinalMetrics = useCallback(() => {
    const totalEncontradas = foundWords.length;
    const avgTime = metrics.tiemposLocalizacion.length > 0 
      ? metrics.tiemposLocalizacion.reduce((a, b) => a + b, 0) / metrics.tiemposLocalizacion.length 
      : 0;

    return {
      score: score,
      total_aciertos: totalEncontradas,
      indice_precision: (totalEncontradas / wordsToFind.length) * 100,
      tiempo_medio_ms: parseFloat(avgTime.toFixed(2)),
      errores_comision: metrics.erroresComision,
      errores_omision: wordsToFind.length - totalEncontradas,
      uso_ayudas: metrics.ayudas
    };
  }, [foundWords, metrics, score]);

  const endGame = useCallback(() => {
    safePlay(sounds.gameOver);
    setGameState(GAME_STATE.GAME_OVER);
    const rawMetrics = calculateFinalMetrics();
    if (onGameOver) onGameOver(rawMetrics);
  }, [onGameOver, calculateFinalMetrics, safePlay]);

  // --- INTERACCIÓN ---
  const handleCellClick = (r, c) => {
  // 1. Bloqueos de seguridad
  if (paused || gameState !== 'playing') return;

  // Si la celda ya es parte de una palabra encontrada (verde), no hacemos nada
  if (cellsFound.some(s => s.r === r && s.c === c)) return;

  // Lógica para deseleccionar: Si toca una celda amarilla, la quitamos
  if (selection.some(s => s.r === r && s.c === c)) {
    setSelection(selection.filter(s => !(s.r === r && s.c === c)));
    return;
  }

  // 2. Nueva selección
  const newSelection = [...selection, { r, c }];
  setSelection(newSelection);
  safePlay(sounds.click, 0.5);

  // 3. Verificación de palabra
  const currentWord = newSelection.map(s => grid[s.r][s.c]).join('');
  const foundWord = wordsToFind.find(word => 
    word === currentWord && !foundWords.includes(word)
  );

  if (foundWord) {
    // ¡ACIERTO!
    safePlay(sounds.correct);
    const updatedFound = [...foundWords, foundWord];
    setFoundWords(updatedFound);
    setCellsFound(prev => [...prev, ...newSelection]);
    setScore(s => s + (100 * level));
    setSelection([]); // Limpiamos la selección amarilla

    // Registrar tiempo para métricas
    const now = Date.now();
    setMetrics(m => ({
      ...m,
      tiemposLocalizacion: [...m.tiemposLocalizacion, now - lastFoundTimeRef.current]
    }));
    lastFoundTimeRef.current = now;

    // 4. LÓGICA DE CAMBIO DE NIVEL
    if (updatedFound.length === wordsToFind.length) {
      safePlay(sounds.nextLevel); 
      
      // Esperamos un momento para que el usuario vea su última palabra en verde
      setTimeout(() => {
        if (level >= 5) { 
          // Si llegó al nivel máximo (5), termina el juego
          endGame();
        } else {
          // PASAR AL SIGUIENTE NIVEL
          setLevel(prev => prev + 1); 

          // IMPORTANTE: Limpiar estados para el nuevo tablero
          setFoundWords([]);   // El HUD vuelve a 0/X
          setCellsFound([]);   // Se borran las palabras verdes del tablero
          setSelection([]);    // Se borra cualquier selección amarilla
          setTimeLeft(prev => prev + 30); // Bonus de tiempo por nivel superado
        }
      }, 1000);
    }
  } 
  else if (newSelection.length >= 12) { 
    // Si se pasa de 12 letras sin éxito, es un error de comisión
    safePlay(sounds.incorrect);
    setMetrics(m => ({ ...m, erroresComision: m.erroresComision + 1 }));
    setSelection([]);
  }
};

  const requestHint = () => {
    if (paused || gameState !== GAME_STATE.PLAYING) return;
    setMetrics(m => ({ ...m, ayudas: m.ayudas + 1 }));
    safePlay(sounds.pauseOut, 0.5); // Sonido de feedback para la ayuda
    // Aquí podrías implementar una lógica visual que resalte la primera letra
  };

  // --- EFECTOS (IGUAL QUE MATRIZ) ---
  useEffect(() => {
  // Solo generamos si estamos en cuenta regresiva o si el nivel cambia
  if (gameState === GAME_STATE.COUNTDOWN || gameState === GAME_STATE.PLAYING) {
    generateGrid();
  }
  
  // Si estamos en COUNTDOWN, manejamos el intervalo de 3, 2, 1...
  if (gameState === GAME_STATE.COUNTDOWN) {
    setCountdown(3);
    safePlay(sounds.start);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setGameState(GAME_STATE.PLAYING);
          lastFoundTimeRef.current = Date.now();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }
  return () => clearInterval(countdownRef.current);
}, [gameState, generateGrid, safePlay, level]); 

  useEffect(() => {
    if (gameState === GAME_STATE.PLAYING && !paused) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timer);
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, paused, endGame]);

  if (gameState === GAME_STATE.GAME_OVER) return null;

  return (
    <div className={styles.gameContainer}>
      <button className={styles.pauseButton} onClick={() => setPaused(true)} disabled={gameState === GAME_STATE.COUNTDOWN}>
        ⏸ Pausa
      </button>

      {gameState === GAME_STATE.COUNTDOWN && <div className={styles.countdown}>{countdown}</div>}

      <header className={styles.hud}>
        <div>Nivel: {level}</div> 
        <div>Encontradas: {foundWords.length}/{wordsToFind.length}</div>
        <div>Tiempo: {timeLeft}s</div>
        <button className={styles.helpBtn} onClick={requestHint}>💡 Pista</button>
      </header>

      <div className={styles.gridContainer}>
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {grid.map((row, r) => row.map((letter, c) => {
            const isSelected = selection.some(s => s.r === r && s.c === c);
            const isPermanent = cellsFound.some(s => s.r === r && s.c === c);

            return (
              <div 
                key={`${r}-${c}`}
                className={`${styles.cell} ${isSelected ? styles.selected : ''} ${isPermanent ? styles.correct : ''}`}
                onClick={() => handleCellClick(r, c)}
              >
                {letter}
              </div>
            );
          }))}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.wordList}>
          {wordsToFind.map(word => (
            <span key={word} className={foundWords.includes(word) ? styles.wordFound : ''}>
              {word}
            </span>
          ))}
        </div>
      </div>

      <PauseMenu 
        visible={paused} 
        onResume={() => setPaused(false)} 
        onRestart={() => window.location.reload()} 
      />
    </div>
  );
}