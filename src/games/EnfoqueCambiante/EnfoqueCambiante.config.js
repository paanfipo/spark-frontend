export const enfoqueCambianteConfig = {
  instructions: {
    title: "Enfoque Cambiante",
    subtitle: "Alterna entre reglas rápidamente sin perder la precisión.",
    chips: ['Flexibilidad Cognitiva', 'Inhibición', 'Velocidad de Procesamiento'],
    heroImage: "/enfoque_hero.png", 
    infoCards: [
      {
        title: "Qué entrenas",
        content: "La capacidad de 'set-shifting' o alternancia cognitiva, que te permite cambiar entre diferentes tareas o reglas mentales de forma eficiente."
      },
      {
        title: "Sugerencias",
        content: "Presta atención al color o la etiqueta superior. No te precipites en los ensayos donde la regla cambia, ahí es donde ocurre el 'costo de cambio'."
      }
    ],
    tutorial: {
      gameId: 'enfoque-cambiante',
      startLabel: '¡Comenzar!',
      steps: [
        {
          title: 'Mira la regla',
          body: 'En la parte superior verás qué regla aplicar: ¿Es Vocal? o ¿Es Par?',
          media: { type: 'img', src: '/tutos/enfoque/step1.png', alt: 'Indicador de regla' }
        },
        {
          title: 'Responde rápido',
          body: 'Presiona SÍ o NO según el estímulo que aparezca en la tarjeta central.',
          media: { type: 'gif', src: '/tutos/enfoque/feedback.gif', alt: 'Ejemplo de respuesta' }
        }
      ]
    }
  },

  // ✅ MÉTRICAS ESPECÍFICAS SOLICITADAS
  formatMetrics: (results) => {
  return {
    metrics: [
      {
        label: "Costo de Cambio",
        value: `${results.costo_cambio_ms} ms`,
        description: "Tiempo extra que tarda el cerebro en procesar un cambio de regla."
      },
      {
        label: "Precisión en Cambios",
        value: `${results.precision_cambio_porcentaje}%`,
        description: "Efectividad al responder justo cuando la regla acaba de cambiar."
      },
      {
        label: "Errores Perseverativos",
        value: `${results.tasa_errores_perseverativos}%`,
        description: "Porcentaje de ensayos con cambio de regla en los que respondiste como si siguiera aplicando la regla anterior. Si no ocurrió, el valor puede ser 0%."

      },
      {
        label: "Tiempo Base (Sin cambio)",
        value: `${results.tiempo_medio_sin_cambio_ms} ms`,
        description: "Tu velocidad de reacción cuando la regla se mantiene igual."
      }
    ]
  };
},

  getScore: (results) => {
    // El score se basa principalmente en la precisión de cambio 
    // y se penaliza por el tiempo de respuesta.
    return Math.round(results.score || 0);
  }
};

export const gameSettings = {
  startingLives: 3,
  vowels: ['A', 'E', 'I', 'O', 'U'],
  consonants: ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K'],
  maxResponseTime: 3000 // 3 segundos para responder
};

export const levelsData = [
  {
    id: 1,
    trials: 12,
    switchEvery: 4, // Regla cambia cada 4 intentos (Predecible - Fácil)
    description: "Cambios predecibles"
  },
  {
    id: 2,
    trials: 20,
    switchEvery: 2, // Cambia cada 2 (Más frecuente)
    description: "Alternancia constante"
  },
  {
    id: 3,
    trials: 30,
    switchEvery: null, // Cambio aleatorio (Impredecible - Difícil)
    randomSwitchProb: 0.6
  }
];