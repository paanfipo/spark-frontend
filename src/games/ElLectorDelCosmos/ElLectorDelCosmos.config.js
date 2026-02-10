export const lectorDelCosmosConfig = {
  
  // 1. Configuración de Instrucciones + MINITUTORIAL
  instructions: {
    title: "El Lector del Cosmos",
    subtitle: "Ordena las palabras estelares para reconstruir el mensaje perdido.",
    chips: ['Sintaxis', 'Comprensión'],
    heroImage: "/images/cosmos_hero.png",
    background: "radial-gradient(circle, #1b2735 0%, #090a0f 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Procesamiento sintáctico y atención selectiva: la capacidad de estructurar ideas ignorando información irrelevante."
      },
      {
        title: "Sugerencias",
        content: "Lee todas las palabras antes de empezar. Identificar el verbo te ayudará a saber qué palabras van antes y después."
      }
    ],
    // ✅ ESTO ES LO QUE HACE QUE APAREZCA EL MINITUTORIAL
    tutorial: {
      gameId: 'el-lector-del-cosmos',
      startLabel: '¡Iniciar Misión!',
      steps: [
        {
          title: 'Analiza las palabras',
          body: 'Verás palabras flotando en el espacio. Algunas forman una oración y otras son simples distractores.',
          media: { type: 'img', src: '/tutos/cosmos/step1.png', alt: 'Palabras en el espacio' }
        },
        {
          title: 'Ordena la frase',
          body: 'Toca las palabras en el orden gramatical correcto. La frase se irá armando en el cuadro superior.',
          media: { type: 'gif', src: '/tutos/cosmos/step2.gif', alt: 'Construyendo la frase' }
        },
        {
          title: '¡Cuidado con las trampas!',
          body: 'Si eliges una palabra que no pertenece a la frase o te equivocas de orden, perderás una vida (❤️).',
          media: { type: 'img', src: '/tutos/cosmos/step3.png', alt: 'Vidas y errores' }
        }
      ]
    }
  },

  // 2. Formato de métricas para el Resumen
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const tiempoSeg = (m.tiempo_construccion_ms || 0) / 1000;

    return {
      title: "El Lector del Cosmos",
      subtitle: "¡Mensaje descifrado!",
      summary: [
        { icon: "🎯", label: "Precisión Sintáctica", value: `${nf0.format(m.precision_sintactica)}%` },
        { icon: "⏱️", label: "Tiempo Medio", value: `${tiempoSeg.toFixed(2)}s` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon: "❌",
          label: "Errores de Selección",
          value: nf0.format(m.errores_seleccion),
          helper: "Palabras incorrectas o fuera de orden."
        },
        {
          icon: "🚀",
          label: "Fases Completadas",
          value: nf0.format(m.nivel_final - 1),
          helper: "Número de oraciones armadas correctamente."
        }
      ],
      tips: ["Intenta agrupar mentalmente el sujeto y el predicado antes de hacer clic."],
    };
  },

  // 3. Score para la base de datos
  getScore: (rawMetrics) => {
    return rawMetrics.score || 0;
  }
};