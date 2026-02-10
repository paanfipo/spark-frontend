// src/layout/GameCanvas.jsx
import React from 'react';
import styles from './GameCanvas.module.css';

function GameCanvas({ children, title }) {
  return (
    <div className={styles.canvasWrapper}>
      <div className={styles.canvasContainer}>
        {/* Aquí es donde se renderizará el juego que le pasemos */}
        <div className={styles.gameArea}>
          {children}
        </div>
      </div>
      {title && <h2 className={styles.gameTitle}>{title}</h2>}
    </div>
  );
}

export default GameCanvas;