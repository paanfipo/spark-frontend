import React from 'react';
import styles from './PauseMenu.module.css';
// Importamos el icono de silencio 'VolumeX'
import { Play, RotateCcw, Volume2, VolumeX, HelpCircle } from 'lucide-react'; 

// Aceptamos 'isSoundEnabled' como prop
export default function PauseMenu({ 
  visible, 
  onResume, 
  onRestart, 
  onToggleSound, 
  onHowTo, 
  isSoundEnabled // <-- Esto ya lo tenías
}) {
  if (!visible) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div 
        className={styles.panel} 
        onClick={(e) => e.stopPropagation()}
      >
      {/* ⬆️ Esta línea detiene el "burbujeo" ⬆️ */}

        <button className={styles.item} onClick={onResume}>
          <span className={styles.icon}><Play size={18} /></span>
          <span className={styles.label}>Reanudar</span>
        </button>

        <button className={styles.item} onClick={onRestart}>
          <span className={styles.icon}><RotateCcw size={18} /></span>
          <span className={styles.label}>Reiniciar</span>
        </button>

        <button className={styles.item} onClick={onToggleSound}>
          <span className={styles.icon}>
            {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </span>
          <span className={styles.label}>
            {isSoundEnabled ? 'Sonido' : 'Silencio'}
          </span>
        </button>

        <button className={styles.item} onClick={onHowTo}>
          <span className={styles.icon}><HelpCircle size={18} /></span>
          <span className={styles.label}>Cómo jugar</span>
        </button>
        
      </div>
    </div>
  );
}