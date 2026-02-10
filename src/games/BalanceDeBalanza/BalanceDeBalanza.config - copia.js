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
        content:
          "Razonamiento inductivo e inferencial: extraer equivalencias a partir de balanzas en equilibrio y aplicarlas para resolver una balanza final."
      },
      {
        title: "Cómo jugar",
        content:
          "Observa las balanzas de ejemplo (equilibrios). Luego elige, entre opciones, el conjunto de figuras que equilibra la balanza final."
      }
    ],
    tutorial: {
      gameId: "balance-de-balanza",
      steps: [
        {
          title: "Reglas",
          body: "Las balanzas iniciales son equivalencias reales. Úselas como reglas.",
          media: { type: "image", src: "/tutos/balanza/step1.png" }
        },
        {
          title: "Balanza final",
          body: "Aplique las reglas y seleccione la opción que equilibra la balanza final.",
          media: { type: "image", src: "/tutos/balanza/step2.png" }
        }
      ]
    }
  },

  formatMetrics: (results) => {
    return {
      metrics: [
        {
          label: "Precisión inferencial",
          value: `${results.precision_inferencial_pct}%`,
          description: "Porcentaje de problemas resueltos correctamente."
        },
        {
          label: "Tiempo medio de resolución",
          value: `${results.tiempo_medio_resolucion_ms} ms`,
          description: "Promedio del tiempo hasta resolver (solo problemas correctos)."
        },
        {
          label: "Intentos incorrectos",
          value: `${results.intentos_incorrectos}`,
          description: "Número total de selecciones erróneas."
        }
      ],
      tips: [
        "Busca simplificar las balanzas eliminando figuras iguales en ambos lados.",
        "Calcula primero el valor de la figura que aparece sola en un platillo.",
        "Si una balanza tiene muchas piezas, intenta sustituirlas por figuras de las reglas más simples."
      ],
    };
  },

  getScore: (results) => results.score || 0
};

export const gameSettings = {
  startingLives: 3,
  countdownSeconds: 3
};

/**
 * Niveles:
 * - shapes: número de tipos de figuras disponibles
 * - hintEquations: cuántas balanzas-regla se muestran
 * - maxTerms: máximo de figuras por lado en una ecuación
 * - targetTerms: tamaño (aprox.) del lado izquierdo del problema final
 * - options: cuántas opciones se muestran
 */
export const levelsData = [
  { id: 1, shapes: 3, hintEquations: 2, maxTerms: 2, targetTerms: 2, options: 3 },
  { id: 2, shapes: 4, hintEquations: 3, maxTerms: 3, targetTerms: 3, options: 4 },
  { id: 3, shapes: 5, hintEquations: 4, maxTerms: 3, targetTerms: 4, options: 4 }
];
