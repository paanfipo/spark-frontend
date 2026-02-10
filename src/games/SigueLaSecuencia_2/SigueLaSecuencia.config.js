// src/games/SigueLaSecuencia/SigueLaSecuencia.config.js

// Este es el "menú" ligero que tu GamePlayer.jsx importará.
// Contiene toda la información específica de este juego.

export const sigueLaSecuenciaConfig = {
  
  // 1. La configuración para <Instrucciones />
  // (Extraída de tu 'if (showInstructions)' en SigueLaSecuencia.jsx)
  instructions: {
    title: "Sigue la Secuencia",
    subtitle: "Observa la secuencia de números que se ilumina y luego repítela en el mismo orden.",
    chips: ['Memoria'],
    heroImage: "/Presentacion/numeros_rain.png",
    background: "linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)",
    heroImageSize: "750px",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Memoria visoespacial secuencial: retención del orden en que aparecen los estímulos. Mejora la memoria a corto plazo y la atención sostenida."
      },
      {
        title: "Sugerencias",
        content: "Agrupa los números en bloques (chunking) y repite la secuencia en voz alta o mentalmente."
      }
    ],
    tutorial: {
      gameId: 'sigue-la-secuencia',
      startLabel: '¡Entendido!',
      steps: [
        {
          title: 'Observa la Secuencia',
          body: 'Algunos círculos se iluminarán uno tras otro. ¡Memoriza el orden!',
          media: { type: 'gif', src: '/tutos/secuencia/step1.gif', alt: 'Secuencia iluminándose' }
        },
        {
          title: 'Repite el Orden',
          body: 'Cuando terminen de iluminarse, haz clic en los mismos círculos y en el mismo orden.',
          media: { type: 'gif', src: '/tutos/secuencia/step2.gif', alt: 'Usuario repitiendo la secuencia' }
        },
        {
          title: '¡Avanza!',
          body: 'Si aciertas, la secuencia será más larga. Si fallas, tendrás un reintento. ¡Concéntrate!',
          media: { type: 'img', src: '/tutos/secuencia/step3.png', alt: 'Indicador de nivel subiendo' }
        }
      ]
    }
  },

  // 2. La función para formatear <ResumenMetricas />
  // (Extraída de tu función 'handleGameEnd' en SigueLaSecuencia.jsx)
  formatMetrics: (rawMetrics) => {
    const { totalAciertos, reintentos, tiemposRespuesta, maxSpan, stage, erroresComision, erroresOmision } = rawMetrics;
    
    const totalEnsayos = totalAciertos + reintentos;
    const tasaExito = totalEnsayos > 0 ? (totalAciertos / totalEnsayos) * 100 : 0;
    const tiempoPromedioMs = tiemposRespuesta.length
      ? tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length
      : 0;

    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf1 = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tiempoSeg = tiempoPromedioMs / 1000;

    return {
      title: 'Sigue la Secuencia',
      subtitle: '¡Juego finalizado!',
      summary: [
        { icon: '🏆', label: 'Amplitud Máxima (Span)', value: nf0.format(maxSpan) },
        { icon: '🎯', label: 'Nivel Máximo Alcanzado', value: nf0.format(stage) },
        { icon: '✅', label: 'Total Aciertos', value: nf0.format(totalAciertos) },
      ],
      metrics: [
        { icon: '📊', label: 'Tasa de Éxito', value: `${nf1.format(tasaExito)} %`, helper: 'Porcentaje de secuencias correctas del total intentado.' },
        { icon: '⏱️', label: 'Tiempo Promedio / Acierto', value: `${nf2.format(tiempoSeg)} s`, helper: 'Velocidad media para completar secuencias correctas.' },
        { icon: '🚫', label: 'Errores de Comisión', value: nf0.format(erroresComision), helper: 'Clicaste un número incorrecto en la secuencia.' },
        { icon: '…', label: 'Errores de Omisión', value: nf0.format(erroresOmision), helper: 'No completaste la secuencia (si aplica).' },
        { icon: '🔄', label: 'Reintentos Usados', value: nf0.format(reintentos), helper: 'Veces que fallaste el primer intento en un nivel.' },
      ],
      tips: ["Agrupa los números en bloques (chunking).", "Repite la secuencia mentalmente mientras la ves."],
    };
  },

  // 3. La función para calcular el puntaje
  // (Extraída de tu 'axios.patch' en SigueLaSecuencia.jsx)
  getScore: (rawMetrics) => {
    return (rawMetrics.totalAciertos || 0) * 10;
  }
};