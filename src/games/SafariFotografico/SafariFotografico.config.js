export const safariFotograficoConfig = {
  instructions: {
    title: "Safari Fotográfico",
    subtitle: "¡Captura a los patos, pero respeta a la fauna silvestre!",
    chips: ['Inhibición', 'Atención'],
    heroImage: "/safari_hero.png",
    background: "var(--safari-gradient)",
    infoCards: [
      {
        title: "Tu Misión",
        content: "Haz clic rápidamente en los patos (Go) para fotografiarlos. Pero ¡CUIDADO!, si aparece otro animal (No-Go), no debes tocar la pantalla."
      },
      {
        title: "Qué entrenas",
        content: "Control de impulsos y atención sostenida. Aprenderás a procesar información rápidamente antes de actuar."
      }
    ],
    tutorial: {
      gameId: 'safari-fotografico',
      startLabel: '¡A la selva!',
      steps: [
        {
          title: '¡Pato a la vista!',
          body: 'Cuando veas un pato, haz clic o presiona espacio lo más rápido posible.',
          media: { type: 'img', src: '/tutos/safari/pato.png', alt: 'Estímulo Go' }
        },
        {
          title: '¡Alto ahí!',
          body: 'Si aparece cualquier otro animal, mantén las manos quietas. ¡No dispares la foto!',
          media: { type: 'img', src: '/tutos/safari/distractor.png', alt: 'Estímulo No-Go' }
        }
      ]
    }
  },

  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Resultado del Safari",
      summary: [
        { icon: "🦆", label: "Fotos Logradas", value: nf0.format(m.total_aciertos || 0) },
        { icon: "🎯", label: "Precisión", value: `${nf2.format(m.tasa_aciertos || 0)}%` }
      ],
      metrics: [
        { icon: "⏱️", label: "Velocidad de Reacción", value: `${nf0.format(m.tiempo_medio_reaccion_ms || 0)} ms`, helper: "Rapidez en capturar patos." },
        { icon: "📊", label: "Consistencia (Variabilidad)", value: `${nf2.format(m.variabilidad_tr || 0)} ms`, helper: "Qué tan estable fue tu velocidad." },
        { icon: "🚫", label: "Errores de Comisión", value: nf0.format(m.errores_comision || 0), helper: "Animales fotografiados por error (Impulsividad)." },
        { icon: "🟨", label: "Errores de Omisión", value: nf0.format(m.errores_omision || 0), helper: "Patos que se escaparon." }
      ],
      tips: ["Concéntrate en la forma del pato para no reaccionar por impulso ante otros animales."]
    };
  },

  getScore: (m) => m.score || 0
};