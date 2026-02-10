// src/pages/LoginPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import styles from '../components/Forms.module.css'; // La importación es correcta

function LoginPage({ onLoginSuccess }) {
  return (
    // <<< 1. AÑADE EL CONTENEDOR PRINCIPAL >>>
    <div className={styles.authContainer}>
      {/* <<< 2. AÑADE LA CAJA CON SOMBRAS >>> */}
      <div className={styles.authBox}>
        <h2>Bienvenido de nuevo</h2>
        <p>Inicia sesión en tu cuenta.</p>
        <LoginForm onLoginSuccess={onLoginSuccess} />
        {/* <<< 3. APLICA EL ESTILO AL TEXTO DEL ENLACE >>> */}
        <p className={styles.linkText}>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;