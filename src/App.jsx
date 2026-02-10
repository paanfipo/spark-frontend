// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Outlet } from 'react-router-dom';
import styles from './App.module.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DashboardLayout from './layout/DashboardLayout'; 
import GameListPage from './pages/GameListPage';

import axios from 'axios';
//import WordStormGame from './pages/WordStormGame';

//IMPORTACIÓN DE JUEGOS
import GamePlayer from './pages/GamePlayer';
//import MatrizMemoria from './games/MatrizMemoria/MatrizMemoria';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (token) {
        try {
          const response = await axios.get('http://localhost:8000/users/me/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
        } catch (error) {
          console.error("Token inválido o error al obtener datos del usuario.", error);
          handleLogout();
        }
      } else {
        setCurrentUser(null);
      }
    };
    fetchUserData();
  }, [token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    navigate('/login');
  };

  // Muestra un estado de carga mientras se verifica el token
  if (token && !currentUser) {
    return <div>Cargando...</div>;
  }

  // --- ESTRUCTURA DE RUTAS CORRECTA ---
  return (
      <div className={styles.appWrapper}>
        <Routes>
          {/* Si el usuario NO está logueado, muestra las rutas de autenticación */}
          {!token ? (
            <>
              <Route path="/login" element={
                <div className={styles.authContainer}>
                  <div className={styles.leftPanel}>
                    <div className={styles.welcomeContent}><h1>Spark</h1><h2>Descubre lo que tu mente puede hacer.</h2></div>
                  </div>
                  <div className={styles.rightPanel}><LoginPage onLoginSuccess={handleLoginSuccess} /></div>
                </div>
              } />
              <Route path="/register" element={
                <div className={styles.authContainer}>
                  <div className={styles.leftPanel}>
                    <div className={styles.welcomeContent}><h1>Spark</h1><h2>Descubre lo que tu mente puede hacer.</h2></div>
                  </div>
                  <div className={styles.rightPanel}><RegisterPage /></div>
                </div>
              } />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            /* Si el usuario SÍ está logueado, TODAS las rutas protegidas van DENTRO del DashboardLayout */
            <Route path="/" element={<DashboardLayout user={currentUser} handleLogout={handleLogout} />}>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<DashboardPage user={currentUser} />} />
              <Route path="games" element={<GameListPage />} />

              {/* <<< RUTA GENERICA DE JUEVO >>> */}
              {/*<Route path="play/:gameplayId" element={<GamePage />} />

              <Route path="play/wordstorm/:gameplayId" element={<WordStormGame />} />*/ }

              <Route path="/play/:gameCode/:gameplayId" element={<GamePlayer />} />
              
            </Route>
          )}
          
          {/* Redirección final si algo sale mal */}
          <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
  );
}

export default App;