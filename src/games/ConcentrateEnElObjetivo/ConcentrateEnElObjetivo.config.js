// src/games/ConcentrateEnElObjetivo/ConcentrateEnElObjetivo.config.js

export const concentrateEnElObjetivoConfig = {

  // 1. Configuración para <Instrucciones />
  instructions: {
    title: "Concéntrate en el objetivo",
    subtitle: "Identifica la flecha objetivo entre distractores y responde con el teclado.",
    chips: ['Atención'],
    heroImage: "/Presentacion/at-01-concentrate-objetivo.png",
    background: "linear-gradient(135deg, #0b1320 0%, #122a44 55%, #0b1320 100%)",
    heroImageSize: "720px",

    infoCards: [
      {
        title: 'Qué entrenas',
        content:
          'Atención selectiva visual bajo interferencia, con control inhibitorio y presión temporal.'
      },
      {
        title: 'Sugerencias',
        content:
          'Fija la atención únicamente en la flecha objetivo e ignora estímulos irrelevantes.'
      }
    ],

    tutorial: {
      gameId: 'concentrate-en-el-objetivo',
      startLabel: 'Comenzar',
      steps: [
        {
          title: '1. Observa el objetivo',
          body: 'Se mostrará una flecha objetivo que debes identificar.'
        },
        {
          title: '2. Responde',
          body: 'Presiona la tecla de dirección correspondiente (↑ ↓ ← →).'
        },
        {
          title: '3. Evita errores',
          body: 'Responder a distractores cuenta como comisión; no responder a tiempo es omisión.'
        }
      ]
    }
  },

  // 2. Formateo para <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const trials = rawMetrics.trials || [];

    const correct = trials.filter(t => t.type === 'correct');
    const commission = trials.filter(t => t.type === 'commission');
    const omission = trials.filter(t => t.type === 'omission');

    const responded = correct.length + commission.length;
    const porcentajeCorrectas = responded > 0 ? (correct.length / responded) * 100 : 0;

    const rtCorrect = correct.map(t => t.rt).filter(v => typeof v === 'number');
    const meanRT =
      rtCorrect.length > 0
        ? rtCorrect.reduce((a, b) => a + b, 0) / rtCorrect.length
        : 0;

    const variance =
      rtCorrect.length > 1
        ? rtCorrect.reduce((a, b) => a + Math.pow(b - meanRT, 2), 0) / (rtCorrect.length - 1)
        : 0;

    const stdRT = Math.sqrt(variance);

    return {
      title: 'Concéntrate en el objetivo',
      subtitle: '¡Juego completado!',
      summary: [
        {
          icon: '🎯',
          label: 'Porcentaje de respuestas correctas',
          value: `${porcentajeCorrectas.toFixed(1)} %`,
        },
        {
          icon: '⏱️',
          label: 'Tiempo medio de respuesta correcta',
          value: `${meanRT.toFixed(0)} ms`,
        },
      ],
      metrics: [
        {
          icon: '🚫',
          label: 'Errores de comisión',
          value: commission.length,
        },
        {
          icon: '❌',
          label: 'Errores de omisión',
          value: omission.length,
        },
        {
          icon: '📉',
          label: 'Variabilidad del tiempo de respuesta',
          value: `${stdRT.toFixed(0)} ms`,
        },
      ],
    };
  },

  // 3. Cálculo de puntaje
  getScore: (rawMetrics) => {
    const trials = rawMetrics.trials || [];
    const correct = trials.filter(t => t.type === 'correct').length;
    const commission = trials.filter(t => t.type === 'commission').length;
    const omission = trials.filter(t => t.type === 'omission').length;

    return Math.max(0, (correct * 10) - (commission * 4) - (omission * 2));
  }

};
