// src/pages/DashboardPage.jsx
import React from 'react';

function DashboardPage({ user }) {
  return (
    <>
      <h2>Buenas tardes, {user.first_name}</h2>
      <p>Aquí irá tu entrenamiento diario y estadísticas.</p>
    </>
  );
}

export default DashboardPage;