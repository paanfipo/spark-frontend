import React from "react";
import css from "./ResumenMetricas.module.css";

/**
 * <ResumenMetricas
 *   title="Matriz de Memoria"
 *   subtitle="¡Te has quedado sin vidas!"
 *   summary={[{icon:"🏆",label:"Nivel Máximo",value:6}, ...]}
 *   metrics={[
 *     {icon:"📈",label:"Precisión Neta",value:82.35, helper:"...", format:"pct-int"},
 *     {icon:"⏱️",label:"Tiempo Promedio / Nivel",value:1.23, helper:"...", format:"sec-2"},
 *   ]}
 *   tips={["Observa todo el patrón", "Haz chunking por filas/columnas"]}
 *   footer={<button className={css.cta} onClick={...}>Ver otros juegos</button>}
 * />
 */
export default function ResumenMetricas({
  title = "Juego Terminado",
  subtitle,
  summary = [],
  metrics = [],
  tips = [],
  footer = null,
}) {
  return (
    <div className={css.wrap}>
      <h1 className={css.title}>{title}</h1>
      {subtitle && <p className={css.subtitle}>{subtitle}</p>}

      {summary?.length > 0 && (
        <div className={css.topRow}>
          {summary.map((s, i) => (
            <div key={i} className={css.topCard} aria-label={s.label}>
              <div className={css.topIcon}>{s.icon}</div>
              <div className={css.topLabel}>{s.label}</div>
              <div className={css.topValue}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {metrics?.length > 0 && (
        <>
          <h3 className={css.sectionTitle}>Métricas de Desempeño</h3>
          <div className={css.grid}>
            {metrics.map((m, i) => (
              <MetricCard key={i} {...m} />
            ))}
          </div>
        </>
      )}

      {tips?.length > 0 && (
        <div className={css.tipsBlock}>
          <div className={css.tipsTitle}>¿Cómo puedes mejorar?</div>
          <ul className={css.tipsList}>
            {tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {footer && <div className={css.footer}>{footer}</div>}
    </div>
  );
}

function MetricCard({ icon, label, value, helper, format = "raw" }) {
  const nf0 = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let display = value;

  // formatos rápidos y consistentes
  if (format === "int") display = nf0.format(Number(value));
  if (format === "sec-int") display = `${nf0.format(Math.round(Number(value)))} s`;
  if (format === "sec-2") display = `${nf2.format(Number(value))} s`;
  if (format === "pct-int") display = `${nf0.format(Number(value))} %`;
  if (format === "pct-2") display = `${nf2.format(Number(value))} %`;

  return (
    <div className={css.card} role="group" aria-label={label}>
      <div className={css.cardHeader}>
        <span className={css.badge} aria-hidden>{icon}</span>
        <span className={css.cardLabel}>{label}</span>
      </div>
      <div className={css.cardValue}>{display}</div>
      {helper && <div className={css.cardHelper}>{helper}</div>}
    </div>
  );
}
