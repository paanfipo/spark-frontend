// src/games/SopaDeLetras/SopaDeLetras.config.js

export const sopaDeLetrasConfig = {
  
  // 1. Configuración de la pantalla de bienvenida y tutorial
  instructions: {
    title: "Sopa de Letras",
    subtitle: "Rastreo visual y reconocimiento léxico.",
    chips: ['Atención focalizada', 'Rastreo'],
    heroImage: "/sopa_letras_hero.png",
    background: "var(--sopa-gradient)",
    infoCards: [
      {
        title: "Tu Misión",
        content: "Encuentra todas las palabras ocultas en la cuadrícula antes de que se agote el tiempo."
      },
      {
        title: "Control",
        content: "Haz clic en cada letra para ir formando la palabra. Si te equivocas, la selección se borrará tras 8 intentos."
      }
    ],
    tutorial: {
      gameId: 'sopa-de-letras',
      startLabel: '¡Comenzar búsqueda!',
      steps: [
        {
          title: 'Busca la palabra',
          body: 'Mira la lista en la parte inferior y busca las letras en el tablero.',
          media: { type: 'img', src: '/tutos/sopa/paso1.png', alt: 'Lista de palabras' }
        },
        {
          title: 'Marca las letras',
          body: 'Toca las letras en orden. Si la palabra es correcta, cambiará de color permanentemente.',
          media: { type: 'gif', src: '/tutos/sopa/paso2.gif', alt: 'Selección de letras' }
        }
      ]
    }
  },

  // 2. Formateador de métricas para el Resumen Final
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Sopa de Letras",
      subtitle: m.total_aciertos === 5 ? "¡Excelente rastreo visual!" : "¡Tiempo agotado!",
      summary: [
        { icon: "📝", label: "Palabras Encontradas", value: nf0.format(m.total_aciertos) },
        { icon: "🎯", label: "Precisión Léxica", value: `${nf2.format(m.indice_precision)} %` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon: "⏱️",
          label: "Tiempo Medio de Localización",
          value: `${nf0.format(m.tiempo_medio_ms / 1000)} s`,
          helper: "Promedio de tiempo por cada palabra encontrada."
        },
        {
          icon: "💡",
          label: "Uso de Ayudas",
          value: nf0.format(m.uso_ayudas),
          helper: "Cantidad de veces que solicitaste una pista."
        },
        {
          icon: "🚫",
          label: "Errores de Comisión",
          value: nf0.format(m.errores_comision),
          helper: "Intentos fallidos al seleccionar letras incorrectas."
        },
        {
          icon: "🟨",
          label: "Errores de Omisión",
          value: nf0.format(m.errores_omision),
          helper: "Palabras que no lograste encontrar."
        }
      ],
      tips: [
        "Intenta rastrear por filas de izquierda a derecha.",
        "Busca primero las letras menos comunes (como X, Z o Q) para hallar las palabras rápido."
      ],
    };
  },

  // 3. Obtención del score para el ranking global
  getScore: (m) => m.score || 0
};