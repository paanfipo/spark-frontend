import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiBarChart2, FiHome, FiLayers } from "react-icons/fi";
import styles from "./Sidebar.module.css";

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();

  // Colapsa por defecto en pantallas pequeñas
  useEffect(() => {
    if (window.innerWidth < 1024) setCollapsed(true);
  }, []);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      

      <nav className={styles.nav}>
        <ul>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ""}`
              }
            >
              <FiHome className={styles.icon} />
              <span className={styles.text}>Las actividades de hoy</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/games"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ""}`
              }
            >
              <FiLayers className={styles.icon} />
              <span className={styles.text}>Juegos</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/stats"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ""}`
              }
            >
              <FiBarChart2 className={styles.icon} />
              <span className={styles.text}>Estadísticas</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {!collapsed && (
        <div className={styles.footerHint}>
          <small className={styles.pathHint}>{pathname}</small>
          <small>v1.0 • Beta</small>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
