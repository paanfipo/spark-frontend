// src/games/MatricesProgresivas/MatricesProgresivas.config.js

export const matricesProgresivasConfig = {

  instructions: {
    title: "Matrices progresivas",
    subtitle: "Identifica la regla lógica y completa la matriz.",
    chips: ['Funciones ejecutivas', 'Razonamiento', 'Lógica'],
    heroImage: "/Presentacion/matrices_progresivas.png",
    background: "var(--fe-gradient)",

    infoCards: [
      {
        title: 'Qué entrenas',
        content:
          'Razonamiento inductivo abstracto, análisis de patrones y toma de decisiones basada en reglas.'
      },
      {
        title: 'Sugerencias',
        content:
          'Busca relaciones entre filas y columnas. Evita responder por intuición visual.'
      }
    ],

    // ✅ EL TUTORIAL VA AQUÍ
    tutorial: {
        gameId: 'matrices-progresivas',
        startLabel: 'Comenzar desafío',
        steps: [
          {
            title: "Paso 1",
            body: "Observa las filas y columnas de la matriz.",
            media: { type: "img", src: "/tutos/progresivas/step1.gif" }
          },
          {
            title: "Paso 2",
            body: "Identifica la regla que se repite o progresa.",
            media: { type: "img", src: "/tutos/progresivas/step2.gif" }
          },
          {
            title: "Paso 3",
            body: "Selecciona la opción que completa la matriz.",
            media: { type: "img", src: "/tutos/progresivas/step3.gif" }
          }
        ]
      }
    },

  formatMetrics: (raw) => {
    const nf2 = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

    return {
      title: 'Matrices progresivas',
      subtitle: 'Reporte de razonamiento abstracto',

      summary: [
        {
          icon: '🧩',
          label: 'Precisión',
          value: `${nf2.format(raw.precision_matrices_pct || 0)} %`,
          helper: 'Porcentaje de matrices resueltas correctamente.'
        },
        {
          icon: '⏱️',
          label: 'Tiempo medio',
          value: `${nf2.format((raw.tiempo_medio_resolucion_ms || 0) / 1000)} s`,
          helper: 'Tiempo promedio por matriz.'
        }
      ],

      metrics: [
        {
          icon: '📈',
          label: 'Nivel máximo alcanzado',
          value: raw.nivel_maximo_complejidad ?? 0,
          helper: 'Máxima complejidad lógica resuelta.'
        },
        {
          icon: '❌',
          label: 'Errores lógicos',
          value: `${nf2.format(raw.tasa_errores_logicos_pct || 0)} %`,
          helper: 'Respuestas incorrectas por inferencia lógica errónea.'
        }
      ],

      tips: [
        'Una alta precisión refleja buen razonamiento inductivo.',
        'Errores lógicos altos indican dificultad para abstraer reglas.'
      ]
    };
  },

  getScore: (raw) => {
    const precision = (raw.precision_matrices_pct || 0) * 100;
    const timePenalty = (raw.tiempo_medio_resolucion_ms || 1000) * 0.04;
    const errorPenalty = (raw.tasa_errores_logicos_pct || 0) * 80;

    return Math.max(0, Math.round(precision - timePenalty - errorPenalty));
  }

};
