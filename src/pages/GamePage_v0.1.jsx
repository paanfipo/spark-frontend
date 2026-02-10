// src/pages/GamePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GamePage.module.css';
import { FaTrophy, FaCheckCircle, FaClipboardList, FaStopwatch, FaBolt, FaThumbsUp } from "react-icons/fa";

function GamePage() {
  const { gameplayId } = useParams();
  const navigate = useNavigate();

  // Estados del juego
  const [gameInfo, setGameInfo] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  
  // Estados para las métricas y el flujo del juego
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameEndReason, setGameEndReason] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [firstClickTime, setFirstClickTime] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [lastLevelStats, setLastLevelStats] = useState(null);

  useEffect(() => {
    const fetchLevelData = async () => {
      const token = localStorage.getItem('token');
      setIsLoading(true);
      try {
        const response = await axios.get(`http://localhost:8000/gameplays/${gameplayId}/data`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        setGameInfo(response.data);
        setAvailableWords(response.data.level_data.word_set.sort(() => Math.random() - 0.5));
        
        // Resetea estados para el nuevo nivel
        setSelectedWords([]);
        setFeedback('');
        setIsCorrect(null);
        setAttemptCount(0);
        setFirstClickTime(null);
        setStartTime(Date.now());

      } catch (err) { 
        setError("No se pudo cargar la partida o no hay más niveles."); 
        console.error("Error detallado:", err);
      }
      finally { 
        setIsLoading(false); 
      }
    };
    fetchLevelData();
  }, [gameplayId]);

  const handleWordSelect = (word) => {
    if (firstClickTime === null) {
      setFirstClickTime(Date.now());
    }
    setSelectedWords(prev => [...prev, word]);
    setAvailableWords(prev => prev.filter(w => w !== word));
  };

  const handleWordDeselect = (word) => {
    setSelectedWords(prev => prev.filter(w => w !== word));
    setAvailableWords(prev => [...prev, word]);
  };

  const checkSentence = async () => {
    if (isCorrect || gameOver) return;

    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);
    const formedSentence = selectedWords.join(' ');
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `http://localhost:8000/gameplays/${gameplayId}/check-answer`,
        { user_sentence: formedSentence },
        { headers: { Authorization: `Bearer ${token}` } }
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
            "completed_level": gameInfo.level_number,
            "time_taken_ms": timeTakenMs,
            "first_attempt_success": currentAttempt === 1,
            "efficiency_score": efficiency,
            "first_interaction_ms": firstInteractionMs
          }
        };
        
        setLastLevelStats(results.results_data);
        setTotalScore(prev => prev + score);
        setLevelsCompleted(prev => prev + 1);
        
        await axios.put(
            `http://localhost:8000/gameplays/${gameplayId}/results`,
            results,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const TOTAL_LEVELS = 20;
        if (gameInfo.level_number >= TOTAL_LEVELS) {
            setGameEndReason("¡Felicidades, has completado todos los niveles!");
            setGameOver(true);
        } else {
            await axios.post(
                `http://localhost:8000/gameplays/${gameplayId}/advance`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTimeout(() => {
              window.location.reload();
            }, 1000);
        }

      } else {
        // --- LÓGICA DE ERROR CON TUS NUEVAS REGLAS ---
        const newLives = lives - 1;
        setLives(newLives);

        if (newLives > 0) {
          setFeedback(`Incorrecto. Te quedan ${newLives} vidas.`);
        } else {
          // Si el nivel es 11 o superior, retrocede
          if (gameInfo.level_number >= 11) {
            setFeedback('¡Sin vidas! Retrocediendo al nivel anterior...');
            await axios.post(
              `http://localhost:8000/gameplays/${gameplayId}/regress`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // Recarga la página para ir al nivel anterior y reinicia las vidas
            setTimeout(() => { 
                setLives(3); // Reinicia vidas visualmente antes de recargar
                window.location.reload();
            }, 1500);

          } else {
            // Si el nivel es 10 o inferior, es Game Over
            setGameEndReason('¡Te has quedado sin vidas!');
            setGameOver(true);
            await axios.put(
              `http://localhost:8000/gameplays/${gameplayId}/results`,
              { 
                score: totalScore, 
                results_data: { 
                  "status": "game_over", 
                  "reached_level": gameInfo.level_number, 
                  "levels_completed": levelsCompleted,
                  "last_completed_level_stats": lastLevelStats
                } 
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      }
    } catch (err) {
      console.error("Error al verificar la oración:", err);
      alert("Hubo un error al verificar tu respuesta.");
    }
  };
  
  if (isLoading) return <div className={styles.gameContainer}>Cargando...</div>;
  if (error) return (
      <div className={styles.gameContainer}>
        <h2 style={{color: 'red'}}>{error}</h2>
        <button onClick={() => navigate('/games')}>Volver a la lista de juegos</button>
      </div>
  );

  if (gameOver) {
    return (
      <div className={styles.gameContainer}>
        <h1 className={styles.gameTitle}>Juego Terminado</h1>
        <div className={styles.resultsBox}>
          <h3>{gameEndReason || 'Tu Resumen General'}</h3>
           <div className={styles.statRow}><div className={styles.statLabel}><FaTrophy /> <span>Nivel Final Alcanzado</span></div><strong className={styles.statValue}>{gameInfo?.level_number}</strong></div>
          <div className={styles.statRow}><div className={styles.statLabel}><FaCheckCircle /> <span>Niveles Completados</span></div><strong className={styles.statValue}>{levelsCompleted}</strong></div>
          <div className={styles.statRow}><div className={styles.statLabel}><FaClipboardList /> <span>Puntaje Total</span></div><strong className={styles.statValue}>{totalScore}</strong></div>
          
          {lastLevelStats && (
            <div className={styles.detailedMetricsSection}>
              <h4>Métricas del Último Nivel Superado (Nivel {lastLevelStats.completed_level})</h4>
              <div className={styles.statRow}><div className={styles.statLabel}><FaStopwatch /> <span>Tiempo</span></div><strong className={styles.statValue}>{(lastLevelStats.time_taken_ms / 1000).toFixed(2)} s</strong></div>
              <div className={styles.statRow}><div className={styles.statLabel}><FaBolt /> <span>Eficiencia</span></div><strong className={styles.statValue}>{lastLevelStats.efficiency_score} pts/s</strong></div>
              <div className={styles.statRow}><div className={styles.statLabel}><FaThumbsUp /> <span>Al 1er Intento</span></div><strong className={styles.statValue}>{lastLevelStats.first_attempt_success ? 'Sí' : 'No'}</strong></div>
            </div>
          )}
          <button onClick={() => navigate('/games')} className={styles.checkButton}>
            Ver otros juegos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <h1 className={styles.gameTitle}>{gameInfo?.game_info?.name || "Lector de Cosmos"} (Nivel {gameInfo?.level_number})</h1>
        <div className={styles.livesContainer}>
          Vidas: {'❤️'.repeat(lives)}
        </div>
      </div>
      
      <div className={styles.sentenceBuilder}>
        <h3 className={styles.builderTitle}>Tu Oración:</h3>
        <div className={styles.selectedWordsArea}>
          {selectedWords.length === 0 ? (
            <span className={styles.placeholderText}>Haz clic en las palabras para construir tu oración</span>
          ) : (
            selectedWords.map((word, index) => (
              <button key={`selected-${index}`} className={`${styles.wordButton} ${styles.selected}`} onClick={() => handleWordDeselect(word)}>
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={styles.availableWords}>
        <h3 className={styles.availableTitle}>Palabras Disponibles:</h3>
        <div className={styles.availableWordsGrid}>
          {availableWords.map((word, index) => (
            <button key={`available-${index}`} className={styles.wordButton} onClick={() => handleWordSelect(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.gameControls}>
        <button onClick={checkSentence} className={styles.checkButton} disabled={isCorrect === true || gameOver}>
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