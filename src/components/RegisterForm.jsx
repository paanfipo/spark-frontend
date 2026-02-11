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

  // 1) Validación frontend (consistente con tu backend: min_length = 8)
  const pwd = (formData.password || "").trim();
  if (pwd.length < 8) {
    alert("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  try {
    await api.post("/users/", {
      ...formData,
      password: pwd,
      email: (formData.email || "").trim(),
      first_name: (formData.first_name || "").trim(),
      last_name: (formData.last_name || "").trim(),
    });

    onRegisterSuccess();
  } catch (error) {
    if (error.response) {
      // 2) Mostrar detalle real (incluye 422 de validación)
      const data = error.response.data;

      let msg = "Algo salió mal.";
      if (typeof data?.detail === "string") {
        msg = data.detail;
      } else if (Array.isArray(data?.detail)) {
        // Formato típico de FastAPI para errores 422
        msg = data.detail
          .map((d) => {
            const loc = Array.isArray(d.loc) ? d.loc.join(".") : "body";
            return `${loc}: ${d.msg}`;
          })
          .join("\n");
      }

      console.error("Error de la API:", data);
      alert(`Error: ${msg}`);
    } else if (error.request) {
      console.error("Error de red:", error.request);
      alert("Error de conexión: No se pudo conectar con el servidor. ¿Está encendido?");
    } else {
      console.error("Error de configuración:", error.message);
      alert("Error: " + error.message);
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