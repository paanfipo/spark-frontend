// src/pages/WordStormGame.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './TormentaDePalabras.module.css';



const API_URL = 'http://localhost:8000';

/**
 * Descubre el ID real del juego "Tormenta de Palabras" consultando /games/
 * Prioriza game_code ("LEN-04"). Si no está, hace fallback por nombre.
 */
const fetchWordStormId = async (token) => {
  const res = await fetch(`${API_URL}/games/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudieron leer los juegos.');
  const games = await res.json();

  // 1) Por código (si el backend lo expone)
  let game = games.find((g) => g.game_code === 'LEN-04');

  // 2) Fallback por nombre exacto
  if (!game) {
    game = games.find(
      (g) => (g.name || '').trim().toLowerCase() === 'tormenta de palabras'
    );
  }

  if (!game) throw new Error('No se encontró "Tormenta de Palabras" en /games/.');
  return game.id;
};

export default function WordStormGame() {
  const { gameplayId: gameplayIdFromRoute } = useParams();
  const hasRouteGameplayId = Boolean(gameplayIdFromRoute);

  // Estado principal
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'playing' | 'finished'
  const [gameplayId, setGameplayId] = useState(null);
  const [levelData, setLevelData] = useState(null);   // { letter, time_limit_seconds, ... }
  const [timeLeft, setTimeLeft] = useState(0);

  // Interacción
  const [currentWord, setCurrentWord] = useState('');
  const [submittedWords, setSubmittedWords] = useState([]);

  // Resultados
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  // Cargar datos del nivel para una partida dada
  const fetchLevelData = async (gpId, token) => {
    const res = await fetch(`${API_URL}/gameplays/${gpId}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Mensaje claro si faltan niveles (404)
      if (res.status === 404) {
        throw new Error('No se encontró configuración de nivel para esta partida (¿poblaste los niveles de Tormenta?).');
      }
      throw new Error('No se pudieron cargar los datos del nivel.');
    }
    const data = await res.json();
    setLevelData(data.level_data);
    setTimeLeft(data.level_data?.time_limit_seconds ?? 60);
    setGameState('playing');
  };

  // Empezar (SIEMPRE desde el botón). Ya no auto-iniciamos en useEffect.
  const startGame = async () => {
    setError('');
    setResults(null);
    setSubmittedWords([]);

    const token = getToken();
    if (!token) {
      setError('Necesitas iniciar sesión para jugar.');
      return;
    }

    try {
      if (hasRouteGameplayId) {
        // Si la URL trae :gameplayId, úsalo (pero solo al pulsar "Jugar")
        setGameplayId(gameplayIdFromRoute);
        await fetchLevelData(gameplayIdFromRoute, token);
        return;
      }

      // Si NO trae :gameplayId, descubrimos el game_id real y creamos partida
      const gameId = await fetchWordStormId(token);
      const response = await fetch(`${API_URL}/games/${gameId}/start-play`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo iniciar la partida.');
      const newGameplay = await response.json();
      setGameplayId(newGameplay.id);
      await fetchLevelData(newGameplay.id, token);
    } catch (e) {
      setError(e.message);
    }
  };

  // Enviar resultados al backend
  const submitResults = useCallback(async () => {
    const token = getToken();
    try {
      if (!submittedWords?.length) {
        setResults({
          total_score: 0,
          correct_words: [],
          perseveration_errors: 0,
          intrusion_errors: 0,
          lexical_production_rate: 0,
        });
        setGameState('finished');
        return;
      }
      const response = await fetch(`${API_URL}/gameplays/${gameplayId}/submit-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ submitted_words: submittedWords }),
      });
      if (!response.ok) throw new Error('Error al enviar los resultados.');
      const resultData = await response.json();
      setResults(resultData);
    } catch (e) {
      setError(e.message);
    } finally {
      setGameState('finished');
    }
  }, [gameplayId, submittedWords]);

  // Tick del timer
  useEffect(() => {
    if (gameState !== 'playing' || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [gameState, timeLeft]);

  // Corte exacto al llegar a 0s
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) submitResults();
  }, [gameState, timeLeft, submitResults]);

  // Handlers
  const handleWordSubmit = (e) => {
    e.preventDefault();
    const w = (currentWord || '').trim().toLowerCase();
    if (!w) return;
    if (!submittedWords.includes(w)) setSubmittedWords((prev) => [...prev, w]);
    setCurrentWord('');
  };

  const advanceLevel = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/gameplays/${gameplayId}/advance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('No se pudo avanzar de nivel.');
        return;
      }
      // Reset y carga del nuevo nivel
      setResults(null);
      setSubmittedWords([]);
      setError('');
      await fetchLevelData(gameplayId, token);
    } catch (e) {
      setError(e.message);
    }
  };

  const restartGame = () => {
    setGameState('idle');
    setGameplayId(null);
    setLevelData(null);
    setTimeLeft(0);
    setSubmittedWords([]);
    setResults(null);
    setError('');
  };

  /* ================== UI ================== */

  return (
    <div className={styles.wrapper}>
      {/* HERO (Portada) */}
<section className={styles.hero}>
  <div className={styles.heroInner}>
    <div>
      <h1 className={styles.heroTitle}>Tormenta de Palabras</h1>
      <p className={styles.heroSubtitle}>
        Ejercita tu fluidez fonémica escribiendo palabras que inicien con la letra objetivo, bajo tiempo límite.
      </p>

      <div className={styles.heroChips}>
        <span className={styles.chip}>Lenguaje</span>
        <span className={styles.chip}>Funciones Ejecutivas</span>
        {levelData?.letter && <span className={styles.chip}>Letra: {levelData.letter}</span>}
      </div>

      {gameState === 'idle' && (
        <button className={styles.playBtn} onClick={startGame}>
          Jugar
        </button>
      )}
    </div>

    {/* ❗️ANTES: el panel siempre estaba. 
        🔧 AHORA: solo se muestra cuando NO estamos en la portada */}
    {gameState !== 'idle' && (
      <aside className={styles.heroCard}>
        <h4 className={styles.heroCardTitle}>Métricas rápidas</h4>
        <div className={styles.metricsGrid}>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{results?.lexical_production_rate ?? 0}</div>
            <div className={styles.metricLabel}>Palabras / minuto</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{results?.total_score ?? 0}</div>
            <div className={styles.metricLabel}>Correctas</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{results?.perseveration_errors ?? 0}</div>
            <div className={styles.metricLabel}>Repeticiones</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{results?.intrusion_errors ?? 0}</div>
            <div className={styles.metricLabel}>Intrusiones</div>
          </div>
        </div>
      </aside>
    )}
  </div>
  {/* Imagen decorativa en la esquina */}
  <img src="/Tormenta.png" alt="Tormenta" className={styles.heroStorm} />
</section>


      {/* INFO (solo en portada) */}
      {gameState === 'idle' && (
        <section className={styles.section}>
          <div className={styles.card}>
            <h3>Qué entrenas</h3>
            <p>
              <strong>Fluidez verbal fonémica</strong>: recuperación de palabras bajo una regla (misma letra)
              y presión temporal. <strong>Funciones ejecutivas</strong>: inhibir repeticiones y errores,
              autorregular el ritmo y planificar tu producción.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Cómo se puntúa</h3>
            <p>
              Se calcula: <em>palabras correctas</em>, <em>repeticiones</em> (perseveraciones),
              <em>intrusiones</em> (palabras inválidas) y <em>palabras por minuto</em> con base en la
              lógica ya implementada.
            </p>
          </div>
        </section>
      )}

      {/* PLAYING */}
      {gameState === 'playing' && (
        <section className={styles.card}>
          <div className={styles.playingHeader}>
            <div>
              Letra: <span className={styles.letter}>{levelData?.letter}</span>
            </div>
            <div className={`${styles.timer} ${timeLeft <= 5 ? styles.timerWarning : ''}`}>
              Tiempo restante: {timeLeft}s
            </div>
          </div>

          <form className={styles.form} onSubmit={handleWordSubmit}>
            <input
              className={styles.input}
              type="text"
              value={currentWord}
              onChange={(e) => setCurrentWord(e.target.value)}
              placeholder="Escribe una palabra…"
              autoFocus
            />
            <button className={styles.addBtn} type="submit">
              Añadir
            </button>
          </form>

          <div className={styles.wordsList}>
            <h4>
              Palabras añadidas <span className={styles.countChip}>{submittedWords.length}</span>
            </h4>
            <ul className={styles.wordsGrid}>
              {submittedWords.map((w, i) => (
                <li key={`${w}-${i}`} className={styles.word}>
                  {w}
                </li>
              ))}
            </ul>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </section>
      )}

      {/* FINISHED */}
      {gameState === 'finished' && (
        <>
          <section className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              <div className={styles.resultValue}>{results?.total_score ?? 0}</div>
              <div className={styles.resultLabel}>Palabras correctas</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultValue}>{results?.lexical_production_rate ?? 0}</div>
              <div className={styles.resultLabel}>Palabras / minuto</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultValue}>{results?.perseveration_errors ?? 0}</div>
              <div className={styles.resultLabel}>Repeticiones</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultValue}>{results?.intrusion_errors ?? 0}</div>
              <div className={styles.resultLabel}>Intrusiones</div>
            </div>
          </section>

          {results?.correct_words?.length > 0 && (
            <section className={styles.correctBox}>
              <h3>Algunas palabras correctas</h3>
              <p>{results.correct_words.slice(0, 15).join(', ')}</p>
            </section>
          )}

          <div className={styles.actions}>
            <button className={styles.playBtn} onClick={advanceLevel}>
              Siguiente nivel ⏭️
            </button>
            <button className={styles.secondaryBtn} onClick={restartGame}>
              Reiniciar 🔁
            </button>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
