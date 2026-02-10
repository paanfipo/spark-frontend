// src/games/CajaDeRecuerdos/CajaDeRecuerdos.config.js

// Este es el "menú" ligero que tu GamePlayer.jsx importará.
export const cajaDeRecuerdosConfig = {
  
  // 1. La configuración para <Instrucciones />
  instructions: {
    title: "Caja de Recuerdos",
    subtitle: "Memoriza la lista de palabras. Tras cada ronda, selecciona las palabras que recuerdes.",
    chips: ['Memoria', 'Lenguaje'],
    heroImage: "/Presentacion/caja-recuerdos.png", // 
    background: "linear-gradient(135deg, #4B79A1 0%, #283E51 100%)",
    heroImageSize: "740px",
    
    infoCards: [
      { 
        title: 'Qué entrenas', 
        content: 'Memoria episódica verbal y memoria de trabajo. Mide tu capacidad para aprender y consolidar nueva información verbal a través de la repetición (curva de aprendizaje).' 
      },
      { 
        title: 'Sugerencias',  
        content: 'Intenta crear una historia o una imagen mental que conecte las palabras de la lista. La repetición es clave.' 
      }
    ],
    tutorial: {
      gameId: 'caja-de-recuerdos',
      startLabel: '¡A recordar!',
      steps: [
        { title: '1. Observa la Lista', body: 'Aparecerá una lista de 12 palabras, una por una.', media: { type:'gif', src:'/tutos/caja/step1.gif', alt:'Palabras apareciendo' } },
        { title: '2. Selecciona', body: 'Al final de la ronda, verás una cuadrícula. Haz clic en todas las palabras que recuerdes de la lista y presiona "Listo".', media: { type:'gif', src:'/tutos/caja/step2.gif', alt:'Seleccionando palabras' } },
        { title: '3. Repite y Mejora', body: 'Repetirás este proceso 3 veces con la misma lista. ¡Intenta mejorar tu puntuación en cada ronda!', media: { type:'img', src:'/tutos/caja/step3.gif', alt:'Gráfica de mejora' } },
      ]
    }
  },

  // 2. La función para formatear <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const { roundData, listSize } = rawMetrics;

    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf1 = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // Datos por ronda
    const r1_correct = roundData[0]?.correct || 0;
    const r3_correct = roundData[2]?.correct || 0;
    const r3_commission = roundData[2]?.commission || 0;

    // Métricas derivadas (alineadas con BD)
    const recallPercentageR3 = listSize > 0 ? (r3_correct / listSize) * 100 : 0;
    const erroresOmisionR3 = listSize - r3_correct;
    const learningRate = r3_correct - r1_correct;

    return {
      title: 'Caja de Recuerdos',
      subtitle: '¡Juego completado!',
      summary: [
        {
          icon: '🏆',
          label: 'Recuerdo (Ronda 3)',
          value: nf0.format(r3_correct),
        },
        {
          icon: '📊',
          label: 'Porcentaje de Recuerdo (Ronda 3)',
          value: `${nf1.format(recallPercentageR3)} %`,
        },
        {
          icon: '📈',
          label: 'Tasa de Aprendizaje (R3 − R1)',
          value: nf0.format(learningRate),
        },
      ],
      metrics: [
        {
          icon: '❌',
          label: 'Errores de Omisión',
          value: nf0.format(erroresOmisionR3),
          helper: 'Palabras de la lista que no fueron recordadas en la tercera ronda.',
        },
        {
          icon: '🚫',
          label: 'Errores de Comisión (Intrusiones)',
          value: nf0.format(r3_commission),
          helper: 'Palabras seleccionadas que no pertenecían a la lista objetivo.',
        },
      ],
      tips: [
        'El desempeño en la tercera ronda refleja el nivel de aprendizaje verbal consolidado.',
        'Una tasa de aprendizaje positiva indica una mejora progresiva entre rondas.',
      ],
    };
  },


  // 3. La función para calcular el puntaje
  getScore: (rawMetrics) => {
  const r1_correct = rawMetrics.roundData[0]?.correct || 0;
  const r3_correct = rawMetrics.roundData[2]?.correct || 0;

  const learningRate = r3_correct - r1_correct;

  // Score centrado en recuerdo consolidado + mejora
  return (r3_correct * 15) + (learningRate * 10);
}


};