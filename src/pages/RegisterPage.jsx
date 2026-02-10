// src/pages/RegisterPage.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // <<< 1. ASEGÚRATE DE IMPORTAR useNavigate
import RegisterForm from '../components/RegisterForm';
import styles from '../components/Forms.module.css';

function RegisterPage() {
  const navigate = useNavigate(); // <<< 2. PREPARA EL HOOK DE NAVEGACIÓN

  // <<< 3. DEFINE LA FUNCIÓN QUE SE EJECUTARÁ EN CASO DE ÉXITO
  const handleRegisterSuccess = () => {
    alert('¡Usuario registrado exitosamente!');
    navigate('/login'); // Redirige al usuario a la página de login
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h2>Crea tu cuenta</h2>
        <p>Regístrate para empezar tu entrenamiento.</p>
        
        {/* <<< 4. PASA LA FUNCIÓN COMO PROP AL FORMULARIO */}
        <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
        
        <p className={styles.linkText}>
          ¿Ya eres miembro? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;