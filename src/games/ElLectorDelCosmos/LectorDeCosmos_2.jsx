// src/pages/GamePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./LectorDeCosmos.module.css";
import {
  FaTrophy,
  FaCheckCircle,
  FaClipboardList,
  FaStopwatch,
  FaBolt,
  FaThumbsUp,
  FaExclamationCircle, // <-- Ícono para errores
  FaRandom,            // <-- Ícono para distractores
  FaBullseye,          // <-- Ícono para precisión
  FaClock,             // <-- Ícono para tiempo promedio
  FaRecycle,           // <-- Ícono para eficiencia inversa
} from "react-icons/fa";

function LectorDeCosmos() {
  const { gameplayId } = useParams();
  const navigate = useNavigate();

  // --- Estado principal del juego ---
  const [gameInfo, setGameInfo] = useState(null);
  const [availableWords, setAvailableWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);

  // --- Métricas / flujo ---
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameEndReason, setGameEndReason] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [firstClickTime, setFirstClickTime] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [lastLevelStats, setLastLevelStats] = useState(null);

  // --- NUEVAS MÉTRICAS AGREGADAS (ACUMULATIVAS) ---
  const [totalErrors, setTotalErrors] = useState(0);                 // 5. Número de Errores
  const [totalDistractorsUsed, setTotalDistractorsUsed] = useState(0); // 6. Uso de Distractores
  const [totalTimeTakenMs, setTotalTimeTakenMs] = useState(0);         // Para el promedio
  const [totalAttempts, setTotalAttempts] = useState(0);               // Para la precisión

  // --- Área flotante ---
  const containerRef = useRef(null);
  const [wordBodies, setWordBodies] = useState([]); // [{id,text,x,y,vx,vy}]

  // para prevenir dobles clics “fantasma”
  const clickedIdsRef = useRef(new Set());

  // --- Astronauta (colisión) ---
  const ASTRO_W = 150;                 // igual que .astro width en CSS
  const ASTRO_H = 150;
  const ASTRO_BOTTOM_OFFSET = 8;       // separación inferior
  const ASTRO_BUFFER = 50;             // <-- cuanto antes rebotan (sube/baja)

  // en vez de W/2 usamos 0.83 * W
  //const astroCx = W * 0.83;                               
  //const astroCy = H - (ASTRO_H / 2) - ASTRO_BOTTOM_OFFSET;


  const ASTRO_SAFE_RADIUS = Math.max(ASTRO_W, ASTRO_H) / 2 + ASTRO_BUFFER;


  // --- Persistencia de la última victoria ---
  const lastWinKey = `lastWin:${gameplayId}`;

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  // --- Cargar datos nivel ---
  const fetchLevelData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8000/gameplays/${gameplayId}/data`,
        { headers: authHeaders() }
      );

      const words = (res.data.level_data?.word_set || [])
        .slice()
        .sort(() => Math.random() - 0.5);

      setGameInfo(res.data);
      setAvailableWords(words);

      setSelectedWords([]);
      setFeedback("");
      setIsCorrect(null);
      setAttemptCount(0);
      setFirstClickTime(null);
      setStartTime(Date.now());
      clickedIdsRef.current.clear();

      // Inicializar posiciones
      const W = containerRef.current?.clientWidth || 640;
      const H = containerRef.current?.clientHeight || 300;
      const pad = 12;

      const bodies = words.map((w, idx) => {
        const x = Math.random() * Math.max(1, W - 120) + pad;
        const y = Math.random() * Math.max(1, H - 60) + pad;
        const vx =
          (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
        const vy =
          (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
        return { id: `${w}-${idx}-${Date.now()}`, text: w, x, y, vx, vy };
      });
      setWordBodies(bodies);
    } catch (err) {
      console.error("Error detallado:", err);
      setError("No se pudo cargar la partida o no hay más niveles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelData();

    // recuperar última victoria por si perdemos luego
    try {
      const raw = localStorage.getItem(lastWinKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.results_data) setLastLevelStats(parsed.results_data);
        if (typeof parsed?.totalScore === "number")
          setTotalScore(parsed.totalScore);
        if (typeof parsed?.levelsCompleted === "number")
          setLevelsCompleted(parsed.levelsCompleted);
        // Cargar métricas agregadas
        if (typeof parsed?.totalErrors === "number") setTotalErrors(parsed.totalErrors);
        if (typeof parsed?.totalDistractorsUsed === "number") setTotalDistractorsUsed(parsed.totalDistractorsUsed);
        if (typeof parsed?.totalTimeTakenMs === "number") setTotalTimeTakenMs(parsed.totalTimeTakenMs);
        if (typeof parsed?.totalAttempts === "number") setTotalAttempts(parsed.totalAttempts);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameplayId]);

  // --- Animación con rebotes + colisión astronauta ---
 
  // --- Animación con Rebotes en Bordes y Colisión con Astronauta ---
  useEffect(() => {
  let rafId;

  const step = () => {
    setWordBodies(prev => {
      if (!containerRef.current || prev.length === 0) return prev;

      // 1) Medidas actuales del contenedor (¡aquí sí existe W/H!)
      const W = containerRef.current.clientWidth;
      const H = containerRef.current.clientHeight;

      // 2) Centro del astronauta a 83% horizontal y abajo
      const astroCx = W * 0.83; // 👈 así coincide con left: 83%
      const astroCy = H - (ASTRO_H / 2) - ASTRO_BOTTOM_OFFSET;

      const pad = 6;

      return prev.map(b => {
        let { x, y, vx, vy, text } = b;

        // Avance
        x += vx;
        y += vy;

        // Tamaño aprox. del botón (defínelos ANTES de usarlos)
        const btnW = Math.max(60, Math.min(140, text.length * 10));
        const btnH = 36;

        // ---- Campo de fuerza circular alrededor del astronauta ----
        // Centro del botón
        const bx = x + btnW / 2;
        const by = y + btnH / 2;

        // Radio aprox. del botón (mitad de la diagonal)
        const buttonRadius = Math.hypot(btnW, btnH) / 2;

        const dx = bx - astroCx;
        const dy = by - astroCy;
        const dist = Math.hypot(dx, dy) || 1; // evitar 0

        const ASTRO_SAFE_RADIUS = Math.max(ASTRO_W, ASTRO_H) / 2 + ASTRO_BUFFER;
        const minDist = ASTRO_SAFE_RADIUS + buttonRadius;

        if (dist < minDist) {
          // normal hacia afuera del astro
          const nx = dx / dist;
          const ny = dy / dist;

          // empujar fuera del radio seguro (+2px anti-pegado)
          const push = (minDist - dist) + 2;
          x += nx * push;
          y += ny * push;

          // reflejar velocidad respecto a la normal
          const dot = vx * nx + vy * ny;
          vx -= 2 * dot * nx;
          vy -= 2 * dot * ny;
        }

        // ---- Rebotes con bordes (después del empuje) ----
        if (x < pad) {
          x = pad;
          vx = Math.abs(vx);
        }
        if (y < pad) {
          y = pad;
          vy = Math.abs(vy);
        }
        if (x + btnW > W - pad) {
          x = W - pad - btnW;
          vx = -Math.abs(vx);
        }
        const bottomLimit = H - pad;
        if (y + btnH > bottomLimit) {
          y = bottomLimit - btnH;
          vy = -Math.abs(vy);
        }

        return { ...b, x, y, vx, vy };
      });
    });

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}, []);



  // --- Seleccionar palabra (SIN duplicados) ---
  const handleFloatingWordClick = (bodyId) => {
    if (clickedIdsRef.current.has(bodyId)) return;
    clickedIdsRef.current.add(bodyId);

    if (firstClickTime === null) setFirstClickTime(Date.now());

    // Buscar el body EN EL ESTADO ACTUAL (no dentro de otro setState)
    const body = wordBodies.find((b) => b.id === bodyId);
    if (!body) return;

    // 1) Añadir a seleccionadas
    setSelectedWords((sw) => [...sw, body.text]);

    // 2) Quitar UNA instancia de availableWords
    setAvailableWords((aw) => {
      const j = aw.findIndex((w) => w === body.text);
      if (j === -1) return aw;
      const copy = aw.slice();
      copy.splice(j, 1);
      return copy;
    });

    // 3) Quitar el body del pool flotante
    setWordBodies((prev) => prev.filter((b) => b.id !== bodyId));
  };

  // --- Devolver palabra al área flotante ---
  const handleSelectedWordClick = (word, index) => {
    setSelectedWords((prev) => {
      const copy = prev.slice();
      copy.splice(index, 1);
      return copy;
    });

    setAvailableWords((prev) => [...prev, word]);

    setWordBodies((prev) => {
      const W = containerRef.current?.clientWidth || 640;
      const H = containerRef.current?.clientHeight || 300;
      const pad = 12;
      const x = Math.random() * Math.max(1, W - 120) + pad;
      const y = Math.random() * Math.max(1, H - 60) + pad;
      const vx =
        (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
      const vy =
        (Math.random() * 0.6 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
      const id = `${word}-${Date.now()}`;
      // liberar por si se reusa el id
      clickedIdsRef.current.delete(id);
      return [...prev, { id, text: word, x, y, vx, vy }];
    });
  };

  // --- Verificar oración ---
  const checkSentence = async () => {
    if (isCorrect || gameOver) return;

    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);
    const formedSentence = selectedWords.join(" ");

    try {
      const response = await axios.post(
        `http://localhost:8000/gameplays/${gameplayId}/check-answer`,
        { user_sentence: formedSentence },
        { headers: authHeaders() }
      );

      const { is_correct, distractors_used } = response.data;

      // Acumular uso de distractores si hubo
      if (distractors_used > 0) {
        setTotalDistractorsUsed(p => p + distractors_used);
      }

      setIsCorrect(is_correct);

      // const isAnswerCorrect = response.data.is_correct;
      // setIsCorrect(isAnswerCorrect);

      if (is_correct) {
        setFeedback("¡Correcto!");
        const endTime = Date.now();
        const score = 100;
        const timeTakenMs = startTime ? endTime - startTime : 0;
        
        // Acumular tiempo total para el promedio
        setTotalTimeTakenMs(p => p + timeTakenMs);

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
            first_interaction_ms: firstInteractionMs,
          },
        };

        const newTotalScore = totalScore + score;
        const newLevelsCompleted = levelsCompleted + 1;

        setLastLevelStats(results.results_data);
        setTotalScore(newTotalScore);
        setLevelsCompleted(newLevelsCompleted);

        // Guardar en localStorage con las nuevas métricas
        try {
          localStorage.setItem(
            lastWinKey,
            JSON.stringify({
              totalScore: newTotalScore,
              levelsCompleted: newLevelsCompleted,
              results_data: results.results_data,
              totalErrors, // estado actual de errores
              totalDistractorsUsed: totalDistractorsUsed + (distractors_used || 0),
              totalTimeTakenMs: totalTimeTakenMs + timeTakenMs,
              totalAttempts: totalAttempts + 1,
            })
          );
        } catch {}

        try {
          await axios.put(
            `http://localhost:8000/gameplays/${gameplayId}/results`,
            results,
            { headers: authHeaders() }
          );
        } catch (errSave) {
          console.error("Error guardando resultados de nivel:", errSave);
        }
        
        const TOTAL_LEVELS = 20;
        if (gameInfo.level_number >= TOTAL_LEVELS) {
          setGameEndReason("¡Felicidades, has completado todos los niveles!");
          setGameOver(true);
        } else {
          await axios.post(
            `http://localhost:8000/gameplays/${gameplayId}/advance`,
            {}, { headers: authHeaders() }
          );
          await fetchLevelData();
        }
      } else {
        // Lógica de respuesta incorrecta
        setTotalErrors(p => p + 1); // Incrementar contador de errores
        const nextLives = lives - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          setGameEndReason("¡Te has quedado sin vidas!");
          setGameOver(true);
        } else {
          setFeedback(`Incorrecto. Te quedan ${nextLives} vidas.`);
        }
      }
    } catch (err) {
      console.error("Error al verificar la oración:", err);
      alert("Hubo un error al verificar tu respuesta.");
    }
  };

  // --- Render ---
  if (isLoading) return <div className={styles.gameContainer}>Cargando...</div>;
  if (error) { /* ... (sin cambios) ... */ }

  if (gameOver) {
    // --- Cálculo de métricas finales para mostrar ---
    const finalTotalAttempts = levelsCompleted + totalErrors;
    // 1. Proporción de aciertos (un valor entre 0 y 1)
    const hitProportion = finalTotalAttempts > 0 ? (levelsCompleted / finalTotalAttempts) : 0;

    // 2. Precisión Sintáctica (el porcentaje para mostrar)
    const syntacticAccuracy = (hitProportion * 100);

    // 3. Tiempo de Resolución Promedio (s)
    const avgTime = levelsCompleted > 0 ? (totalTimeTakenMs / levelsCompleted / 1000): "0.00";

    // 4. Índice de Eficiencia Inversa
    const inverseEfficiency = hitProportion > 0 ? (avgTime / hitProportion) : "0.000";

    // 3. Formateo para la presentación (convertidas a TEXTO con decimales)
    const avgTimeForDisplay = avgTime.toFixed(2);
    const syntacticAccuracyForDisplay = syntacticAccuracy.toFixed(1);
    const inverseEfficiencyForDisplay = inverseEfficiency.toFixed(2);

    const maxLevel = gameInfo?.level_number ?? 0;
    const TOTAL_LEVELS = 20; // ajusta si cambias la campaña

    // Componente pequeño para tarjetas
    const StatCard = ({ icon, label, value, suffix = "", help }) => (
      <div className={styles.statCard}>
        <div className={styles.statCardHeader}>
          <span className={styles.statIcon}>{icon}</span>
          <span className={styles.statLabel}>{label}</span>
        </div>
        <div className={styles.statValueRow}>
          <strong className={styles.statValue}>
            {value !== null && value !== undefined ? value : "—"}
          </strong>
          {suffix ? <span className={styles.statSuffix}>{suffix}</span> : null}
        </div>
        {help ? <p className={styles.statHelp}>{help}</p> : null}
      </div>
    );

    return (
  <div className={styles.gameContainer}>
    <h1 className={styles.gameTitle}>Juego Terminado</h1>

    <div className={styles.resultsPanel}>
      <h3 className={styles.resultsSubtitle}>
        {gameEndReason || "Tu Resumen General"}
      </h3>

      {/* Resumen superior en chips */}
      {/* KPIs en tarjetas pastel (3 por fila) */}
<div className={styles.kpisRow}>
  <div className={`${styles.kpiCard} ${styles["kpiCard--level"]}`}>
    <div className={styles.kpiIcon}><FaTrophy /></div>
    <div className={styles.kpiBody}>
      <span className={styles.kpiLabel}>Nivel Máximo Alcanzado</span>
      <span className={styles.kpiValue}>{gameInfo?.level_number}</span>
    </div>
  </div>

  <div className={`${styles.kpiCard} ${styles["kpiCard--completed"]}`}>
    <div className={styles.kpiIcon}><FaCheckCircle /></div>
    <div className={styles.kpiBody}>
      <span className={styles.kpiLabel}>Niveles Completados</span>
      <span className={styles.kpiValue}>{levelsCompleted}</span>
    </div>
  </div>

  <div className={`${styles.kpiCard} ${styles["kpiCard--score"]}`}>
    <div className={styles.kpiIcon}><FaClipboardList /></div>
    <div className={styles.kpiBody}>
      <span className={styles.kpiLabel}>Puntaje Total</span>
      <span className={styles.kpiValue}>{totalScore}</span>
    </div>
  </div>
</div>


      <hr className={styles.divider} />

      <h4 className={styles.sectionTitle}>Métricas de Desempeño</h4>

<div className={styles.metricsGrid}>
  {/* Precisión Sintáctica */}
  <div className={`${styles.metricCard} ${styles["metricCard--brand"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaBullseye/></span>
      <span>Precisión Sintáctica</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{syntacticAccuracyForDisplay}</span>
      <span className={styles.metricSuffix}>%</span>
    </div>
    <p className={styles.metricHelp}>Porcentaje de intentos con oración correcta.</p>
  </div>

  {/* Tiempo Promedio / Nivel */}
  <div className={`${styles.metricCard} ${styles["metricCard--time"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaClock/></span>
      <span>Tiempo Promedio / Nivel</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{avgTimeForDisplay}</span>
      <span className={styles.metricSuffix}>s</span>
    </div>
    <p className={styles.metricHelp}>Velocidad media para resolver cada nivel con éxito.</p>
  </div>

  {/* Índice de Eficiencia Inversa */}
  <div className={`${styles.metricCard} ${styles["metricCard--iei"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaRecycle/></span>
      <span>Índice Eficiencia Inversa</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{inverseEfficiencyForDisplay}</span>
    </div>
    <p className={styles.metricHelp}>Relaciona tu velocidad y precisión. Más bajo es mejor.</p>
  </div>

  {/* Número de Errores */}
  <div className={`${styles.metricCard} ${styles["metricCard--errors"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaExclamationCircle/></span>
      <span>Número de Errores</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{totalErrors}</span>
    </div>
    <p className={styles.metricHelp}>Total de intentos fallidos que cometiste.</p>
  </div>

  {/* Uso de Distractores */}
  <div className={`${styles.metricCard} ${styles["metricCard--distractors"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaRandom/></span>
      <span>Uso de Distractores</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{totalDistractorsUsed}</span>
    </div>
    <p className={styles.metricHelp}>Veces que usaste palabras fuera de cualquier solución.</p>
  </div>

  {/* Nivel Máximo (si quieres repetirlo en tarjetas) */}
  <div className={`${styles.metricCard} ${styles["metricCard--level"]}`}>
    <div className={styles.metricHeader}>
      <span className={styles.metricIcon}><FaTrophy/></span>
      <span>Nivel Máximo Alcanzado</span>
    </div>
    <div className={styles.metricValue}>
      <span className={styles.metricNumber}>{gameInfo?.level_number}</span>
    </div>
    <p className={styles.metricHelp}>El nivel de mayor dificultad al que llegaste.</p>
  </div>
</div>


      <hr className={styles.divider} />

      {/* Consejos */}
      <div className={styles.tipsSection}>
        <h4>🧠 ¿Cómo puedes mejorar?</h4>
        <ul className={styles.tipsList}>
          <li>
            <strong>Planifica antes de actuar:</strong> Antes de hacer clic, lee todas las palabras. Visualiza sujeto, verbo y complementos.
          </li>
          <li>
            <strong>Aísla los distractores:</strong> Si no encaja, probablemente distrae. Construye primero con el núcleo.
          </li>
          <li>
            <strong>Actúa con confianza:</strong> Cuando estés seguro, confirma rápido para no perder tiempo.
          </li>
        </ul>
      </div>

      <div className={styles.resultsActions}>
        <button onClick={() => navigate("/games")} className={styles.checkButton}>
            Ver otros juegos
          </button>
      </div>
    </div>
  </div>
);

  }



  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <h1 className={styles.gameTitle}>
          {gameInfo?.game_info?.name || "Lector de Cosmos"} (Nivel{" "}
          {gameInfo?.level_number})
        </h1>
        <div className={styles.livesContainer}>Vidas: {"❤️".repeat(lives)}</div>
      </div>

      <div className={styles.sentenceBuilder}>
        <h3 className={styles.builderTitle}>Tu Oración:</h3>
        <div className={styles.selectedWordsArea}>
          {selectedWords.length === 0 ? (
            <span className={styles.placeholderText}>
              Haz clic en las palabras para construir tu oración
            </span>
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

        <div ref={containerRef} className={styles.floatingArea}>
          {/* Astronauta centrado abajo. Imagen en /public/Astronauta.png */}
          <img src="/Astronauta.png" alt="Astronauta" className={styles.astro} />

          {wordBodies.map((b) => (
            <button
              key={b.id}
              className={`${styles.wordButton} ${styles.floatingWord}`}
              onClick={() => handleFloatingWordClick(b.id)}
              style={{ transform: `translate(${b.x}px, ${b.y}px)` }}
              disabled={isCorrect === true || gameOver}
            >
              {b.text}
            </button>
          ))}
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
          <p
            className={`${styles.feedbackMessage} ${
              isCorrect ? styles.correct : styles.incorrect
            }`}
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}

export default LectorDeCosmos;
