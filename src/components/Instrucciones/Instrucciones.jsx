// src/components/Instrucciones/Instrucciones.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./Instrucciones.module.css";

/**
 * Props esperadas:
 * - title, subtitle, chips, onStartGame, infoCards, heroImage, background, frame (igual que ya tienes)
 * - tutorial: {
 *     gameId: string | number,        // 👈 clave única por juego para recordar si se omite
 *     steps: Array<{
 *       title?: string,
 *       body?: string,
 *       media?: { type?: 'img'|'video'|'gif', src: string, alt?: string }
 *       render?: React.ReactNode       // opcional: puedes pasar un JSX de demo
 *     }>,
 *     startLabel?: string,             // texto del botón final (default "Comenzar")
 *     showOnFirstPlay?: boolean        // default true: muestra tutorial la primera vez
 *   }
 */
export default function Instrucciones({
  title,
  subtitle,
  chips = [],
  onStartGame,
  infoCards = [],
  heroImage,
  heroImageSize,
  background,
  frame = true,

  tutorial, 
}) {
  // ===== Mini-tutorial (por juego) =====
  const tutorialKey = useMemo(() => {
    if (!tutorial?.gameId) return null;
    return `tutorial.skip.${tutorial.gameId}`;
  }, [tutorial]);

  // Si showOnFirstPlay !== false, por defecto mostramos tutorial la primera vez.
  const [showTutorial, setShowTutorial] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Al cargar, decidimos si mostrar tutorial automáticamente o no.
  useEffect(() => {
    if (!tutorialKey) return;
    const skip = localStorage.getItem(tutorialKey) === "1";
    const wantsFirstTime = tutorial?.showOnFirstPlay !== false;
    if (!skip && wantsFirstTime) {
      // no abrimos aún para no interrumpir layout: lo abrimos al presionar Jugar,
      // pero si quieres auto-abrir al cargar, descomenta la línea siguiente:
      // setShowTutorial(true);
    }
  }, [tutorialKey, tutorial?.showOnFirstPlay]);

  const openTutorial = useCallback(() => {
    // reset al principio cada vez que se abre
    setStepIdx(0);
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handlePrimaryPlayClick = useCallback(() => {
    if (!tutorialKey) {
      onStartGame?.();
      return;
    }
    const skip = localStorage.getItem(tutorialKey) === "1";
    // Si el usuario eligió "no mostrar de nuevo", entramos directo.
    if (skip) {
      onStartGame?.();
    } else {
      openTutorial();
    }
  }, [onStartGame, openTutorial, tutorialKey]);

  const handleStartFromTutorial = useCallback(() => {
    if (dontShowAgain && tutorialKey) {
      localStorage.setItem(tutorialKey, "1");
    }
    setShowTutorial(false);
    onStartGame?.();
  }, [dontShowAgain, onStartGame, tutorialKey]);

  // Navegación con teclado (← → Enter)
  useEffect(() => {
    if (!showTutorial) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        setStepIdx((i) => Math.min(i + 1, (tutorial?.steps?.length ?? 1) - 1));
      } else if (e.key === "ArrowLeft") {
        setStepIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (stepIdx === (tutorial?.steps?.length ?? 1) - 1) {
          handleStartFromTutorial();
        } else {
          setStepIdx((i) => Math.min(i + 1, (tutorial?.steps?.length ?? 1) - 1));
        }
      } else if (e.key === "Escape") {
        closeTutorial();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTutorial, stepIdx, tutorial?.steps?.length, handleStartFromTutorial, closeTutorial]);

  const Content = (
    <>
      {/* HERO oscuro */}
      <section
        className={styles.hero}
        style={{
          "--hero-bg": background,
          "--hero-image": `url(${heroImage})`,
          "--hero-image-size": heroImageSize,
        }}
      >
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{title}</h1>
          {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}

          {chips?.length > 0 && (
            <div className={styles.heroChips}>
              {chips.map((chip, i) => (
                <span key={i} className={styles.chip}>{chip}</span>
              ))}
            </div>
          )}

          <button className={styles.playBtn} onClick={handlePrimaryPlayClick}>
            Jugar
          </button>
        </div>
      </section>

      {/* Tarjetas bajo el hero */}
      {infoCards?.length > 0 && (
        <div className={styles.infoSection}>
          {infoCards.map((card, idx) => (
            <div key={idx} className={styles.infoCard}>
              <h3>{card.title}</h3>
              <div className={styles.infoBody}>{card.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal de mini-tutorial (si está definido) ===== */}
      {tutorial?.steps?.length > 0 && showTutorial && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.tutorialModal} data-game={tutorial?.gameId}>
            <div className={styles.tutorialHeader}>
              <span className={styles.tutoBadge}>Minitutorial</span>
              <div className={styles.tutoCloseArea}>
                <button className={styles.tutoSkip} onClick={handleStartFromTutorial}>
                  Omitir
                </button>
                <button className={styles.tutoClose} onClick={closeTutorial} aria-label="Cerrar">×</button>
              </div>
            </div>



            <div className={styles.tutorialContent}>
              <div className={styles.tutorialStep}>
                {/* Paso actual */}
                {(() => {
                  const step = tutorial.steps[stepIdx] ?? {};
                  return (
                    <>
                      {step.title && <h3 className={styles.tutoStepTitle}>{step.title}</h3>}
                      {step.body && <p className={styles.tutoStepText}>{step.body}</p>}

                      {/* Media: img / video / gif o JSX */}
                      {step.render ? (
                        <div className={styles.tutorialMedia}>{step.render}</div>
                      ) : step.media?.type === "video" ? (
                        <div className={styles.tutorialMedia}>
                          <video className={styles.tutoVideo} src={step.media.src} autoPlay loop muted playsInline />
                        </div>
                      ) : step.media?.src ? (
                        <div className={styles.tutorialMedia}>
                          <img className={styles.tutoImg} src={step.media.src} alt={step.media.alt || ""} />
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className={styles.tutoFooter}>
              {/* Dots + pasos */}
              <div className={styles.tutorialDots}>
                {tutorial.steps.map((_, i) => (
                  <button
                    key={i}
                    className={i === stepIdx ? styles.tutorialDotActive : styles.tutorialDot}
                    onClick={() => setStepIdx(i)}
                    aria-label={`Ir al paso ${i + 1}`}
                  />
                ))}
              </div>

              {/* Controles */}
              <div className={styles.tutorialControls}>
                <button
                  className={`${styles.tutorialBtn} ${styles.prev}`}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  disabled={stepIdx === 0}
                >
                  Anterior
                </button>

                {stepIdx < tutorial.steps.length - 1 ? (
                  <button
                    className={`${styles.tutorialBtn} ${styles.next}`}
                    onClick={() => setStepIdx((i) => Math.min(tutorial.steps.length - 1, i + 1))}
                  >
                    Siguiente
                  </button>
                ) : (
                  <button className={`${styles.tutorialBtn} ${styles.next}`} onClick={handleStartFromTutorial}>
                    {tutorial.startLabel || "Comenzar"}
                  </button>
                )}
              </div>

              {/* No mostrar de nuevo */}
              {tutorialKey && (
                <label className={styles.tutoSkipRow}>
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                  />
                  <span>No mostrar de nuevo para este juego</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return frame ? <div className={styles.frame}>{Content}</div> : Content;
}
