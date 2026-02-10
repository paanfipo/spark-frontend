// src/games/ColoreaElCamino/ColoreaElCamino.config.js

export const coloreaElCaminoConfig = {
  
  // 1. Configuración para <Instrucciones />
  instructions: {
    title: "Colorea el camino",
    subtitle: "Arrastra y coloca los bloques para llenar el contorno por completo.",
    chips: ['Visoconstrucción', 'Lógica'],
    heroImage: "/colorea_camino_hero.png",
    background: "var(--mem-gradient)",
    infoCards: [
      {
        title: "Qué entrenas",
        content: "Habilidades visoconstructivas: la capacidad de organizar y guiar acciones para construir o rellenar formas espaciales."
      },
      {
        title: "Sugerencias",
        content: "Visualiza primero las piezas más grandes; estas suelen dictar el espacio restante para las pequeñas."
      }
    ],
    tutorial: {
      gameId: 'colorea-el-camino',
      startLabel: '¡Empezar!',
      steps: [
        {
          title: 'Arrastra los bloques',
          body: 'Mueve las piezas de colores hacia el interior del contorno vacío.',
          media: { type: 'gif', src: '/tutos/colorea/step1.gif', alt: 'Arrastrar piezas' }
        },
        {
          title: 'Sin superposiciones',
          body: 'No puedes colocar una pieza sobre otra. Si lo intentas, contará como error de superposición.',
          media: { type: 'img', src: '/tutos/colorea/overlap.png', alt: 'Evitar superposición' }
        },
        {
          title: 'Cubre todo el espacio',
          body: 'El nivel termina cuando no quedan espacios en blanco dentro del contorno.',
          media: { type: 'gif', src: '/tutos/colorea/step3.gif', alt: 'Completar nivel' }
        }
      ]
    }
  },

  // 2. Función para formatear <ResumenMetricas />
  // 2. Función para formatear <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics || {};
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // IPV viene como decimal (0..1), lo pasamos a porcentaje
    const ipv01 = Number(m.indice_precision_visoconstructiva_ipv) || 0;
    const ipvPct = ipv01 * 100;

    const tiempoSeg = (Number(m.tiempo_total_construccion_ms) || 0) / 1000;

    return {
      title: "Colorea el camino",
      subtitle: "¡Resumen del Desempeño!",
      summary: [
        { icon: "🏗️", label: "Precisión (IPV)", value: `${nf2.format(ipvPct)} %` },
        { icon: "⏱️", label: "Tiempo Total", value: `${nf2.format(tiempoSeg)} s` },
        // ✅ Ahora usará el score que calculamos en el JSX
        { icon: "💰", label: "Puntaje Total", value: nf0.format(m.score || 0) },
      ],
      metrics: [
        { icon: "📏", label: "IPV", value: `${nf2.format(ipvPct)} %`, helper: "Exactitud al rellenar el contorno." },
        { icon: "🚫", label: "Superposiciones", value: nf0.format(m.errores_superposicion_eventos || 0), helper: "Intentos de encaje sobre otras piezas." },
        { icon: "🔲", label: "Espacios Vacíos", value: nf0.format(m.espacios_no_cubiertos_total || 0), helper: "Celdas que quedaron sin rellenar." },
        { icon: "🔄", label: "Reubicaciones", value: nf0.format(m.reubicaciones_piezas || 0), helper: "Movimientos realizados con las piezas." },
      ],
      tips: [ "Planifica antes de arrastrar.", "Evita mover piezas ya colocadas para subir tu IPV." ],
    };
  },

  // 3. Función para calcular el puntaje
  getScore: (rawMetrics) => {
    // ✅ Priorizamos el score que ya viene calculado desde el juego
    if (rawMetrics?.score !== undefined) return rawMetrics.score;
    
    const ipv = Number(rawMetrics?.indice_precision_visoconstructiva_ipv);
    if (!Number.isFinite(ipv)) return 0;
    return Math.round(ipv * 1000); // Usamos 1000 para que el número sea más grande
  },
};

export const gameSettings = {
  startingLives: 3,
  cellSizePx: 34,   // ✅ número puro
};


export const levelsData = [
  {
    id: "VISO03-L01",
    w: 6, // ⬅️ Antes tenías 4, pero tu string tiene 6 caracteres
    h: 6, // ⬅️ Antes tenías 4, pero tu array tiene 6 filas
    cellSizePx: 50,
    target: [
      "000000",
      "011110",
      "011110",
      "011110",
      "000000",
      "000000",
    ],
    obstacles: [
      "000000", "000000", "000000", "000000", "000000", "000000",
    ],
    allowRotate: true,
    pieces: [
      { id: "p1", color: "#f44336", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] },
      { id: "p2", color: "#2196f3", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] },
      { id: "p3", color: "#4caf50", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] },
      { id: "p4", color: "#ff9800", cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }] },
    ],
  },
  {
    id: "VISO03-L02",
    w: 7, // ⬅️ Antes tenías 6, pero tu string tiene 7 caracteres
    h: 7, // ⬅️ Antes tenías 6, pero tu array tiene 7 filas
    cellSizePx: 50,
    target: [
      "0000000",
      "0011110",
      "0011110",
      "0011110",
      "0011110",
      "0000000",
      "0000000",
    ],
    obstacles: [
      "0000000", "0000000", "0000000", "0000000", "0000000", "0000000", "0000000",
    ],
    allowRotate: true,
    pieces: [
      { id: "p1", color: "#f44336", cells: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:0,y:2}] },
      { id: "p2", color: "#2196f3", cells: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1}] },
      { id: "p3", color: "#4caf50", cells: [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2}] },
      { id: "p4", color: "#ff9800", cells: [{x:0,y:0},{x:0,y:1},{x:0,y:2}] },
    ],
  }
  // Los niveles 3, 4 y 5 ya tienen w y h correctos según sus strings.
];
