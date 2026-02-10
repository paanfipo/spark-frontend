// src/games/RutaDeLuces/RutaLuces.config.js

export const rutaDeLucesAlRevesConfig = {
  // 1. La configuración para <Instrucciones /> (IGUAL A MATRIZ)
  instructions: {
    title: "Ruta de Luces",
    subtitle: "Observa la secuencia de círculos iluminados y reprodúcela en orden INVERSO.",
    chips: ['Memoria'],
    heroImage: "/luces_hero.png", // Asegúrate de tener una imagen o usa una genérica
    background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Memoria de trabajo visoespacial: manipulación mental de secuencias, atención sostenida y actualización del patrón."
      },
      {
        title: "Sugerencias",
        content: "Visualiza la ruta completa antes de empezar y utiliza el repaso mental del último al primero."
      }
    ],
    tutorial: {
      gameId: 'ruta-de-luces',
      startLabel: '¡Jugar!',
      steps: [
        {
          title: 'Mira la ruta',
          body: 'Se iluminarán varios círculos en una secuencia específica.',
          media: { type: 'img', src: '/tutos/luces/step1.png', alt: 'Secuencia' }
        },
        {
          title: 'Invierte el orden',
          body: 'Mentalmente, dale la vuelta a la secuencia que acabas de ver.',
          media: { type: 'img', src: '/tutos/luces/step2.png', alt: 'Inversión mental' }
        },
        {
          title: 'Repite al revés',
          body: 'Toca los círculos desde el último que brilló hasta el primero.',
          media: { type: 'img', src: '/tutos/luces/step3.png', alt: 'Repetir inverso' }
        }
      ]
    }
  },

  // 2. La función para formatear <ResumenMetricas />
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Ruta de Luces",
      subtitle: "¡Excelente esfuerzo!",
      summary: [
        { icon:"🏆", label:"Amplitud Inversa Máxima", value: nf0.format(m.amplitud_inversa_max) },
        { icon:"🎯", label:"Eficacia", value: `${nf0.format(m.porcentaje_secuencias_correctas)}%` },
      ],
      metrics: [
        {
          icon:"📏",
          label:"Span Inverso",
          value: nf0.format(m.amplitud_inversa_max || 0),
          helper:"Máximo de elementos invertidos correctamente."
        },
        {
          icon:"⏱️",
          label:"Tiempo Total",
          value: `${nf2.format((m.tiempo_total_respuesta_ms || 0) / 1000)} s`,
          helper:"Tiempo invertido en las respuestas."
        },
        {
          icon:"🚫",
          label:"Errores de Orden",
          value: nf0.format(m.errores_orden || 0),
          helper:"Secuencias fallidas por orden incorrecto."
        },
        {
          icon:"🟨",
          label:"Errores de Omisión",
          value: nf0.format(m.errores_omision || 0),
          helper:"Niveles perdidos por inactividad."
        }
      ],
      tips: [ "No te apresures, tómate un segundo para invertir la serie en tu mente.", "Intenta decir los números de la secuencia en voz alta al revés." ],
    };
  },

  getScore: (raw) => Math.round(raw.amplitud_inversa_max * 100),

  // 4. Parámetros de niveles (que usa el componente .jsx)
  levels: {
    1: { name: 'Básico', circles: 8, seqLen: 3, speed: 400 },
    2: { name: 'Intermedio', circles: 10, seqLen: 3, speed: 333 },
    3: { name: 'Avanzado', circles: 12, seqLen: 4, speed: 300 }
  }
};