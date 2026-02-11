// src/components/RegisterForm.jsx
import React, { useState } from 'react';
import styles from './Forms.module.css';

import { api } from '../api';

function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Intenta hacer la petición POST a nuestro endpoint
      await api.post('/users/', formData);
      
      // Si la petición es exitosa, llama a la función del componente padre.
      // La alerta y la redirección se manejarán allí.
      onRegisterSuccess(); 

    } catch (error) {
      // Este bloque ahora es más inteligente y maneja diferentes tipos de errores.
      if (error.response) {
        // El servidor respondió con un código de error (ej: email duplicado)
        console.error('Error de la API:', error.response.data);
        alert('Error: ' + (error.response.data.detail || 'Algo salió mal.'));
      } else if (error.request) {
        // La petición se hizo pero no se recibió respuesta (servidor caído)
        console.error('Error de red:', error.request);
        alert('Error de conexión: No se pudo conectar con el servidor. ¿Está encendido?');
      } else {
        // Ocurrió un error al configurar la petición
        console.error('Error de configuración:', error.message);
        alert('Error: ' + error.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '20px'}}>
      <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>👤</span>
        <input type="text" name="first_name" placeholder="Nombre" value={formData.first_name} onChange={handleChange} />
      </div>
      <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>👥</span>
        <input type="text" name="last_name" placeholder="Apellido" value={formData.last_name} onChange={handleChange} />
      </div>
      <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>📧</span>
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
      </div>
      <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>🔑</span>
        <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />
      </div>
      <button type="submit" className={styles.authButton}>Registrar</button>
    </form>
  );
}

export default RegisterForm;