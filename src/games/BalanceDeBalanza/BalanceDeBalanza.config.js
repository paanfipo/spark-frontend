export const balanceDeBalanzaConfig = {
  instructions: {
    title: "Balance de Balanza",
    subtitle: "Deduce qué conjunto de figuras equilibra la balanza final usando las reglas observadas.",
    chips: ["Razonamiento", "Gf", "Inferencia", "Flexibilidad cognitiva"],
    heroImage: "/balance_balanza_hero.png",
    background: "var(--fe-gradient)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Razonamiento inductivo e inferencial: extraer equivalencias a partir de balanzas en equilibrio y aplicarlas para resolver una balanza final."
      },
      {
        title: "Sugerencias",
        content: "Usa la lógica de sustitución: si una estrella vale dos círculos, reemplaza mentalmente cada estrella por círculos para simplificar el cálculo."
      }
    ],
    tutorial: {
      gameId: "balance-de-balanza",
      steps: [
        {
          title: "Mira las Reglas",
          body: "Las balanzas iniciales son equivalencias reales. Memoriza cuánto vale cada figura respecto a las otras.",
          media: { type: "image", src: "/tutos/balanza/step1.png" }
        },
        {
          title: "Resuelve el Desafío",
          body: "Aplica las reglas anteriores para encontrar la opción que mantiene el equilibrio en la balanza final.",
          media: { type: "image", src: "/tutos/balanza/step2.png" }
        }
      ]
    }
  },

  formatMetrics: (results) => {
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    
    return {
      title: "Balance de Balanza",
      subtitle: "¡Has completado el desafío de lógica!",
      // Esto genera las tarjetas grandes superiores (como en Matriz de Memoria)
      summary: [
        { icon: "🏆", label: "Puntaje Total", value: nf0.format(results.score || 0) },
        { icon: "🎯", label: "Precisión", value: `${results.precision_inferencial_pct}%` },
        { icon: "⏱️", label: "Tiempo Medio", value: `${results.tiempo_medio_resolucion_ms} ms` }
      ],
      // Listado detallado
      metrics: [
        {
          icon: "📏",
          label: "Precisión inferencial",
          value: `${results.precision_inferencial_pct}%`,
          helper: "Porcentaje de balanzas equilibradas correctamente."
        },
        {
          icon: "⏱️",
          label: "Tiempo de resolución",
          value: `${results.tiempo_medio_resolucion_ms} ms`,
          helper: "Rapidez media en procesar las equivalencias."
        },
        {
          icon: "🚫",
          label: "Intentos incorrectos",
          value: results.intentos_incorrectos,
          helper: "Total de errores cometidos durante la partida."
        }
      ],
      tips: [
        "Busca simplificar las balanzas eliminando figuras iguales en ambos lados.",
        "Calcula primero el valor de la figura que aparece sola en un platillo.",
        "Si una balanza tiene muchas piezas, intenta sustituirlas mentalmente por las figuras más simples."
      ],
    };
  },

  getScore: (results) => results.score || 0
};

export const gameSettings = {
  startingLives: 3,
  countdownSeconds: 3
};

export const levelsData = [
  { id: 1, shapes: 3, hintEquations: 2, maxTerms: 2, targetTerms: 2, options: 3 },
  { id: 2, shapes: 4, hintEquations: 3, maxTerms: 3, targetTerms: 3, options: 4 },
  { id: 3, shapes: 5, hintEquations: 4, maxTerms: 3, targetTerms: 4, options: 4 }
];