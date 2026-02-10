export const comparacionDeColoresConfig = {
  instructions: {
    title: "Comparación de Colores",
    subtitle: "No te dejes engañar por el color de la tinta.",
    chips: ['Inhibición', 'Atención Selectiva', 'Velocidad de Procesamiento'],
    heroImage: "/colores_hero.png",
    infoCards: [
      {
        title: "¿En qué consiste?",
        content: "Debes comparar el SIGNIFICADO de la palabra con el COLOR del parche. Ignora el color de la tinta con la que está escrita la palabra."
      }
    ],
    tutorial: {
      gameId: 'comparacion-colores',
      steps: [
        {
          title: 'Lee la palabra',
          body: 'Si dice "ROJO", busca un parche rojo, sin importar si la palabra está escrita en verde.',
          media: { type: 'img', src: '/tutos/colores/step1.png', alt: 'Ejemplo congruente e incongruente' }
        }
      ]
    }
  },

  // ✅ MÉTRICAS SOLICITADAS
  formatMetrics: (results) => {
    return {
      metrics: [
        {
          label: "Aciertos Incongruentes",
          value: `${results.precision_incongruente}%`,
          description: "Precisión cuando la tinta y el significado de la palabra no coinciden."
        },
        {
          label: "Tiempo de Reacción",
          value: `${results.tiempo_reaccion_ms} ms`,
          description: "Tiempo medio de respuesta en ensayos correctos."
        },
        {
          label: "Errores de Comisión",
          value: results.errores_comision,
          description: "Veces que respondiste incorrectamente."
        },
        {
          label: "Errores de Omisión",
          value: results.errores_omision,
          description: "Ensayos en los que se agotó el tiempo sin responder."
        }
      ]
    };
  },

  getScore: (results) => results.score || 0
};

export const gameSettings = {
  startingLives: 3,
  maxResponseTime: 2500, // Tiempo límite por ensayo
  colors: [
    { name: 'ROJO', hex: '#e74c3c' },
    { name: 'AZUL', hex: '#3498db' },
    { name: 'VERDE', hex: '#2ecc71' },
    { name: 'AMARILLO', hex: '#f1c40f' },
    { name: 'ROSA', hex: '#e91e63' }
  ]
};

export const levelsData = [
  { id: 1, trials: 10, incongruenceProb: 0.2, description: "Mayormente congruente" },
  { id: 2, trials: 15, incongruenceProb: 0.5, description: "Equilibrio de interferencia" },
  { id: 3, trials: 25, incongruenceProb: 0.8, description: "Conflicto cognitivo alto" }
];