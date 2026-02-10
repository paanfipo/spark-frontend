// src/games/CazadorDeBurbujas/CazadorDeBurbujas.config.js
import { OBJECT_BANK_GENERAL } from '../../data/objects';

export const cazadorDeBurbujasConfig = {
  instructions: {
    title: "Cazador de Burbujas",
    subtitle: "Rastreo de Objetos Múltiples",
    chips: ['Atención Dividida', 'Seguimiento Visual', 'Control Inhibitorio'],
    heroImage: "/burbujas_juego.png",
    background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
    infoCards: [
      {
        title: "El Desafío",
        content: "Memoriza los objetivos que brillan. Síguelos mientras se mueven y selecciónalos cuando se detengan."
      }
    ],
    // --- AQUÍ ESTÁ EL BLOQUE QUE FALTABA ---
    tutorial: {
      gameId: 'cazador-burbujas',
      startLabel: '¡A cazar!',
      steps: [
        {
          title: 'Memoriza los objetivos',
          body: 'Al inicio, algunas burbujas mostrarán un símbolo y brillarán. Memoriza cuáles son.',
          media: { type: 'img', src: '/tutos/burbujas/step1.png', alt: 'Objetivos resaltados' }
        },
        {
          title: 'Sigue el movimiento',
          body: 'Las burbujas se ocultarán y comenzarán a moverse. No les quites la vista de encima.',
          media: { type: 'gif', src: '/tutos/burbujas/step2.gif', alt: 'Burbujas moviéndose' }
        },
        {
          title: 'Caza los correctos',
          body: 'Cuando se detengan, toca solo las burbujas que memorizaste al principio.',
          media: { type: 'gif', src: '/tutos/burbujas/step3.gif', alt: 'Selección de objetivos' }
        }
      ]
    }
  },

  levels: {
    1: { name: 'Básico', targets: 2, distractors: 3, speed: 1.5, duration: 4000, type: 'emojis' },
    2: { name: 'Intermedio', targets: 2, distractors: 5, speed: 2.2, duration: 5000, type: 'emojis' },
    3: { name: 'Avanzado', targets: 3, distractors: 6, speed: 3.0, duration: 5000, type: 'emojis' },
    4: { name: 'Experto', targets: 3, distractors: 8, speed: 3.8, duration: 6000, type: 'letters' },
    5: { name: 'Maestro', targets: 4, distractors: 10, speed: 4.5, duration: 7000, type: 'letters' }
  },

  assets: {
    // ✅ Usamos el banco general que definiste en objects.js
    emojis: OBJECT_BANK_GENERAL, 
    letters: ['A', 'B', 'X', 'O', 'K', 'L', 'M', 'P', 'Q', 'Z']
  },

  formatMetrics: (m) => {
    const nf = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
    return {
      title: "Cazador de Burbujas",
      summary: [
        { 
          icon: "🎯", 
          label: "Precisión de Rastreo", 
          value: `${nf.format(m.indice_precision_rastreo)}%` 
        },
        { 
          icon: "⏱️", 
          label: "T. Medio Respuesta", 
          value: `${nf.format(m.tiempo_medio_respuesta / 1000)}s` 
        }
      ],
      metrics: [
        { 
          icon: "🚫", 
          label: "Errores Comisión", 
          value: m.errores_comision, 
          helper: "Objetivos incorrectos seleccionados (impulsividad)." 
        },
        { 
          icon: "❓", 
          label: "Errores Omisión", 
          value: m.errores_omision, 
          helper: "Objetivos que no lograste identificar." 
        },
        { 
          icon: "📊", 
          label: "Variabilidad T.R.", 
          value: `${nf.format(m.variabilidad_tiempo_respuesta)}ms`, 
          helper: "Estabilidad de tu foco atencional durante la tarea." 
        }
      ]
    };
  },
    getScore: (m) => {

        return Math.round(m.indice_precision_rastreo * 10 + (m.score || 0));
    }

};

