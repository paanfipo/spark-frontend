// src/pages/GameListPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './GameList.module.css';

// Función helper para convertir texto a un formato de URL amigable
const slugify = (text = '') => {
  return text
    .normalize('NFD')                 // separa letras y tildes
    .replace(/[\u0300-\u036f]/g, '')  // elimina tildes (áéíóú -> aeiou)
    .toLowerCase()
    .replace(/ñ/g, 'n')               // opcional: ñ -> n
    .replace(/\s+/g, '-')             // espacios -> guiones
    .replace(/[^\w-]+/g, '')          // quita caracteres raros
    .replace(/--+/g, '-')             // colapsa guiones
    .replace(/^-+|-+$/g, '');         // recorta guiones extremos
};


function GameListPage() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:8000/games/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGames(response.data);
      } catch (error) {
        console.error('Error al obtener la lista de juegos', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGames();
  }, []);

  const handlePlayClick = async (game) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `http://localhost:8000/games/${game.id}/start-play`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const gameplayId = response.data.id;

      const gameCode = slugify(game.name);

       // --- AÑADE ESTA LÍNEA PARA DEPURAR ---
    console.log("GameListPage está generando este gameCode:", gameCode);
    // ------------------------------------


      navigate(`/play/${gameCode}/${gameplayId}`);

    } catch (error) {
      console.error('Error al iniciar la partida', error);
      alert('No se pudo iniciar la partida.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Cargando juegos...</div>;
  }

  /* ============================
   *  Lógica de Dominios
   * ============================ */

  const PRIORITY = [
    'Lenguaje',
    'Memoria',
    'Atención',
    'Funciones Ejecutivas',
    'Habilidades Visoconstructivas',
  ];

  

  const normalize = (text = '') =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const DOMAIN_CANONICAL_MAP = {
  'habilidades visoespaciales': 'Habilidades Visoconstructivas',
  'habilidades visuoespaciales': 'Habilidades Visoconstructivas',
  'habilidades visoconstructivas': 'Habilidades Visoconstructivas',
  'visoespaciales': 'Habilidades Visoconstructivas',
  'visoconstructivas': 'Habilidades Visoconstructivas',

  'memoria': 'Memoria',
  'memoria de trabajo': 'Memoria',
  'atencion': 'Atención',
  'lenguaje': 'Lenguaje',
  'funciones ejecutivas': 'Funciones Ejecutivas',
};

  const tokenizeDomains = (dom) => {
    if (!dom) return [];
    if (Array.isArray(dom)) return dom;

    return dom
      .split(/(?:\s+y\s+|,|\/|&|;)/i)
      .map(s => s.trim())
      .filter(Boolean);
  };


  const resolveDomain = (game) => {
    const domains = tokenizeDomains(game.cognitive_domain)
      .map(normalize)
      .map(d => DOMAIN_CANONICAL_MAP[d])
      .filter(Boolean);

    return domains[0] || 'Otros';
  };



  const shouldRenderIn = (game, section) => {
    const target = normalize(section);

    const domains = tokenizeDomains(game.cognitive_domain)
      .map(normalize)
      .map(d => DOMAIN_CANONICAL_MAP[d] || d)
      .map(normalize);

    return domains.includes(target);
  };


  /* ============================
   * ⬇️ 1. AÑADE ESTE MAPA DE IMÁGENES AQUÍ ⬇️
   * ============================ */
  // Asocia el 'slug' del juego (que genera tu función slugify) 
  // con la ruta de la imagen en tu carpeta /public/portada/
  //
  // ¡RECUERDA! Las rutas en 'public' NO llevan '/public/' al inicio.
  
  const IMAGE_MAP = {
    'matriz-de-memoria': 'public/portada/MatrizdeMemoria.png',
    'sigue-la-secuencia': 'public/portada/SigueLaSecuencia.png',
    'recuerda-los-objetos': 'public/portada/RecuerdaLosObjetos.png',
    'caja-de-recuerdos': 'public/portada/CajaDeRecuerdos.png',
    'deja-vu': 'public/portada/DejaVu.png',
    'ruta-de-luces': 'public/portada/RutaDeLuces.png',
    'ruta-de-colores-al-reves': 'public/portada/RutaDeColoresAlReves.png',
    'concentrate-en-el-objetivo': 'public/portada/ConcetranteEnElObjetivo.png',
    'cazador-de-burbujas': 'public/portada/CazadorDeBurbujas.png',
    'enfoca-la-flecha': 'public/portada/EnfocaLaFlecha.png',
    'no-te-despistes': 'public/portada/NoTeDespistes.png',
    'safari-fotografico': 'public/portada/SafariFotografico.png',
    'sopa-de-letras': 'public/portada/SopaDeLetras.png',
    'comparacion-de-colores': 'public/portada/ComparacionDeColores.png',
    'tormenta-de-palabras': 'public/portada/TormentaDePalabras.png',
    'el-lector-del-cosmos': 'public/portada/LectorDeCosmos.png',
    'a-fin': 'public/portada/Afin.png',
    'que-sentido-tiene': 'public/portada/QueSentidoTiene.png',
    'apunta-y-acierta': 'public/portada/ApuntaYAcierta.png',
    'construye-la-caneria': 'public/portada/ConstruyeLaCaneria.png',
    'colorea-el-camino': 'public/portada/ColoreaElCamino.png',
    'mosaico-espejo': 'public/portada/MosaicoEspejo.png',
    'trazos-conectados': 'public/portada/TrazosConectados.png',
    'enfoque-cambiante': 'public/portada/EnfoqueCambiante.png',
    'hojas-navegantes': 'public/portada/HojasNavegantes.png',
    'balance-de-balanza': 'public/portada/BalanceDeBalanza.png',
    'matrices-progresivas': 'public/portada/MatricesProgresivas.png',
    // Añadir aquí tus otros juegos:
    // 'nombre-del-juego-slugify': '/portada/nombre-imagen.png',
  };

  // Esta será la imagen si un juego NO está en el mapa de arriba
  const FALLBACK_IMAGE = '/portada/default-cover.png'; //

  /* ============================
   *  Render de Sección
   * ============================ */
 // En src/pages/GameListPage.jsx

  /* ============================
   *  Render de Sección
   * ============================ */
  const renderSection = (title, domain, id) => {
    const filteredGames = games.filter((game) => shouldRenderIn(game, domain));
    if (filteredGames.length === 0) return null; // No renderizar si la sección está vacía

    return (
      <section key={id} id={id} className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.gameGrid}>
          {filteredGames.map((game) => {
            
            const gameCode = slugify(game.name);

            console.log(
              'CHECK',
              game.name,
              tokenizeDomains(game.cognitive_domain),
              tokenizeDomains(game.cognitive_domain).map(normalize),
              resolveDomain(game)
            );

            return (
              <div key={game.id} className={styles.gameCard}>

                
                {/* 1. TÍTULO Y TAG */}
                <div className={styles.cardHeader}>
                  <h3>{game.name}</h3>
                  <span className={styles.cognitiveDomain}>{resolveDomain(game)}</span>
                </div>
                
                {/* 2. DESCRIPCIÓN */}
                <p className={styles.description}>{game.description}</p>

                {/* 3. IMAGEN (MOVIDA AQUÍ) */}
                <div className={styles.cardImageContainer}>
                  <img
                    src={IMAGE_MAP[gameCode] || FALLBACK_IMAGE}
                    alt={`Portada de ${game.name}`}
                    className={styles.cardImage}
                    loading="lazy" 
                  />
                </div>
                
                {/* 4. MÉTRICAS */}
                <div className={styles.metricsSection}>
                  <h4>Métricas Clave</h4>
                  <ul>
                    {game.metrics && game.metrics.map((metric) => (
                      <li key={metric.id}>
                        {metric.is_primary ? (
                          <strong>{metric.display_name} (Principal)</strong>
                        ) : (
                          metric.display_name
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* 5. BOTÓN */}
                <button
                  onClick={() => handlePlayClick(game)}
                  className={styles.playButton}
                >
                  Jugar
                </button>

              </div>
            );
          })}
        </div>
      </section>
    );
  };



  /* ============================
   *  Render Principal (Dinámico)
   * ============================ */
  const SECTIONS = [
    { title: 'Memoria', domain: 'Memoria', id: 'memoria' },
    { title: 'Atención', domain: 'Atención', id: 'atencion' },
    { title: 'Lenguaje', domain: 'Lenguaje', id: 'lenguaje' },
    { title: 'Funciones Ejecutivas', domain: 'Funciones Ejecutivas', id: 'ejecutivas' },
    { title: 'Habilidades Visoconstructivas', domain: 'Habilidades Visoconstructivas', id: 'visoconstructivas' },
  ];

  return (
    <div className={styles.gameListContainer}>
      <h1>Catálogo de Juegos</h1>
      <nav className={styles.domainsNav}>
        {SECTIONS.map(section => (
          <a key={section.id} href={`#${section.id}`}>{section.title}</a>
        ))}
      </nav>
      {SECTIONS.map(section => 
        renderSection(section.title, section.domain, section.id)
      )}
    </div>
  );
}

export default GameListPage;