// src/games/RutaDeLuces/RutaLuces.config.js

export const rutaLucesConfig = {
  instructions: {
    title: "Ruta de Luces",
    subtitle: "Observa la secuencia de luces y repítela en el mismo orden.",
    chips: ['Memoria', 'Atención'],
    heroImage: "/luces_directas.png",
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Memoria visoespacial directa: capacidad de retener y reproducir secuencias de movimientos y posiciones en el espacio."
      },
      {
        title: "Sugerencias",
        content: "Intenta trazar una línea imaginaria que conecte los puntos para recordar la forma del camino."
      }
    ]
  },

  // ✅ Dinámica de Niveles
  levels: {
    1: { name: 'Básico', circles: 8, seqLen: 3, speed: 400 },
    2: { name: 'Intermedio', circles: 10, seqLen: 3, speed: 333 },
    3: { name: 'Avanzado', circles: 12, seqLen: 4, speed: 300 },
    4: { name: 'Experto', circles: 12, seqLen: 5, speed: 280 },
    5: { name: 'Maestro', circles: 12, seqLen: 6, speed: 250 },
    
  },

  // ✅ Métricas específicas solicitadas
  formatMetrics: (m) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      title: "Ruta de Luces",
      subtitle: "Secuencia completada",
      summary: [
        { icon:"📏", label:"Amplitud Máxima", value: nf0.format(m.amplitud_maxima) },
        { icon:"🎯", label:"Secuencias Correctas", value: `${nf0.format(m.porcentaje_correctas)}%` },
      ],
      metrics: [
        {
          icon:"📈",
          label:"Amplitud Máxima",
          value: nf0.format(m.amplitud_maxima),
          helper:"Mayor número de círculos recordados en orden."
        },
        {
          icon:"⏱️",
          label:"Tiempo Total",
          value: `${nf2.format((m.tiempo_total_ms || 0) / 1000)} s`,
          helper:"Tiempo invertido en las respuestas."
        },
        {
          icon:"🚫",
          label:"Errores de Orden",
          value: nf0.format(m.errores_orden || 0),
          helper:"Veces que se falló en la secuencia."
        }
      ],
      tips: ["Mantén la mirada en el centro para captar mejor el movimiento periférico."],
    };
  },

  getScore: (raw) => Math.round(raw.amplitud_maxima * 100)
};