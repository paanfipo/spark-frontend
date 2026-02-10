// src/games/MatrizMemoria/MatrizMemoria.config.js

// Este es el "menú" ligero que tu GamePlayer.jsx importará.
// No importa ningún componente de React, solo contiene texto y funciones.

export const matrizMemoriaConfig = {
  
  // 1. La configuración para <Instrucciones />
  // (Extraída de tu 'if (showInstructions)' en MatrizMemoria.jsx)
  instructions: {
    title: "Matriz de Memoria",
    subtitle: "Observa el patrón de casillas iluminadas y luego reprodúcelo.",
    chips: ['Memoria'],
    heroImage: "/memoria_glow.png",
    background: "var(--mem-gradient)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Memoria visoespacial: retención de posiciones en una matriz, atención sostenida y actualización del patrón."
      },
      {
        title: "Sugerencias",
        content: "Usa agrupamiento (chunking) y repite mentalmente el recorrido del patrón."
      }
    ],
    tutorial: {
      gameId: 'matriz-memoria',
      startLabel: '¡Empezar!',
      steps: [
        {
          title: 'Mira el patrón',
          body: 'Se iluminarán casillas por 1–2 segundos. No puedes interactuar aún.',
          media: { type: 'gif', src: '/tutos/matriz/step1.gif', alt: 'Patrón iluminado' }
        },
        {
          title: 'Retén la forma',
          body: 'Usa chunking: agrupa visualmente el patrón en bloques simples.',
          media: { type: 'img', src: '/tutos/matriz/chunking.png', alt: 'Sugerencia de chunking' }
        },
        {
          title: 'Repite el patrón',
          body: 'Toca las casillas en el mismo orden. Avanza si aciertas; repite si fallas.',
          media: { type: 'gif', src: '/tutos/matriz/step3.gif', alt: 'Repetir patrón' }
        }
      ]
    }
  },

  // 2. La función para formatear <ResumenMetricas />
  // (Extraída de tu función 'endGame' en MatrizMemoria.jsx)
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics;
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tiempoSeg = (m.tiempo_respuesta_promedio_ms || 0) / 1000;

    return {
      title: "Matriz de Memoria",
      subtitle: "¡Te has quedado sin vidas!",
      summary: [
        { icon:"🏆", label:"Nivel Máximo Alcanzado", value: nf0.format(Math.max(1, m.estrellas_obtenidas)) },
        { icon:"🎯", label:"Niveles Completados", value: nf0.format(m.estrellas_obtenidas) },
        { icon:"💰", label:"Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon:"📏",
          label:"Amplitud Visoespacial Máxima",
          value: nf0.format(m.span_visoespacial_max || 0),
          helper:"Mayor número de celdas recordadas sin error."
        },
        {
          icon:"🎯",
          label:"Tasa de Aciertos",
          value: `${nf2.format(m.tasa_aciertos || 0)} %`,
          helper:"Proporción de aciertos sobre el total."
        },
        {
          icon:"⏱️",
          label:"Tiempo de Respuesta",
          value: `${nf2.format(tiempoSeg)} s`,
          helper:"Tiempo promedio por tablero."
        },
        {
          icon:"🚫",
          label:"Errores de Comisión",
          value: nf0.format(m.errores_comision || 0),
          helper:"Selecciones incorrectas."
        },
        {
          icon:"🟨",
          label:"Errores de Omisión",
          value: nf0.format(m.errores_omision || 0),
          helper:"Objetivos no seleccionados."
        },
        {
          icon:"📊",
          label:"Estabilidad del Desempeño",
          value: nf2.format(m.estabilidad_desempeno || 0),
          helper:"Consistencia del rendimiento entre tableros."
        }
      ],
      tips: [ "Observa el patrón completo antes de tocar.", "Agrupa casillas en chunks para recordarlas más fácil." ],
    };
  },

  // 3. La función para calcular el puntaje
  // (Extraída de tu 'axios.patch' en MatrizMemoria.jsx)
  getScore: (rawMetrics) => {
    // El juego ya calcula el score, así que solo lo retornamos
    return rawMetrics.score || 0;
  }
};


export const gameSettings = {
  startingGridSize: 3,      // Empieza fácil (3x3)
  maxGridSize: 6,           // Tope máximo (6x6)
  startingPatternLength: 3, // Empieza iluminando 3 celdas
  showTimeBase: 1000,       // 1 segundo base para ver
  showTimePerItem: 300,     // +0.3s por cada item extra
};