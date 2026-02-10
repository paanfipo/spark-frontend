export const apuntaYAciertaConfig = {
  
  // 1. La configuración para <Instrucciones /> (CON TUTORIAL INCLUIDO)
  instructions: {
    title: "¡Apunta y Acierta!",
    subtitle: "Entrena tu precisión temporal y coordinación visomotriz.",
    chips: ['Coordinación', 'Anticipación'],
    heroImage: "/images/apunta_hero.png", // Cambia por tu imagen
    background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Coordinación ojo-mano y anticipación temporal: la capacidad de predecir cuándo un objeto llegará a un punto exacto."
      },
      {
        title: "Sugerencias",
        content: "No intentes seguir el objeto con la mirada. Fija tu vista en el blanco central y pulsa cuando el objeto entre en él."
      }
    ],
    // ✅ ESTO ES LO QUE HACE QUE APAREZCA EL MINITUTORIAL
    tutorial: {
      gameId: 'apunta-y-acierta',
      startLabel: '¡A disparar!',
      steps: [
        {
          title: 'El Objetivo',
          body: 'Un objeto se moverá de lado a lado. Tu meta es darle justo en el centro del blanco.',
          media: { type: 'img', src: '/tutos/apunta/step1.png', alt: 'Blanco central' }
        },
        {
          title: '¡Haz clic!',
          body: 'Pulsa en cualquier parte de la pantalla en el momento preciso. Si te adelantas o te retrasas, perderás una vida.',
          media: { type: 'gif', src: '/tutos/apunta/step2.gif', alt: 'Momento del clic' }
        },
        {
          title: 'Dificultad creciente',
          body: 'Con cada acierto, el objeto irá más rápido. Tienes 3 vidas (corazones) para lograr el máximo puntaje.',
          media: { type: 'img', src: '/tutos/apunta/step3.png', alt: 'Vidas y velocidad' }
        }
      ]
    }
  },

  // 2. Función para formatear las métricas en el Resumen
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "¡Apunta y Acierta!",
      subtitle: "¡Se terminaron tus intentos!",
      summary: [
        { icon: "🎯", label: "Precisión Temporal", value: `${nf0.format(m.precision_temporal_porcentaje)} %` },
        { icon: "⏱️", label: "Error Medio", value: `${nf0.format(m.error_medio_ms)} ms` },
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
      ],
      metrics: [
        {
          icon: "⏩",
          label: "Errores de Anticipación",
          value: nf0.format(m.errores_anticipacion),
          helper: "Clics realizados antes de que el objeto llegara al centro."
        },
        {
          icon: "⏪",
          label: "Errores de Retraso",
          value: nf0.format(m.errores_retraso),
          helper: "Clics realizados después de que el objeto pasó el centro."
        },
        {
          icon: "📊",
          label: "Variabilidad del Error",
          value: `${nf2.format(m.desviacion_error_ms)} ms`,
          helper: "Mide qué tan constante es tu tiempo de reacción."
        }
      ],
      tips: [ "Mantén la calma, la velocidad aumenta pero el blanco no se mueve.", "Focaliza tu atención solo en el área del círculo verde." ],
    };
  },

  // 3. Obtener el score para la DB
  getScore: (rawMetrics) => {
    return rawMetrics.score || 0;
  }
};