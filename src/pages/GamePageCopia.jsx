// src/pages/GamePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GamePage.module.css';
import astronauta from '../assets/Astronauta.png'; // 👈 ajusta la ruta si tu imagen está en otro sitio
import { FaTrophy, FaCheckCircle, FaClipboardList, FaStopwatch, FaBolt, FaThumbsUp } from "react-icons/fa";

function GamePage() {
  const { gameplayId } = useParams();
  const navigate = useNavigate();

  // Estado principal
  const [gameInfo, setGameInfo] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);

  // Métricas y flujo
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameEndReason, setGameEndReason] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [firstClickTime, setFirstClickTime] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [lastLevelStats, setLastLevelStats] = useState(null);

  // Área flotante
  const containerRef = useRef(null);
  const [wordBodies, setWordBodies] = useState([]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  // Cargar nivel (NO reinicia vidas)
  const fetchLevelData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/gameplays/${gameplayId}/data`,
        { headers: authHeaders() }
      );

      const words = (res.data.level_data.word_set || []).slice().sort(() => Math.random() - 0.5);
      setGameInfo(res.data);
      setAvailableWords(words);

      setSelectedWords([]);
      setFeedback('');
      setIsCorrect(null);
      setAttemptCount(0);
      setFirstClickTime(null);
      setStartTime(Date.now());

      // Inicializar palabras flotantes
      const W = containerRef.current?.clientWidth || 640;
      const H = containerRef.current?.clientHeight || 240;
      const padding = 12;
      const bodies = words.map((w, idx) => {
        const x = Math.random() * Math.max(1, W - 120) + padding;
        const y = Math.random() * Math.max(1, H - 40) + padding;
        const vx = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
        const vy = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
        return { id: `${w}-${idx}-${Date.now()}`, text: w, x, y, vx, vy };
      });
      setWordBodies(bodies);

    } catch (err) {
      setError('No se pudo cargar la partida o no hay más niveles.');
      console.error('Error detallado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameplayId]);

  // Animación flotante
  useEffect(() => {
    let rafId;
    const step = () => {
      setWordBodies(prev => {
        if (!containerRef.current || prev.length === 0) return prev;
        const W = containerRef.current.clientWidth;
        const H = containerRef.current.clientHeight;
        const pad = 6;

        return prev.map(b => {
          let { x, y, vx, vy, text } = b;
          x += vx;
          y += vy;

          const btnW = Math.max(60, Math.min(140, text.length * 10));
          const btnH = 36;

          if (x < pad) { x = pad; vx = Math.abs(vx); }
          if (y < pad) { y = pad; vy = Math.abs(vy); }
          if (x + btnW > W - pad) { x = W - pad - btnW; vx = -Math.abs(vx); }
          if (y + btnH > H - pad) { y = H - pad - btnH; vy = -Math.abs(vy); }

          return { ...b, x, y, vx, vy };
        });
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Seleccionar palabra flotante
  const handleFloatingWordClick = (bodyId) => {
    if (firstClickTime === null) setFirstClickTime(Date.now());

    setWordBodies(prev => {
      const idx = prev.findIndex(b => b.id === bodyId);
      if (idx === -1) return prev;
      const body = prev[idx];

      setSelectedWords(sw => [...sw, body.text]);

      setAvailableWords(aw => {
        const j = aw.findIndex(w => w === body.text);
        if (j === -1) return aw;
        const copy = aw.slice();
        copy.splice(j, 1);
        return copy;
      });

      const copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
  };

  // Devolver palabra a flotantes
  const handleSelectedWordClick = (word, index) => {
    setSelectedWords(prev => {
      const copy = prev.slice();
      copy.splice(index, 1);
      return copy;
    });

    setAvailableWords(prev => [...prev, word]);

    setWordBodies(prev => {
      const W = containerRef.current?.clientWidth || 640;
      const H = containerRef.current?.clientHeight || 240;
      const padding = 12;
      const x = Math.random() * Math.max(1, W - 120) + padding;
      const y = Math.random() * Math.max(1, H - 40) + padding;
      const vx = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
      const vy = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
      return [...prev, { id: `${word}-${Date.now()}`, text: word, x, y, vx, vy }];
    });
  };

  // Verificar oración
  const checkSentence = async () => {
    if (isCorrect || gameOver) return;

    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);
    const formedSentence = selectedWords.join(' ');

    try {
      const response = await axios.post(
        `http://localhost:8000/gameplays/${gameplayId}/check-answer`,
        { user_sentence: formedSentence },
        { headers: authHeaders() }
      );

      const isAnswerCorrect = response.data.is_correct;
      setIsCorrect(isAnswerCorrect);

      if (isAnswerCorrect) {
        setFeedback('¡Correcto!');
        const endTime = Date.now();
        const score = 100;
        const timeTakenMs = startTime ? endTime - startTime : 0;
        const timeInSeconds = timeTakenMs / 1000;
        const efficiency = timeInSeconds > 0 ? parseFloat((score / timeInSeconds).toFixed(2)) : 0;
        const firstInteractionMs = firstClickTime ? firstClickTime - startTime : 0;

        const results = {
          score: totalScore + score,
          results_data: {
            completed_level: gameInfo.level_number,
            time_taken_ms: timeTakenMs,
            first_attempt_success: currentAttempt === 1,
            efficiency_score: efficiency,
            first_interaction_ms: firstInteractionMs
          }
        };

        setLastLevelStats(results.results_data);
        setTotalScore(prev => prev + score);
        setLevelsCompleted(prev => prev + 1);

        await axios.put(
          `http://localhost:8000/gameplays/${gameplayId}/results`,
          results,
          { headers: authHeaders() }
        );

        const TOTAL_LEVELS = 20;
        if (gameInfo.level_number >= TOTAL_LEVELS) {
          setGameEndReason("¡Felicidades, has completado todos los niveles!");
          setGameOver(true);
        } else {
          await axios.post(
            `http://localhost:8000/gameplays/${gameplayId}/advance`,
            {},
            { headers: authHeaders() }
          );
          await fetchLevelData();
        }

      } else {
        const nextLives = lives - 1;
        setLives(nextLives);

        if (nextLives <= 0) {
          setGameEndReason('¡Te has quedado sin vidas!');
          setGameOver(true);
        } else {
          setFeedback(`Incorrecto. Te quedan ${nextLives} vidas.`);
        }
      }
    } catch (err) {
      console.error('Error al verificar la oración:', err);
      alert('Hubo un error al verificar tu respuesta.');
    }
  };

  if (isLoading) return <div className={styles.gameContainer}>Cargando...</div>;

  if (error) {
    return (
      <div className={styles.gameContainer}>
        <h2 style={{ color: 'red' }}>{error}</h2>
        <button onClick={() => navigate('/games')}>Volver a la lista de juegos</button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className={styles.gameContainer}>
        <h1 className={styles.gameTitle}>Juego Terminado</h1>
        <div className={styles.resultsBox}>
          <h3>{gameEndReason || 'Tu Resumen General'}</h3>
          <div className={styles.statRow}><div className={styles.statLabel}><FaTrophy /> <span>Nivel Final Alcanzado</span></div><strong className={styles.statValue}>{gameInfo?.level_number}</strong></div>
          <div className={styles.statRow}><div className={styles.statLabel}><FaCheckCircle /> <span>Niveles Completados</span></div><strong className={styles.statValue}>{levelsCompleted}</strong></div>
          <div className={styles.statRow}><div className={styles.statLabel}><FaClipboardList /> <span>Puntaje Total</span></div><strong className={styles.statValue}>{totalScore}</strong></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <h1 className={styles.gameTitle}>{gameInfo?.game_info?.name || "Lector de Cosmos"} (Nivel {gameInfo?.level_number})</h1>
        <div className={styles.livesContainer}>Vidas: {'❤️'.repeat(lives)}</div>
      </div>

      <div className={styles.sentenceBuilder}>
        <h3 className={styles.builderTitle}>Tu Oración:</h3>
        <div className={styles.selectedWordsArea}>
          {selectedWords.length === 0 ? (
            <span className={styles.placeholderText}>Haz clic en las palabras para construir tu oración</span>
          ) : (
            selectedWords.map((word, index) => (
              <button
                key={`selected-${index}`}
                className={`${styles.wordButton} ${styles.selected}`}
                onClick={() => handleSelectedWordClick(word, index)}
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={styles.availableWords}>
        <h3 className={styles.availableTitle}>Palabras Disponibles:</h3>
        <div
  ref={containerRef}
  className={styles.floatingArea}
>
  {wordBodies.map((b) => (
    <button
      key={b.id}
      className={`${styles.wordButton} ${styles.floatingWord}`}
      onClick={() => handleFloatingWordClick(b.id)}
      style={{
        position: 'absolute',
        transform: `translate(${b.x}px, ${b.y}px)`,
        willChange: 'transform',
        transition: 'transform 0.08s linear',
        userSelect: 'none',
        cursor: 'pointer'
      }}
      disabled={isCorrect === true || gameOver}
    >
      {b.text}
    </button>
  ))}

  {/* Astronauta centrado abajo */}
  <div className={styles.astroHolder}>
  <div className={styles.astroSway}>
    <img src="/Astronauta.png" alt="Astronauta" className={styles.astro} />
  </div>
</div>

</div>

      </div>

      <div className={styles.gameControls}>
        <button
          onClick={checkSentence}
          className={styles.checkButton}
          disabled={isCorrect === true || gameOver}
        >
          Verificar Oración
        </button>
        {feedback && (
          <p className={`${styles.feedbackMessage} ${isCorrect ? styles.correct : styles.incorrect}`}>{feedback}</p>
        )}
      </div>
    </div>
  );
}

export default GamePage;
