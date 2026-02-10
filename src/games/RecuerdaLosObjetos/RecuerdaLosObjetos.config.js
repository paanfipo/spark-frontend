// src/games/RecuerdaLosObjetos/RecuerdaLosObjetos.config.js

// Este es el "menú" ligero que tu GamePlayer.jsx importará.
export const recuerdaObjetosConfig = {
  
  // 1. La configuración para <Instrucciones />
  instructions: {
    title: "Recuerda los Objetos",
    subtitle: "Memoriza la secuencia de objetos y repítela en la cuadrícula.",
    chips: ['Memoria', 'Atención'],
    heroImage: "/Presentacion/recuerda_objetos_frutas.png",
    background: "linear-gradient(135deg,#0f2027 0%,#203a43 45%,#2c5364 100%)",
    heroPosition: "right", 
    heroSize: "10%", 
    //heroImageSize: "750px",
    
  
    infoCards: [
      { 
        title: 'Qué entrenas', 
        content: 'Memoria de trabajo visoespacial, retención de orden y reconocimiento bajo distracción.' 
      },
      { 
        title: 'Sugerencias',  
        content: 'Nombra los objetos y crea una mini historia que conecte la secuencia.' 
      }
    ],


    tutorial: {
      gameId: 'recuerda-objetos',
      startLabel: '¡A memorizar!',
      steps: [
        { media: { type:'gif', src:'/tutos/recuerda/step1.gif', alt:'Objetos apareciendo' } },
        //{ title: '1. Memoriza', body: 'Verás objetos uno por uno. Recuerda su orden.', media: { type:'gif', src:'/tutos/recuerda/step1.gif', alt:'Objetos apareciendo' } },
       // { title: '2. Busca',    body: 'Aparece una cuadrícula con distractores. Ignóralos.', media: { type:'img', src:'/tutos/recuerda/step2.gif', alt:'Cuadrícula' } },
        { media: { type:'img', src:'/tutos/recuerda/step2.gif', alt:'Cuadrícula' } },
        // { title: '3. Repite',   body: 'Haz clic en el mismo orden en que aparecieron.', media: { type:'gif', src:'/tutos/recuerda/step3.gif', alt:'Clic en orden' } },
        { media: { type:'gif', src:'/tutos/recuerda/step3.gif', alt:'Clic en orden' } },
      ]
    }
  },

  // 2. La función para formatear <ResumenMetricas />
  formatMetrics: (rawMetrics) => {
    const m = rawMetrics;
    const nf0 = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
    const nf2 = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tiempoSeg = (m.tiempoPromedioMs || 0) / 1000;

    return {
      title: 'Recuerda los Objetos',
      subtitle: '¡Juego finalizado!',
      summary: [
        {
          icon: '🏆',
          label: 'Amplitud Máxima de Objetos',
          value: nf0.format(m.maxObjectSpan),
        },
        {
          icon: '📊',
          label: 'Porcentaje de Secuencias Correctas',
          value: `${nf0.format(
            (m.secuenciasCorrectas / m.totalSecuencias) * 100
          )}%`,
        },
      ],
      metrics: [
        {
          icon: '…',
          label: 'Errores de Omisión',
          value: nf0.format(m.erroresOmision),
          helper: 'Secuencias no completadas.',
        },

              {
          icon: '🚫',
          label: 'Errores de Comisión',
          value: nf0.format(m.erroresComision),
          helper: 'Selección de distractores.',
        },
      
        {
          icon: '⏱️',
          label: 'Tiempo de Respuesta',
          value: `${nf2.format(m.tiempoRespuestaMs / 1000)} s`,
          helper: 'Tiempo medio por selección.',
        },
  
        {
          icon: '❌',
          label: 'Errores de Orden',
          value: nf0.format(m.erroresOrden),
          helper: 'Objetos correctos en orden incorrecto.',
        },
  
      ],
      
      tips: [
        "Agrupa mentalmente por categorías (p. ej. frutas).",
        "Repite en voz baja el orden mientras miras."
      ],
 
    };
  },

  // 3. La función para calcular el puntaje
  getScore: (rawMetrics) => {
    return (rawMetrics.totalAciertos || 0) * (rawMetrics.stage || 1) * 10;
  }
};