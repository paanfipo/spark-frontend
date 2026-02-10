export const mosaicoEspejoConfig = {
  // 1. Configuración para el componente de Instrucciones
  instructions: {
    title: "Mosaico Espejo",
    subtitle: "Replica el patrón de colores en la cuadrícula vacía.",
    chips: ['Praxia Constructiva', 'Percepción Visual'],
    heroImage: "/mosaico_hero.png",
    background: "linear-gradient(135deg, #2c3e50 0%, #000000 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "La capacidad de organizar elementos en el espacio para replicar un modelo visual complejo."
      },
      {
        title: "Sugerencias",
        content: "Trabaja por filas o columnas para mantener el orden y evitar errores de posición."
      }
    ],
    tutorial: {
      gameId: 'mosaico-espejo',
      startLabel: '¡Comenzar!',
      steps: [
        {
          title: 'Observa el modelo',
          body: 'A la izquierda verás un patrón de colores ya definido.',
          media: { type: 'img', src: '/tutos/mosaico/modelo.png', alt: 'Modelo de referencia' }
        },
        {
          title: 'Pinta el mosaico',
          body: 'Haz clic varias veces sobre una misma celda de la derecha para alternar entre los colores disponibles hasta encontrar el correcto.',
          media: { type: 'gif', src: '/tutos/mosaico/pintar.gif', alt: 'Mecánica de clic' }
        },
        {
          title: 'Precisión total',
          body: 'Evita clics innecesarios o colores incorrectos para mantener tu índice de eficiencia alto.',
          media: { type: 'img', src: '/tutos/mosaico/precision.png', alt: 'Métricas de precisión' }
        }
      ]
    }
  },

  // 2. Formateador de métricas para <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics || {};
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Mosaico Espejo",
      subtitle: "¡Construcción completada!",
      summary: [
        { icon: "🎯", label: "Precisión de Reconstrucción", value: `${nf2.format(m.precision_reconstruccion_visoespacial || 0)} %` },
        { icon: "⏱️", label: "Tiempo Total", value: `${nf2.format(m.tiempo_total_construccion_s || 0)} s` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score || 0) },
      ],
      metrics: [
        { icon: "📍", label: "Errores de Posición", value: nf0.format(m.errores_posicion_recuento || 0), helper: "Clics en celdas que deberían estar vacías." },
        { icon: "🎨", label: "Errores de Color", value: nf0.format(m.errores_color_recuento || 0), helper: "Veces que se usó un color equivocado." },
        { icon: "⚡", label: "Índice de Eficiencia", value: nf2.format(m.indice_eficiencia_visoconstructiva || 0), helper: "Relación entre precisión y velocidad." },
      ],
      tips: [
        "Intenta memorizar secciones del patrón para ir más rápido.",
        "Asegúrate del color antes de hacer clic para evitar penalizaciones."
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
    id: "MOS-L01",
    gridSize: 3,
    colors: ["#FF5733", "#33FF57"], // Rojo y Verde
    pattern: [
      "#FF5733", null,      "#FF5733",
      null,      "#33FF57", null,
      "#FF5733", null,      "#FF5733"
    ]
  },
  {
    id: "MOS-L02",
    gridSize: 4,
    colors: ["#3498db", "#f1c40f"], // Azul y Amarillo
    pattern: [
      "#3498db", null,      null,      "#3498db",
      null,      "#f1c40f", "#f1c40f", null,
      null,      "#f1c40f", "#f1c40f", null,
      "#3498db", null,      null,      "#3498db"
    ]
  },
  {
    id: "MOS-L03",
    gridSize: 5,
    colors: ["#9b59b6", "#2ecc71", "#e67e22"],
    pattern: [
      "#9b59b6", null,      "#9b59b6", null,      "#9b59b6",
      null,      "#2ecc71", null,      "#2ecc71", null,
      "#e67e22", "#e67e22", "#e67e22", "#e67e22", "#e67e22",
      null,      "#2ecc71", null,      "#2ecc71", null,
      "#9b59b6", null,      "#9b59b6", null,      "#9b59b6",
    ]
  }
];