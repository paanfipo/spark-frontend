// src/layout/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom'; // <<< IMPORTANTE
import Sidebar from './Sidebar';
import Header from './Header';
import styles from '../pages/Dashboard.module.css';

function DashboardLayout({ user, handleLogout }) {
  return (
    <div className={styles.dashboardLayout}>
      <Header user={user} handleLogout={handleLogout} />
      <Sidebar />
      {/* El Outlet renderizará la página actual (Dashboard o GameList) */}
      <main className={styles.mainContent}>
        <Outlet /> 
      </main>
    </div>
  );
}

export default DashboardLayout;