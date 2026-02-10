// src/games/MatricesProgresivas/MatricesProgresivas.config.js

export const matricesProgresivasConfig = {
  instructions: {
    title: "Matrices progresivas",
    subtitle:
      "Analiza la matriz incompleta y selecciona la opción que completa correctamente el patrón.",
    chips: ["Razonamiento", "Inducción", "Visoespacial"],
    heroImage: "/assets/matrices/hero_matrices.png", // si no existe, cambie o elimine
    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content:
          "Razonamiento inductivo y analógico (identificación de reglas), con demanda visoespacial para comparar transformaciones (rotación, progresión, superposición, etc.).",
      },
      {
        title: "Sugerencias",
        content:
          "Identifique primero cambios por fila/columna (forma, número, rotación, sombreado). Verifique consistencia cruzada antes de decidir.",
      },
    ],
    tutorial: {
      gameId: "matrices-progresivas",
      startLabel: "¡Empezar!",
      steps: [
        {
          title: "Observa la matriz",
          body:
            "Examina filas y columnas: cambios sistemáticos suelen repetirse con variaciones controladas.",
          media: { type: "img", src: "/assets/matrices/tutorial_step1.png", alt: "Paso 1" },
        },
        {
          title: "Formula la regla",
          body:
            "Prioriza reglas simples (progresión, rotación) y luego compuestas (superposición, XOR visual, conteos).",
          media: { type: "img", src: "/assets/matrices/tutorial_step2.png", alt: "Paso 2" },
        },
        {
          title: "Selecciona una única opción",
          body:
            "Elija la opción que satisface simultáneamente las restricciones por fila y por columna.",
          media: { type: "img", src: "/assets/matrices/tutorial_step3.png", alt: "Paso 3" },
        },
      ],
    },
  },

  formatMetrics: (rawMetrics) => {
    const m = rawMetrics || {};
    const nf0 = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tiempoSeg = (m.tiempo_medio_resolucion_ms || 0) / 1000;

    return {
      title: "Matrices progresivas",
      subtitle: "Fin del juego",
      summary: [
        { icon: "🏆", label: "Nivel máximo", value: nf0.format(m.nivel_maximo_complejidad || 0) },
        { icon: "🎯", label: "Precisión", value: `${nf2.format(m.precision_matrices || 0)} %` },
        { icon: "💰", label: "Puntaje", value: nf0.format(m.score || 0) },
      ],
      metrics: [
        {
          icon: "⏱️",
          label: "Tiempo medio de resolución",
          value: `${nf2.format(tiempoSeg)} s`,
          helper: "Promedio del tiempo por ítem respondido.",
        },
        {
          icon: "🧠",
          label: "Tasa de errores lógicos",
          value: `${nf2.format(m.tasa_errores_logicos || 0)} %`,
          helper: "Errores / intentos totales (porcentaje).",
        },
      ],
      tips: [
        "Verifique simultáneamente la regla por filas y por columnas.",
        "Si hay rotación, cuantifique el ángulo (90°, 180°) y la dirección.",
      ],
    };
  },

  getScore: (rawMetrics) => rawMetrics?.score || 0,
};

export const gameSettings = {
  // vidas estilo MatrizMemoria
  lives: 3,

  // series disponibles en su carpeta: public/assets/matrices/serie_a y serie_b
  seriesOrder: ["serie_a", "serie_b"],

  // número de preguntas por serie 
  questionsPerSeries: {
    serie_a: 3,
    serie_b: 1,
  },

  // opciones por pregunta: pX_op1..pX_opN
  optionsCount: 6, // AJUSTE si sus sets son 3, 4, 6, 8, etc.

  // control de tiempo (si quiere presión temporal por nivel)
  timeLimitByLevelSec: null, // ej: (level) => Math.max(10, 30 - level*2)

  // scoring básico (puede refinar)
  score: {
    baseCorrect: 100,
    levelMultiplier: 15,
    timeBonusMax: 60, // puntos máximos extra por rapidez
  },
};

// src/games/MatricesProgresivas/MatricesProgresivas.config.js

export const ANSWER_KEY = {
  serie_a: {
    1: 4,  // p1 -> opción correcta 4
    2: 1,
    3: 2,
    4: 1,
    // ...
  },
  serie_b: {
    1: 2,
    // ...
  },
};
