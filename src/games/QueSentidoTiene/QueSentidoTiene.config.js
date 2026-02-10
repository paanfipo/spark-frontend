export const queSentidoTieneConfig = {
  instructions: {
    title: "¿Qué sentido tiene?",
    subtitle: "Clasificación semántica y emocional.",
    chips: ['Léxico', 'Emoción', 'Velocidad'],
    heroImage: "/sentido_hero.png",
    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    infoCards: [
      {
        title: "Usa las Flechas",
        content: "⬅️ Izquierda para palabras NEGATIVAS. ➡️ Derecha para palabras POSITIVAS."
      },
      {
        title: "Rapidez Mental",
        content: "El tiempo se agota rápido. ¡Decide el sentido de la palabra antes de que la barra llegue a cero!"
      }
    ],
    tutorial: {
      gameId: 'que-sentido-tiene',
      startLabel: '¡Comenzar!',
      steps: [
        {
          title: 'Clasifica',
          body: '¿"FELICIDAD" es positiva? ¡Flecha derecha!',
          media: { type: 'img', src: '/tutos/sen/paso1.png', alt: 'Positivo' }
        }
      ]
    }
  },

  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "¿Qué sentido tiene?",
      subtitle: m.precision_semantica > 85 ? "¡Gran inteligencia emocional!" : "Sigue agudizando tu juicio semántico",
      summary: [
        { icon: "🎯", label: "Precisión Semántica", value: `${nf0.format(m.precision_semantica)}%` },
        { icon: "⚡", label: "Tiempo de Decisión", value: `${nf2.format(m.tiempo_medio_ms / 1000)}s` },
        { icon: "🏆", label: "Puntaje", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon: "❌",
          label: "Errores de Clasificación",
          value: nf0.format(m.errores_recuento),
          helper: "Total de palabras clasificadas incorrectamente."
        },
        {
          icon: "📊",
          label: "Variabilidad (Desv. Est.)",
          value: `${nf0.format(m.variabilidad_ms)} ms`,
          helper: "Mide qué tan constante fuiste en tus respuestas."
        }
      ],
      tips: ["Confía en tu primera reacción emocional.", "No dudes en las palabras ambiguas, el tiempo es oro."],
    };
  },
  getScore: (m) => m.score || 0
};