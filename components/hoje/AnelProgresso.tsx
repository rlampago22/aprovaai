/** Anel de progresso em SVG: questões feitas / meta do dia. */
export default function AnelProgresso({ feitas, meta, tamanho = 152 }: { feitas: number; meta: number; tamanho?: number }) {
  const raio = 54;
  const circ = 2 * Math.PI * raio;
  const pct = meta > 0 ? Math.min(1, feitas / meta) : 0;
  const batida = feitas >= meta && meta > 0;
  return (
    <div
      role="img"
      aria-label={`${feitas} de ${meta} questões feitas hoje`}
      className="relative shrink-0"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg viewBox="0 0 128 128" width={tamanho} height={tamanho} aria-hidden="true" className="-rotate-90">
        <circle cx="64" cy="64" r={raio} fill="none" strokeWidth="12" stroke="var(--surface-2)" />
        <circle
          className="anel-progresso"
          cx="64"
          cy="64"
          r={raio}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          stroke={batida ? "var(--ok)" : "var(--accent)"}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="numero-grande text-4xl text-fg">
          {feitas}
          <span className="text-2xl text-muted">/{meta}</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-muted">questões</p>
      </div>
    </div>
  );
}
