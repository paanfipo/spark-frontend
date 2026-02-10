// src/data/objects.js

/**
 * Banco de emojis/objetos para juegos de memoria visual.
 */

export const OBJECT_BANK_GENERAL = [
  // Frutas y Verduras
  '🍎','🍊','🍌','🍉','🍇','🍓','🍒','🍑','🍍','🥥','🥝','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄',
  '🧅','🥔','🍠',
  
  // Comida preparada
  '🥐','🥯','🍞','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟',
  '🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚',
  '🍘','🍥','🥠','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪',
  '🌰','🥜','🍯','🥛','🍼','☕','🧃','🧉','🧊',
  
  // Objetos varios 
  '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🥊','🥋','🥇','🥈','🥉','🏅','🎖️','🏆'
];

// ✅ Banco para Deja Vu
export const DEJAVU_SYMBOLS = [
  '■','●','▲','◆','★','►','▼','◄','♦','♥','◼','○','◻','◇','☆',
  '⬟','⬢','✚','✖','✶','✷','✸','✹','✺','✡','✢','✣','✤','✥',
  '❉','❋','❖','❄','❇','§','¶','©','®','T','μ','Σ','Π','Ω',
  'Ψ','Φ','Λ','Ξ','δ','ε','ζ'
];

export const SAFARI_TARGETS = ['🦆']; // El objetivo (Go)

export const SAFARI_DISTRACTORS = [
  // Mamíferos (No-Go)
  '🐒', '🦁', '🐘', '🦓', '🦒', '🐆', '🐅', '🐎', '🐂', '🐃', '🐄', '🐖', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦘',
  
  // Reptiles y otros (No-Go)
  '🐍', '🐢', '🦎', '🐊', '🐸',
  
  // Aves que NO son el objetivo (No-Go - ¡Nivel difícil!)
  '🦉', '🦅', '🦜', '🦚', '🦢', '🦩', '🕊️'
];

// ✅ Banco para Sopa de Letras
export const WORD_BANKS = {
  NEURO: ['CEREBRO', 'ATENCION', 'MEMORIA', 'ENFOQUE', 'LOGICA', 'NEURONA', 'MENTE'],
  COMIDA: ['MANZANA', 'PIZZA', 'QUESO', 'HUEVO', 'ARROZ', 'PASTA', 'LECHE'],
  DEPORTES: ['FUTBOL', 'TENIS', 'BOXEO', 'NATACION', 'RUGBY', 'GOLF', 'JUDO']
};

export const SINONIMOS_DATA = [
  {
    target: "EFÍMERO",
    correct: "Fugaz",
    distractors: ["Eterno", "Breve", "Rápido"],
    difficulty: 1
  },
  {
    target: "ADUSTO",
    correct: "Arisco",
    distractors: ["Serio", "Enfadado", "Seco"],
    difficulty: 2
  },
  {
    target: "PROLIJO",
    correct: "Detallado",
    distractors: ["Largo", "Cuidadoso", "Extenso"],
    difficulty: 3
  },
  {
    target: "UBICUO",
    correct: "Omnipresente",
    distractors: ["Localizado", "Famoso", "Extendido"],
    difficulty: 4
  },
  {
    target: "INDIGENCIA",
    correct: "Pobreza",
    distractors: ["Escasez", "Humildad", "Austeridad"],
    difficulty: 1
  },
  {
    target: "DILIGENCIA",
    correct: "Presteza",
    distractors: ["Trámite", "Cuidado", "Esfuerzo"],
    difficulty: 2
  },
  {
    target: "INHERENTE",
    correct: "Intrínseco",
    distractors: ["Pegado", "Propio", "Natural"],
    difficulty: 3
  },
  {
    target: "PALIAR",
    correct: "Mitigar",
    distractors: ["Curar", "Disfrazar", "Ocultar"],
    difficulty: 2
  },
  {
    target: "BARRUNTAR",
    correct: "Conjeturar",
    distractors: ["Mirar", "Saber", "Sospechar"],
    difficulty: 4
  },
  {
    target: "EXHAUSTO",
    correct: "Extenuado",
    distractors: ["Cansado", "Vacío", "Débil"],
    difficulty: 1
  }
];

export const SENTIDO_DATA = [
  // Nivel 1: Palabras claras
  { word: "AMOR", value: "positivo", difficulty: 1 },
  { word: "ODIO", value: "negativo", difficulty: 1 },
  { word: "ÉXITO", value: "positivo", difficulty: 1 },
  { word: "FRACASO", value: "negativo", difficulty: 1 },
  // Nivel 2: Más velocidad
  { word: "ALEGRÍA", value: "positivo", difficulty: 2 },
  { word: "MUERTE", value: "negativo", difficulty: 2 },
  { word: "REGALO", value: "positivo", difficulty: 2 },
  { word: "GUERRA", value: "negativo", difficulty: 2 },
  // Nivel 3: Palabras ambiguas/Inhibición
  { word: "SORPRESA", value: "positivo", difficulty: 3 },
  { word: "SOLO", value: "negativo", difficulty: 3 },
  { word: "RETO", value: "positivo", difficulty: 3 },
  { word: "VACÍO", value: "negativo", difficulty: 3 },
  { word: "CAMBIO", value: "positivo", difficulty: 3 }
];


// ✅ Banco de datos para Tormenta de Palabras
export const TORMENTA_DATA = {
  letras_faciles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L', 'M', 'P', 'R', 'S', 'T'],
  letras_dificiles: ['H', 'I', 'J', 'N', 'O', 'Q', 'U', 'V', 'Z'],
  puntos_por_palabra: 100,
  tiempo_base: 60
};


export const COSMOS_DATA = [
  {
    sentence: ["EL", "SOL", "BRILLA", "HOY"],
    distractors: ["LUNA", "SALTO"],
    difficulty: 1
  },
  {
    sentence: ["LOS", "ASTRONAUTAS", "VIAJAN", "AL", "ESPACIO"],
    distractors: ["COMER", "AZUL", "CORRER"],
    difficulty: 2
  },
  {
    sentence: ["UNA", "ESTRELLA", "LEJANA", "EXPLOTÓ", "AYER", "NOCHE"],
    distractors: ["GATO", "VERDE", "CANTAR", "MESA"],
    difficulty: 3
  },
  {
    sentence: ["EL", "COHETE", "DESPEGÓ", "DESDE", "LA", "PLATAFORMA", "NUEVA"],
    distractors: ["SUBMARINO", "CÉNIT", "ABAJO"],
    difficulty: 4
  },
  {
    sentence: ["ESTOS", "PLANETAS", "GIRAN", "ALREDEDOR", "DE", "SU", "PROPIA", "ÓRBITA"],
    distractors: ["SALTAN", "DENTRO", "CUADRADO"],
    difficulty: 5
  },
  {
    sentence: ["AQUEL", "SATÉLITE", "ARTIFICIAL", "ENVÍA", "SEÑALES", "A", "LA", "TIERRA"],
    distractors: ["RECOGE", "CABLE", "DULCE", "DORMIR"],
    difficulty: 6
  },
  {
    sentence: ["LOS", "CIENTÍFICOS", "AFIRMAN", "QUE", "HAY", "AGUA", "EN", "MARTE"],
    distractors: ["NIEGAN", "FUEGO", "SOPA", "CORRER"],
    difficulty: 7
  },
  {
    sentence: ["DURANTE", "EL", "ECLIPSE", "LA", "OSCURIDAD", "CUBRIÓ", "TODO", "EL", "PAISAJE"],
    distractors: ["BRILLO", "DORMIDO", "GRITAR", "PARED"],
    difficulty: 8
  },
  {
    sentence: ["LA", "GRAVEDAD", "ES", "LA", "FUERZA", "QUE", "NOS", "MANTIENE", "EN", "EL", "SUELO"],
    distractors: ["MAGIA", "DÉBIL", "VOLAR", "TECHO", "SUEÑO"],
    difficulty: 9
  },
  {
    sentence: ["UN", "AGUJERO", "NEGRO", "ABSORBE", "INCLUSO", "LA", "LUZ", "QUE", "PASA", "CERCA"],
    distractors: ["ESCUPE", "SOMBRA", "LEJOS", "RÁPIDO", "CANTANDO"],
    difficulty: 10
  }
];
