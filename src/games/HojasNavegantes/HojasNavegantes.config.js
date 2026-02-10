export const hojasNavegantesConfig = {
  instructions: {
    title: "Hojas Navegantes",
    subtitle: "Dos colores, dos reglas. ¡Mantén el rumbo!",
    chips: ['Flexibilidad Cognitiva', 'Atención Dividida', 'Control Inhibitorio'],
    heroImage: "/hojas_hero.png",
    infoCards: [
      {
        title: "¿Cómo jugar?",
        content: "Si la hoja es NARANJA: ¿Hacia dónde se mueve? Si la hoja es VERDE: ¿Hacia dónde apunta la punta de la hoja?"
      }
    ],
    tutorial: {
      gameId: 'hojas-navegantes',
      steps: [
        {
          title: 'Hoja Naranja',
          body: 'Ignora hacia dónde apunta la hoja, solo mira su trayectoria en la pantalla.',
          media: { type: 'video', src: '/tutos/hojas/naranja.mp4' }
        },
        {
          title: 'Hoja Verde',
          body: 'Ignora hacia dónde se mueve, fíjate en la punta del dibujo.',
          media: { type: 'video', src: '/tutos/hojas/verde.mp4' }
        }
      ]
    }
  },

  formatMetrics: (results) => {
    return {
      metrics: [
        {
          label: "Costo de Cambio",
          value: `${results.costo_cambio_ms} ms`,
          description: "Tiempo extra invertido al procesar un cambio de color/regla."
        },
        {
          label: "Precisión en Cambios",
          value: `${results.precision_cambio}%`,
          description: "Efectividad justo después de que la regla cambia."
        },
        {
          label: "Errores Perseverativos",
          value: `${results.tasa_perseverativos}%`,
          description: "Veces que usaste la regla del color anterior."
        },
        {
          label: "Tiempo Base",
          value: `${results.tiempo_sin_cambio} ms`,
          description: "Velocidad media cuando el color de la hoja se repite."
        }
      ]
    };
  },

  getScore: (results) => results.score || 0
};

export const gameSettings = {
  startingLives: 3,
  directions: ['left', 'right'],
  colors: {
    NARANJA: '#e67e22', // Regla: Movimiento
    VERDE: '#27ae60'    // Regla: Punta
  }
};

export const levelsData = [
  { id: 1, trials: 10, speed: 2, switchProb: 0.2 },
  { id: 2, trials: 15, speed: 4, switchProb: 0.5 },
  { id: 3, trials: 25, speed: 6, switchProb: 0.8 }
];
