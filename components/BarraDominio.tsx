import type { EstadoTopico } from "@/lib/dominio";

export const ROTULO_ESTADO: Record<EstadoTopico, string> = {
  nao_visto: "Não visto",
  fraco: "Fraco",
  em_progresso: "Em progresso",
  dominado: "Dominado",
};

const COR_ESTADO: Record<EstadoTopico, string> = {
  nao_visto: "bg-borda",
  fraco: "bg-bad",
  em_progresso: "bg-warn",
  dominado: "bg-ok",
};

export default function BarraDominio({ dominio, estado }: { dominio: number; estado: EstadoTopico }) {
  const pct = estado === "nao_visto" ? 0 : Math.round(dominio * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-label="Domínio do tópico"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${ROTULO_ESTADO[estado]}, ${pct}%`}
        className="h-2.5 w-28 shrink-0 overflow-hidden rounded-full border border-borda bg-surface-2"
      >
        <div className={`h-full ${COR_ESTADO[estado]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-muted">
        {ROTULO_ESTADO[estado]}
        {estado !== "nao_visto" && ` · ${pct}%`}
      </span>
    </div>
  );
}
