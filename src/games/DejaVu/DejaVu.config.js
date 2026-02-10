// src/games/DejaVu/DejaVu.config.js

export const dejaVuConfig = {
  
  // 1. Configuración para <Instrucciones />
  instructions: {
    title: "Deja Vú",
    subtitle: "Distingue las figuras nuevas de las ya vistas.",
    chips: ['Memoria', 'Reconocimiento', 'Discriminación'],
    heroImage: "/Presentacion/deja_vu.png", 
    background: "linear-gradient(135deg, #232526 0%, #414345 100%)",
    
    infoCards: [
      { 
        title: 'Qué entrenas', 
        content: 'Memoria de reconocimiento visual, discriminación de estímulos y control inhibitorio para evitar falsas alarmas.' 
      },
      { 
        title: 'Sugerencias',  
        content: 'Confía en tu primera impresión de "familiaridad". No intentes recordar activamente, solo reconoce.' 
      }
    ],

    tutorial: {
      gameId: 'deja-vu',
      startLabel: '¡A memorizar!',
      steps: [
        { title: '1. Memoriza', body: 'Observa y memoriza la secuencia de figuras.', media: { type:'gif', src:'/tutos/deja-vu/step1.gif', alt:'Figuras apareciendo' } },
        { title: '2. Prueba',    body: 'Luego, te mostraremos figuras una por una.', media: { type:'img', src:'/tutos/deja-vu/step2.gif', alt:'Figura de prueba' } },
        { title: '3. Decide',   body: 'Responde "Sí" si la viste en la secuencia, o "No" si es nueva.', media: { type:'gif', src:'/tutos/deja-vu/step3.gif', alt:'Clic en Sí y No' } },
      ]
    }
  },

  // 2. Función para formatear <ResumenMetricas />
  // (Basada 100% en las métricas de tu tabla)
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics;
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tiempoSeg = (m.tiempo_reaccion_promedio_ms || 0) / 1000;

    return {
      title: 'Deja Vú',
      subtitle: 'Reporte de Reconocimiento',

      // 🔹 MÉTRICAS PRINCIPALES
      summary: [
        {
          icon: '🎯',
          label: 'Precisión de Reconocimiento',
          value: `${nf2.format(m.precision_reconocimiento_pct || 0)} %`,
          helper: 'Porcentaje total de respuestas correctas.'
        },
        {
          icon: '⏱️',
          label: 'Tiempo Medio de Respuesta',
          value: `${nf2.format(tiempoSeg)} s`,
          helper: 'Tiempo promedio empleado para decidir.'
        }
      ],

      // 🔹 MÉTRICAS SECUNDARIAS
      metrics: [
        {
          icon: '❌',
          label: 'Errores de Comisión',
          value: nf0.format(m.errores_comision || 0),
          helper: 'Responder “Sí” ante una figura no presentada.'
        },
        {
          icon: '🚫',
          label: 'Errores de Omisión',
          value: nf0.format(m.errores_omision || 0),
          helper: 'Responder “No” ante una figura previamente vista.'
        }
      ],

      tips: [
        'Una alta precisión indica buen reconocimiento visual.',
        'Los errores de comisión y omisión reflejan distintos tipos de fallos de memoria.'
      ]
    };
  },


  // 3. Función para calcular el puntaje
  getScore: (rawMetrics) => {
    const m = rawMetrics;

    const precisionScore = (m.precision_reconocimiento_pct || 0) * 100;
    const timePenalty = (m.tiempo_reaccion_promedio_ms || 1000) * 0.05;
    const errorPenalty =
      ((m.errores_comision || 0) + (m.errores_omision || 0)) * 50;

    const totalScore = precisionScore - timePenalty - errorPenalty;

    return Math.max(0, Math.round(totalScore));
  }

};