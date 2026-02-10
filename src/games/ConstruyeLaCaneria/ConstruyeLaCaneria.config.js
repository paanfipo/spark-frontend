export const construyeLaCaneriaConfig = {
  instructions: {
    title: "Construye la Cañería",
    subtitle: "Conecta la fuente de agua con la planta rotando las tuberías.",
    chips: ['Planificación', 'Visoconstrucción'],
    heroImage: "/images/pipes_hero.png",
    background: "linear-gradient(135deg, #2980b9 0%, #2c3e50 100%)",
    infoCards: [
      {
        title: "Tu Misión",
        content: "Haz clic en las piezas para rotarlas. Debes crear un camino continuo desde el grifo hasta la planta."
      },
      {
        title: "Eficiencia",
        content: "Menos movimientos y rotaciones significan una mejor puntuación en tu índice de completitud espacial."
      }
    ],
    tutorial: {
      gameId: 'construye-la-caneria',
      startLabel: '¡Abrir Grifo!',
      steps: [
        {
          title: 'Rota las piezas',
          body: 'Haz clic sobre cualquier tubería para girarla 90 grados hasta que encaje con la siguiente.',
          media: { type: 'gif', src: '/tutos/pipes/step1.gif', alt: 'Rotando tuberías' }
        },
        {
          title: 'Busca la conexión',
          body: 'El camino debe ser ininterrumpido desde el origen hasta el destino.',
          media: { type: 'img', src: '/tutos/pipes/step2.png', alt: 'Camino completo' }
        },
        {
          title: 'Tiempo límite',
          body: 'Tienes un tiempo determinado para completar la conexión antes de que se agote el agua.',
          media: { type: 'img', src: '/tutos/pipes/step3.png', alt: 'Reloj de juego' }
        }
      ]
    }
  },

  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    return {
      title: "Construye la Cañería",
      subtitle: "¡Conexión establecida!",
      summary: [
        { icon: "🧩", label: "Completitud Espacial", value: `${nf0.format(m.indice_completitud)}%` },
        { icon: "⏱️", label: "Tiempo de Resolución", value: `${(m.tiempo_total_ms / 1000).toFixed(2)}s` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        { icon: "🔄", label: "Rotaciones", value: nf0.format(m.num_rotaciones), helper: "Total de giros realizados." },
        { icon: "⚠️", label: "Errores Estructurales", value: nf0.format(m.errores_estructurales), helper: "Intentos de conexión fallidos." }
      ],
      tips: ["Trabaja desde la fuente hacia afuera.", "No rotas piezas al azar, planifica el camino primero."],
    };
  },

  getScore: (rawMetrics) => rawMetrics.score || 0
};