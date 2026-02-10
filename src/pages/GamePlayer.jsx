// src/pages/GamePlayer.jsx
import React, { Suspense, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import GameCanvas from '../layout/GameCanvas';

// --- Componentes  ---
import ResumenMetricas from '../components/ResumenMetricas/ResumenMetricas';
import rm from '../components/ResumenMetricas/ResumenMetricas.module.css';
import Instrucciones from '../components/Instrucciones/Instrucciones'; 

// --- JUEGOS (React.lazy) ---
const gameComponents = {
  'matriz-de-memoria': React.lazy(() => import('../games/MatrizMemoria/MatrizMemoria')),
  'sigue-la-secuencia': React.lazy(() => import('../games/SigueLaSecuencia/SigueLaSecuencia')),
  'recuerda-los-objetos': React.lazy(() => import('../games/RecuerdaLosObjetos/RecuerdaLosObjetos')),
  'caja-de-recuerdos': React.lazy(() => import('../games/CajaDeRecuerdos/CajaDeRecuerdos')),
  'deja-vu': React.lazy(() => import('../games/DejaVu/DejaVu')),
  'tormenta-de-palabras': React.lazy(() => import('../games/TormentaDePalabras/TormentaDePalabras')),
  'el-lector-del-cosmos': React.lazy(() => import('../games/ElLectorDelCosmos/ElLectorDelCosmos')),
  'matrices-progresivas': React.lazy(() => import('../games/MatricesProgresivas/MatricesProgresivas')),
  'concentrate-en-el-objetivo': React.lazy(() => import('../games/ConcentrateEnElObjetivo/ConcentrateEnElObjetivo')),
  'ruta-de-luces': React.lazy(() => import('../games/RutaDeLuces/RutaLuces')),
  'ruta-de-colores-al-reves': React.lazy(() => import('../games/RutaDeLucesAlReves/RutaLucesAlReves')),
  'cazador-de-burbujas': React.lazy(() => import('../games/CazadorDeBurbujas/CazadorDeBurbujas')),
  'enfoca-la-flecha': React.lazy(() => import('../games/EnfocaLaFlecha/EnfocaLaFlecha')),
  'no-te-despistes': React.lazy(() => import('../games/NoTeDespistes/NoTeDespistes')),
  'safari-fotografico': React.lazy(() => import('../games/SafariFotografico/SafariFotografico')),
  'sopa-de-letras': React.lazy(() => import('../games/SopaDeLetras/SopaDeLetras')),
  'a-fin': React.lazy(() => import('../games/Afin/Afin')),
  'que-sentido-tiene': React.lazy(() => import('../games/QueSentidoTiene/QueSentidoTiene')),
  'tormenta-de-palabras': React.lazy(() => import('../games/TormentaDePalabras/TormentaDePalabras')),
  'el-lector-del-cosmos': React.lazy(() => import('../games/ElLectorDelCosmos/ElLectorDelCosmos')),
  'apunta-y-acierta': React.lazy(() => import('../games/ApuntaYAcierta/ApuntaYAcierta')),
  'construye-la-caneria': React.lazy(() => import('../games/ConstruyeLaCaneria/ConstruyeLaCaneria')),
  'colorea-el-camino': React.lazy(() => import('../games/ColoreaElCamino/ColoreaElCamino')),
  'mosaico-espejo': React.lazy(() => import('../games/MosaicoEspejo/MosaicoEspejo')),
  'trazos-conectados': React.lazy(() => import('../games/TrazosConectados/TrazosConectados')),
  'enfoque-cambiante': React.lazy(() => import('../games/EnfoqueCambiante/EnfoqueCambiante')),
  'comparacion-de-colores': React.lazy(() => import('../games/ComparacionDeColores/ComparacionDeColores')),
  'hojas-navegantes': React.lazy(() => import('../games/HojasNavegantes/HojasNavegantes')),
  'balance-de-balanza': React.lazy(() => import('../games/BalanceDeBalanza/BalanceDeBalanza')),
  
  
};

// crear estos archivos para que funcione
import { matrizMemoriaConfig } from '../games/MatrizMemoria/MatrizMemoria.config';
import { recuerdaObjetosConfig } from '../games/RecuerdaLosObjetos/RecuerdaLosObjetos.config';
import { sigueLaSecuenciaConfig } from '../games/SigueLaSecuencia/SigueLaSecuencia.config';
import { cajaDeRecuerdosConfig } from '../games/CajaDeRecuerdos/CajaDeRecuerdos.config';
import { dejaVuConfig } from '../games/DejaVu/DejaVu.config';
import { matricesProgresivasConfig } from '../games/MatricesProgresivas/MatricesProgresivas.config';
import { concentrateEnElObjetivoConfig } from '../games/ConcentrateEnElObjetivo/ConcentrateEnElObjetivo.config';
import { rutaLucesConfig } from '../games/RutaDeLuces/RutaLuces.config';
import { rutaDeLucesAlRevesConfig } from '../games/RutaDeLucesAlReves/RutaLucesAlReves.config';
import { cazadorDeBurbujasConfig } from '../games/CazadorDeBurbujas/CazadorDeBurbujas.config';
import { enfocaLaFlechaConfig } from '../games/EnfocaLaFlecha/EnfocaLaFlecha.config';
import { noTeDespistesConfig } from '../games/NoTeDespistes/NoTeDespistes.config';
import { safariFotograficoConfig } from '../games/SafariFotografico/SafariFotografico.config';
import { sopaDeLetrasConfig } from '../games/SopaDeLetras/SopaDeLetras.config';
import { aFinConfig } from '../games/Afin/Afin.config';
import { queSentidoTieneConfig } from '../games/QueSentidoTiene/QueSentidoTiene.config';
import { tormentaDePalabrasConfig } from '../games/TormentaDePalabras/TormentaDePalabras.config';
import { lectorDelCosmosConfig } from '../games/ElLectorDelCosmos/ElLectorDelCosmos.config';
import { apuntaYAciertaConfig } from '../games/ApuntaYAcierta/ApuntaYAcierta.config';
import { construyeLaCaneriaConfig } from '../games/ConstruyeLaCaneria/ConstruyeLaCaneria.config';
import { coloreaElCaminoConfig } from '../games/ColoreaElCamino/ColoreaElCamino.config';
import { mosaicoEspejoConfig } from '../games/MosaicoEspejo/MosaicoEspejo.config';
import { trazosConectadosConfig } from '../games/TrazosConectados/TrazosConectados.config';
import { enfoqueCambianteConfig } from '../games/EnfoqueCambiante/EnfoqueCambiante.config';
import { comparacionDeColoresConfig } from '../games/ComparacionDeColores/ComparacionDeColores.config';
import { hojasNavegantesConfig } from '../games/HojasNavegantes/HojasNavegantes.config';
import { balanceDeBalanzaConfig } from '../games/BalanceDeBalanza/BalanceDeBalanza.config';

// El mapa de configs (los "menús" ligeros)
const gameConfigs = {
  'matriz-de-memoria': matrizMemoriaConfig,
  'recuerda-los-objetos': recuerdaObjetosConfig,
  'sigue-la-secuencia': sigueLaSecuenciaConfig,
  'caja-de-recuerdos': cajaDeRecuerdosConfig,
  'deja-vu': dejaVuConfig,
  'matrices-progresivas': matricesProgresivasConfig,
  'concentrate-en-el-objetivo': concentrateEnElObjetivoConfig,
  'ruta-de-luces': rutaLucesConfig,
  'ruta-de-colores-al-reves': rutaDeLucesAlRevesConfig,
  'cazador-de-burbujas': cazadorDeBurbujasConfig,
  'enfoca-la-flecha': enfocaLaFlechaConfig,
  'no-te-despistes': noTeDespistesConfig,
  'safari-fotografico': safariFotograficoConfig,
  'sopa-de-letras': sopaDeLetrasConfig,
  'a-fin': aFinConfig,
  'que-sentido-tiene': queSentidoTieneConfig,
  'tormenta-de-palabras': tormentaDePalabrasConfig,
  'el-lector-del-cosmos': lectorDelCosmosConfig,
  'apunta-y-acierta': apuntaYAciertaConfig,
  'construye-la-caneria': construyeLaCaneriaConfig,
  'colorea-el-camino': coloreaElCaminoConfig,
  'mosaico-espejo': mosaicoEspejoConfig,
  'trazos-conectados': trazosConectadosConfig,
  'enfoque-cambiante': enfoqueCambianteConfig,
  'comparacion-de-colores': comparacionDeColoresConfig,
  'hojas-navegantes': hojasNavegantesConfig,
  'balance-de-balanza': balanceDeBalanzaConfig,
 
   
  
  
  };


export default function GamePlayer() {
  const { gameCode, gameplayId } = useParams(); // 👈 4. AÑADIDO: gameplayId
  const navigate = useNavigate();

  // 👈 5. MODIFICADO: Estado para el flujo (en lugar de solo gameOverData)
  const [gameState, setGameState] = useState('instrucciones'); // 'instrucciones', 'jugando', 'resumen'
  const [gameOverData, setGameOverData] = useState(null); // (Este se queda igual)

  // 👈 6. AÑADIDO: Carga la config ligera
  const gameConfig = useMemo(() => gameConfigs[gameCode] || null, [gameCode]);
  const GameComponent = useMemo(() => gameComponents[gameCode] || null, [gameCode]);

  // 👈 7. AÑADIDO: Handler para empezar el juego
  const handleStartGame = () => {
    setGameState('jugando');
  };

  // 👈 8. MODIFICADO: handleGameOver ahora es "inteligente"
  const handleGameOver = async (rawMetrics) => {
    if (!gameConfig) return; // Seguridad

    // A. Formatea los datos usando la función del config
    const formattedData = gameConfig.formatMetrics(rawMetrics);
    
    // B. Obtiene el score usando la función del config
    const scoreToSave = gameConfig.getScore(rawMetrics);
    
    // C. Guarda en la Base de Datos
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:8000/gameplays/${gameplayId}/results`,
        { score: scoreToSave, results_data: formattedData.metrics },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error al guardar resultado:', error);
    }

    // D. Prepara para mostrar el resumen
    setGameOverData(formattedData); // (Tu línea original)
    setGameState('resumen'); // (Cambiamos el estado)
  };

  const fallbackUI = <div style={{color: 'white', textAlign: 'center', paddingTop: '100px'}}>Cargando juego...</div>;

  // 👈 9. AÑADIDO: Chequeo de que la config exista
  if (!gameConfig || !GameComponent) {
    return (
      <GameCanvas>
        <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
          <h2>Error 404: Juego no encontrado</h2>
          <p>El juego con el código "{gameCode}" no existe o no está configurado.</p>
        </div>
      </GameCanvas>
    );
  }

  // 👈 10. MODIFICADO: El render final usa el gameState
  return (
    <GameCanvas>
      {/* --- ESTADO 1: INSTRUCCIONES --- */}
      {gameState === 'instrucciones' && (
        <Instrucciones
          {...gameConfig.instructions} // Usa la config de instrucciones
          onStartGame={handleStartGame}
          frame={false} // El GameCanvas ya da el marco
        />
      )}

      {/* --- ESTADO 2: JUGANDO --- */}
{gameState === 'jugando' && (
  <Suspense fallback={fallbackUI}>
    <GameComponent
      key={gameplayId || gameCode}
      onGameOver={handleGameOver}
    />
  </Suspense>
)}


      {/* --- ESTADO 3: RESUMEN --- */}
      {gameState === 'resumen' && gameOverData && (
        <ResumenMetricas
         {...gameOverData}
          footer={
            <button className={rm.cta} onClick={() => navigate('/games')}>
              Ver otros juegos
            </button>
          }
        />
      )}
    </GameCanvas>
  );
}
