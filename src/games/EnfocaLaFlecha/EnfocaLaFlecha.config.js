// src/games/EnfocaLaFlecha/EnfocaLaFlecha.config.js

export const enfocaLaFlechaConfig = {
  instructions: {
    title: "Enfoca la Flecha",
    subtitle: "Indica la dirección del estímulo central ignorando los distractores.",
    chips: ['Atención Selectiva', 'Inhibición', 'Velocidad de Procesamiento'],
    heroImage: "/flecha_hero.png",
    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    infoCards: [
      {
        title: "Control Inhibitorio",
        content: "Debes ignorar las flechas laterales cuando apunten en direcciones opuestas y concentrarte únicamente en la flecha del centro."
      }
    ],
    tutorial: {
      gameId: 'enfoca-la-flecha',
      startLabel: '¡Empezar!',
      steps: [
        {
          title: 'El Objetivo Central',
          body: 'Mira siempre la flecha del centro. Indica su dirección usando las flechas del teclado (⬅️, ➡️, ⬆️, ⬇️).',
          media: { type: 'img', src: '/tutos/flecha/step1.png', alt: 'Flecha central' }
        },
        {
          title: 'Ignora los Distractores',
          body: 'Cuando aparezcan más flechas a los lados, ignóralas. Solo importa la dirección de la que está en medio.',
          media: { type: 'gif', src: '/tutos/flecha/step2.gif', alt: 'Distractores laterales' }
        }
      ]
    }
  },

  formatMetrics: (m) => {
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      title: "Enfoca la Flecha",
      summary: [
        { icon: "🎯", label: "Tasa de Aciertos", value: `${nf2.format(m.tasa_aciertos)}%` },
        { icon: "⏱️", label: "Tiempo de Respuesta", value: `${nf2.format(m.tiempo_respuesta_promedio_ms / 1000)}s` }
      ],
      metrics: [
        { icon: "🚫", label: "Errores de Comisión", value: m.errores_comision, helper: "Respuestas incorrectas." },
        { icon: "🟨", label: "Errores de Omisión", value: m.errores_omision, helper: "Flechas no respondidas." },
        { icon: "📊", label: "Estabilidad Atencional", value: nf2.format(m.estabilidad_desempeno), helper: "Consistencia en tu velocidad de respuesta." }
      ]
    };
  },

    getScore: (metrics) => metrics.score || 0, // <--- ESTO ES LO QUE FALTA

};