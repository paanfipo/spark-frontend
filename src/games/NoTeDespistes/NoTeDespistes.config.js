export const noTeDespistesConfig = {
  // 1. Configuración para <Instrucciones />
  instructions: {
    title: "No te Despistes",
    subtitle: "Entrena tu atención focalizada y tu capacidad de reorientación.",
    chips: ['Atención', 'Velocidad'],
    heroImage: "/atencion_posner.png",
    background: "var(--atencion-gradient)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Atención selectiva y exógena: la capacidad de mover el foco atencional hacia un estímulo relevante, incluso cuando hay distractores o señales engañosas."
      },
      {
        title: "Sugerencias",
        content: "Mantén la vista en la cruz central (+) y usa tu visión periférica para detectar la estrella lo más rápido posible."
      }
    ],
    tutorial: {
      gameId: 'no-te-despistes',
      startLabel: '¡Empezar!',
      steps: [
        {
          title: 'Mira el centro',
          body: 'Mantén la vista siempre en la cruz central. Aparecerá una flecha que indica dónde mirar.',
          media: { type: 'img', src: '/tutos/posner/step1.png', alt: 'Punto de fijación' }
        },
        {
          title: 'Atento a la flecha',
          body: 'La flecha suele acertar, pero a veces te engañará. ¡No dejes que te confunda!',
          media: { type: 'gif', src: '/tutos/posner/step2.gif', alt: 'Señalización de flecha' }
        },
        {
          title: 'Toca la estrella',
          body: 'En cuanto aparezca la estrella, presiona la tecla de dirección (izquierda o derecha) lo más rápido posible.',
          media: { type: 'gif', src: '/tutos/posner/step3.gif', alt: 'Respuesta rápida' }
        }
      ]
    }
  },

  // 2. Función para formatear <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics;
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "No te Despistes",
      subtitle: "Resultados de tu entrenamiento atencional",
      summary: [
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score) },
        { icon: "🎯", label: "Tasa de Aciertos", value: `${nf2.format(m.tasa_aciertos || 0)} %` },
      ],
      metrics: [
        {
          icon: "⏱️",
          label: "TR en Ensayos Válidos",
          value: `${nf0.format(m.tiempo_medio_reaccion_validos || 0)} ms`,
          helper: "Tiempo de reacción cuando la flecha acertó."
        },
        {
          icon: "🔄",
          label: "Costo de Reorientación",
          value: `${nf0.format(m.costo_reorientacion || 0)} ms`,
          helper: "Tiempo extra que tardas cuando la flecha te engaña."
        },
        {
          icon: "📊",
          label: "Variabilidad del TR",
          value: `${nf2.format(m.variabilidad_tr || 0)} ms`,
          helper: "Qué tan consistente fue tu velocidad de respuesta."
        },
        {
          icon: "🚫",
          label: "Errores de Comisión",
          value: nf0.format(m.errores_comision || 0),
          helper: "Presionaste el lado equivocado."
        },
        {
          icon: "🟨",
          label: "Errores de Omisión",
          value: nf0.format(m.errores_omision || 0),
          helper: "No respondiste a tiempo."
        }
      ],
      tips: [
        "Intenta no mover los ojos del centro, usa tu visión periférica.",
        "El costo de reorientación alto indica que te cuesta ignorar señales engañosas."
      ],
    };
  },

  // 3. Función para calcular el puntaje
  getScore: (rawMetrics) => {
    return rawMetrics.score || 0;
  }
};

export const gameSettings = {
  fixationDuration: 600,  // ms
  cueDuration: 400,       // ms
  targetTimeout: 2000,    // Tiempo máximo para responder
  validProb: 0.6          // 60% ensayos válidos
};