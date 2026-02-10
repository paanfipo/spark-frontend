export const trazosConectadosConfig = {
  instructions: {
    title: "Trazos Conectados",
    subtitle: "Conecta los puntos en orden para recrear la figura.",
    chips: ['Coordinación', 'Planificación'],
    heroImage: "/trazos_hero.png",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "La capacidad de secuenciación y organización motriz fina, fundamental para la escritura y la construcción de formas complejas."
      },
      {
        title: "Sugerencias",
        content: "Observa la figura completa antes de empezar. Un error de secuencia puede desviar todo el trazo final."
      }
    ],
    tutorial: {
      gameId: 'trazos-conectados',
      steps: [
        {
          title: 'Encuentra el inicio',
          body: 'Haz clic en el primer punto para comenzar tu trazo.',
          media: { type: 'img', src: '/tutos/trazos/step1.png', alt: 'Punto de inicio' }
        },
        {
          title: 'Sigue la secuencia',
          body: 'Debes unir los puntos de forma continua. Si te saltas uno o eliges el incorrecto, sonará un error.',
          media: { type: 'gif', src: '/tutos/trazos/trazado.gif', alt: 'Trazado continuo' }
        }
      ]
    }
  },


  formatMetrics: (rawMetrics) => {
    const m = rawMetrics || {};
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const precision = m.indice_precision_visoconstructiva || 0;
    const tiempoSeg = (m.tiempo_total_trazado_ms || 0) / 1000;

    return {
      title: "Trazos Conectados",
      subtitle: "¡Figura completada con éxito!",
      summary: [
        { icon: "🎯", label: "Precisión de Trazado", value: `${nf2.format(precision)} %` },
        { icon: "⏱️", label: "Tiempo Total", value: `${nf2.format(tiempoSeg)} s` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score || 0) },
      ],
      metrics: [
        { icon: "❌", label: "Errores de Conexión", value: nf0.format(m.errores_conexion_recuento || 0), helper: "Veces que se unieron puntos fuera de orden." },
        { icon: "📐", label: "Desviación Espacial", value: nf2.format(m.desviacion_espacial_promedio || 0), helper: "Estimación de la precisión en el recorrido del trazo." },
        { icon: "📏", label: "Precisión (IPV)", value: `${nf2.format(precision)} %`, helper: "Eficacia constructiva basada en aciertos." },
      ],
      tips: [
        "Analiza la figura completa antes de realizar el primer trazo.",
        "Mantén la calma para evitar clics accidentales en puntos distractores."
      ],
    };
  },

  getScore: (rawMetrics) => {
    return rawMetrics?.score || 0;
  },
};

export const gameSettings = {
  startingLives: 3,
};

export const levelsData = [
  {
    id: "TRAZ-L1",
    showNumbers: true,
    points: [
      { x: 100, y: 100 }, { x: 300, y: 100 }, 
      { x: 300, y: 300 }, { x: 100, y: 300 }
    ],
    sequence: [0, 1, 2, 3, 0] // Un cuadrado
  },
  {
    id: "TRAZ-L2",
    showNumbers: false,
    points: [
      { x: 200, y: 50 }, { x: 350, y: 300 }, 
      { x: 50, y: 300 }, { x: 100, y: 150 } // Distractor
    ],
    sequence: [0, 1, 2, 0] // Un triángulo sin distractor
  },
  // Añadir al array levelsData en TrazosConectados.config.js
{
  id: "TRAZ-L3",
  showNumbers: false, // Mayor dificultad: sin números
  points: [
    { x: 200, y: 50 },  // 0: Techo punta
    { x: 350, y: 150 }, // 1: Esquina superior derecha
    { x: 350, y: 350 }, // 2: Esquina inferior derecha
    { x: 50, y: 350 },  // 3: Esquina inferior izquierda
    { x: 50, y: 150 },  // 4: Esquina superior izquierda
    { x: 200, y: 200 }, // 5: PUNTO DISTRACTOR (No debe tocarse)
  ],
  sequence: [0, 1, 2, 3, 4, 0] // Contorno de la casa
}
];