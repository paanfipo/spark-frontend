export const aFinConfig = {
  instructions: {
    title: "Afin",
    subtitle: "Precisión semántica e inhibición.",
    chips: ['Léxico', 'Inhibición', 'Velocidad'],
    heroImage: "/afin_hero.png",
    background: "var(--afin-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))",
    infoCards: [
      {
        title: "Relación Semántica",
        content: "Selecciona la palabra que tenga la mayor afinidad con el objetivo central."
      },
      {
        title: "Evita la Confusión",
        content: "Cuidado: algunas opciones se parecen pero no son equivalentes. ¡No te dejes engañar!"
      }
    ],
    tutorial: {
      gameId: 'afin',
      startLabel: '¡Comenzar Reto!',
      steps: [
        {
          title: 'Palabra Objetivo',
          body: 'Verás una palabra destacada en el centro.',
          media: { type: 'img', src: '/tutos/afin/paso1.png', alt: 'Objetivo' }
        },
        {
          title: 'Elige la Afín',
          body: 'Selecciona la opción correcta antes de que se agote la barra de tiempo.',
          media: { type: 'img', src: '/tutos/afin/paso2.png', alt: 'Opciones' }
        }
      ]
    }
  },

  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Afin",
      subtitle: m.precision_semantica > 80 ? "¡Excelente precisión léxica!" : "Sigue practicando tu vocabulario",
      summary: [
        { icon: "🎯", label: "Precisión Semántica", value: `${nf0.format(m.precision_semantica)} %` },
        { icon: "⚡", label: "Tiempo Medio", value: `${nf2.format(m.tiempo_medio_ms / 1000)} s` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon: "🧠",
          label: "Errores de Confusión",
          value: nf0.format(m.errores_confusion),
          helper: "Veces que seleccionaste un distractor semánticamente cercano."
        },
        {
          icon: "🐢",
          label: "Latencia Máxima",
          value: `${nf2.format(m.latencia_maxima_ms / 1000)} s`,
          helper: "Tu tiempo de respuesta más largo."
        }
      ],
      tips: [
        "No selecciones la primera palabra que te suene familiar, analiza el matiz exacto.",
        "A mayor nivel, el tiempo se reduce. Confía en tu primera intuición semántica."
      ],
    };
  },

  getScore: (m) => m.score || 0
};