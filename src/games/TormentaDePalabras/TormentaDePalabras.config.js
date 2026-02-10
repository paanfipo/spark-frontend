export const tormentaDePalabrasConfig = {
  
  // 1. Configuración de Instrucciones + MINITUTORIAL
  instructions: {
    title: "Tormenta de Palabras",
    subtitle: "Escribe todas las palabras que puedas con la letra indicada.",
    chips: ['Fluidez Léxica', 'Memoria'],
    heroImage: "/images/tormenta_hero.png",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    infoCards: [
      {
        title: "¿Qué entrenas?",
        content: "Fluidez léxica y memoria semántica: la velocidad para encontrar palabras dentro de una categoría específica en tu cerebro."
      },
      {
        title: "Reglas de oro",
        content: "No se permiten nombres propios ni repetir palabras que ya hayas escrito. ¡Usa solo palabras reales!"
      }
    ],
    // ✅ ESTO ES LO QUE ESTABA FALTANDO PARA CARGAR EL TUTORIAL
    tutorial: {
      gameId: 'tormenta-de-palabras',
      startLabel: '¡Comenzar Tormenta!',
      steps: [
        {
          title: 'Atento a la letra',
          body: 'Al iniciar, se te asignará una letra en la parte superior. Todas tus palabras deben empezar con ella.',
          media: { type: 'img', src: '/tutos/tormenta/step1.png', alt: 'Letra asignada' }
        },
        {
          title: 'Escribe y envía',
          body: 'Escribe la palabra en el cuadro central y presiona la tecla ENTER para validarla.',
          media: { type: 'gif', src: '/tutos/tormenta/step2.gif', alt: 'Escribiendo palabras' }
        },
        {
          title: 'Cuidado con los errores',
          body: 'Si escribes una palabra que no empieza con la letra o no existe, perderás una vida (❤️). Tienes 60 segundos.',
          media: { type: 'img', src: '/tutos/tormenta/step3.png', alt: 'Tiempo y vidas' }
        }
      ]
    }
  },

  // 2. Formato de métricas (Se mantiene igual)
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Tormenta de Palabras",
      subtitle: "¡Tiempo agotado!",
      summary: [
        { icon: "✍️", label: "Palabras Válidas", value: nf0.format(m.total_validas) },
        { icon: "⚡", label: "Palabras por Minuto", value: nf2.format(m.tasa_produccion) },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        { icon: "⏱️", label: "Latencia Inicial", value: `${nf0.format(m.latencia_inicial)} ms`, helper: "Tiempo hasta la primera palabra." },
        { icon: "🔄", label: "Perseveraciones", value: nf0.format(m.perseveraciones), helper: "Palabras repetidas." },
        { icon: "🚫", label: "Errores de Comisión", value: nf0.format(m.errores_comision), helper: "Palabras que no cumplían la regla." }
      ],
      tips: ["Intenta pensar en categorías: animales, objetos, verbos...", "No te bloquees con una palabra, pasa a la siguiente."],
    };
  },

  // 3. Score (Se mantiene igual)
  getScore: (rawMetrics) => rawMetrics.score || 0
};