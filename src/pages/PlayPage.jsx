// src/pages/PlayPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Importa los componentes de TUS juegos
import WordStormGame from '../components/WordStormGame';
// Asumo que tienes un componente para Lector del Cosmos, ajústalo a tu nombre real
import LectorDelCosmosGame from '../components/LectorDelCosmosGame'; 

// IDs de los juegos (puedes encontrarlos en tu base de datos o en el backend)
const LECTOR_DEL_COSMOS_ID = 17;
const TORMENTA_DE_PALABRAS_ID = 16;


function PlayPage() {
  const { gameplayId } = useParams(); // Obtiene el ID de la URL
  const [gameInfo, setGameInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameplayId) return;

    const fetchGameData = async () => {
      const token = localStorage.getItem('token'); // Asegúrate de usar la misma clave que en GameListPage
      try {
        const response = await axios.get(`http://localhost:8000/gameplays/${gameplayId}/data`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGameInfo(response.data.game_info); // Guardamos solo la info del juego
      } catch (err) {
        setError('No se pudo cargar la información del juego.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, [gameplayId]);

  // Función para decidir qué componente de juego renderizar
  const renderGameComponent = () => {
    if (!gameInfo) return <div>No se encontró información del juego.</div>;

    // Usamos un switch para decidir qué componente mostrar
    switch (gameInfo.id) {
      case TORMENTA_DE_PALABRAS_ID:
        // Pasa el gameplayId como prop al componente del juego
        return <WordStormGame gameplayId={gameplayId} />;
      
      case LECTOR_DEL_COSMOS_ID:
        // Asume que tu componente LectorDelCosmos también necesita el gameplayId
        return <LectorDelCosmosGame gameplayId={gameplayId} />;
      
      default:
        return <div>Juego con ID {gameInfo.id} no reconocido.</div>;
    }
  };

  if (isLoading) {
    return <div>Cargando partida...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Llama a la función que renderiza el juego correcto
  return (
    <div className="play-page-container">
      {renderGameComponent()}
    </div>
  );
}

export default PlayPage;