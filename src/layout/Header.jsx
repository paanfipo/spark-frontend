import React from "react";
import styles from "./Header.module.css";
import { FaCalendarDays } from "react-icons/fa6";

function Header({ user, handleLogout }) {
  return (
    <header className={styles.header}>
      {/* IZQUIERDA: logo */}
      <div className={styles.leftGroup}>
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          <strong> Spark</strong>
        </div>
      </div>

      {/* CENTRO: pills a dominios */}
      {/* CENTRO: solo dominios */}
<div className={styles.centerGroup}>
  <a href="/games#memoria" className={styles.pill}>Memoria</a>
  <a href="/games#atencion" className={styles.pill}>Atención</a>
  <a href="/games#lenguaje" className={styles.pill}>Lenguaje</a>
  <a href="/games#ejecutivas" className={styles.pill}>Ejecutivas</a>
  <a href="/games#visoconstructivas" className={styles.pill}>Visoconstructivas</a>
</div>

{/* DERECHA: racha + energía + usuario */}
<div className={styles.userDetails}>
  <div className={styles.statItem} title="Racha">
    <FaCalendarDays className={styles.statIcon} />
    <span>¡Racha!</span>
  </div>
  <div className={styles.statItem} title="Energía cerebral">
    <span>⚡ Energía</span>
  </div>
  <div className={styles.dropdown}>
    <button className={styles.dropdownButton} aria-haspopup="menu">
      {user?.first_name?.toUpperCase?.() || "USUARIO"}
      <span className={styles.caret}>▾</span>
    </button>
    <div role="menu" className={styles.dropdownContent}>
      <a href="/settings">Configuración</a>
      <a href="/help">Ayuda</a>
      <button onClick={handleLogout} className={styles.logoutBtn}>
        Cerrar sesión
      </button>
    </div>
  </div>
</div>

    </header>
  );
}

export default Header;
