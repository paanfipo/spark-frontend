// src/components/LoginForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import styles from './Forms.module.css';

function LoginForm({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: '', // El backend espera 'username' para el login
    password: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Limpia errores previos

    try {
      // FastAPI espera los datos del login como 'form data', no como JSON.
      // Esto es un formato estándar para OAuth2.
      const params = new URLSearchParams();
      params.append('username', formData.username);
      params.append('password', formData.password);

      const response = await axios.post('http://localhost:8000/token', params);

      const { access_token } = response.data;

      // Guarda el token en el almacenamiento local del navegador
      localStorage.setItem('token', access_token);

      // Llama a la función del componente padre para avisar que el login fue exitoso
      onLoginSuccess(access_token);

    } catch (err) {
      setError('Email o contraseña incorrectos.');
      console.error('Error de login:', err);
    }
  };


  return (
    <form onSubmit={handleSubmit} style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '20px'}}>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        
        <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>📧</span>
        <input
            type="email"
            name="username"
            placeholder="Email"
            value={formData.username}
            onChange={handleChange}
            required
        />
        </div>
        
        <div className={styles.inputGroup}>
        <span className={styles.inputIcon}>🔑</span>
        <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
        />
        </div>
        
        <button type="submit" className={styles.authButton}>Entrar</button>
    </form>
    );
}

export default LoginForm;