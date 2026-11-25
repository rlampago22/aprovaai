import { CalendarRange, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { SemanaEvolucao, TendenciaSemanal } from "@/lib/desempenho";
import { NOTA_MINIMA_GERAL } from "@/lib/dominio";

interface Props {
  semanas: SemanaEvolucao[];
  tendencia: TendenciaSemanal | null;
  notaAlvo: number;
}

const ALTURA = 140; // px da área das barras

export default function EvolucaoSemanal({ semanas, tendencia, notaAlvo }: Props) {
  const temAlgumaTentativa = semanas.some((s) => s.tentativas > 0);
  const metaPct = Math.min(100, Math.max(0, notaAlvo));

  return (
    <section aria-labelledby="h-evolucao" className="cartao">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="h-evolucao" className="rotulo-secao flex items-center gap-2">
            <CalendarRange aria-hidden="true" className="size-4 text-accent-texto" />
            Evolução semanal de acertos
          </h2>
          <p className="mt-1 text-sm text-muted">
            Últimas {semanas.length} semanas (segunda a domingo): taxa de acerto e total de questões.
          </p>
        </div>

        {tendencia && (
          <p
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              tendencia.diferencaPp > 0
                ? "bg-ok-bg text-ok"
                : tendencia.diferencaPp < 0
                  ? "bg-warn-bg text-warn"
                  : "bg-surface-2 text-muted"
            }`}
          >
            {tendencia.diferencaPp > 0 ? (
              <TrendingUp aria-hidden="true" className="size-3.5" />
            ) : tendencia.diferencaPp < 0 ? (
              <TrendingDown aria-hidden="true" className="size-3.5" />
            ) : (
              <Minus aria-hidden="true" className="size-3.5" />
            )}
            {tendencia.diferencaPp > 0
              ? `+${tendencia.diferencaPp} p.p. na última semana`
              : tendencia.diferencaPp < 0
                ? `${tendencia.diferencaPp} p.p. na última semana`
                : "Estável na última semana"}
          </p>
        )}
      </div>

      <div className="relative mt-5">
        {/* Linhas horizontais de referência (mínimo 50% e meta pessoal) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-6"
          style={{ height: ALTURA }}
        >
          <div
            className="absolute inset-x-0 border-t border-dashed border-bad/60"
            style={{ bottom: `${NOTA_MINIMA_GERAL}%` }}
          />
          <div
            className="absolute inset-x-0 border-t border-dashed border-ambar"
            style={{ bottom: `${metaPct}%` }}
          />
        </div>

        <ul className="relative grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
          {semanas.map((s) => {
            const pct = s.taxaAcerto != null ? Math.round(s.taxaAcerto * 100) : null;
            const corBarra =
              pct == null
                ? ""
                : pct >= metaPct
                  ? "bg-ok"
                  : pct >= NOTA_MINIMA_GERAL
                    ? "bg-accent"
                    : "bg-warn";
            const ariaDesc =
              pct != null
                ? `Semana ${s.periodo}${s.atual ? " (atual)" : ""}: ${pct}% de acerto (${s.acertos} de ${s.tentativas} questões em ${s.diasEstudados} ${s.diasEstudados === 1 ? "dia" : "dias"})`
                : `Semana ${s.periodo}${s.atual ? " (atual)" : ""}: nenhuma questão respondida`;
            return (
              <li
                key={s.inicio}
                aria-label={ariaDesc}
                title={ariaDesc}
                className={`flex flex-col items-center rounded-xl px-1 py-2 ${
                  s.atual ? "bg-accent-suave ring-2 ring-accent" : ""
                }`}
              >
                <span className="mb-1 h-4 text-xs font-bold tabular-nums text-fg">
                  {pct != null ? `${pct}%` : "—"}
                </span>
                <div className="flex items-end" style={{ height: ALTURA }}>
                  <div
                    className="relative w-7 overflow-hidden rounded-md border border-borda-forte bg-surface sm:w-8"
                    style={{ height: ALTURA }}
                  >
                    {pct != null && (
                      <div
                        className={`absolute inset-x-0 bottom-0 rounded-t-sm ${corBarra}`}
                        style={{
                          height: `${pct}%`,
                          minHeight: pct > 0 ? "4px" : 0,
                        }}
                      />
                    )}
                  </div>
                </div>
                <span
                  className={`mt-1.5 text-xs tabular-nums ${
                    s.atual ? "font-extrabold text-accent-texto" : "font-semibold text-muted"
                  }`}
                >
                  {s.rotulo}
                </span>
                <span className="text-[0.7rem] tabular-nums text-muted">
                  {s.tentativas} q.
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-ambar" />
          meta ({metaPct}%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-bad/70" />
          mínimo geral ({NOTA_MINIMA_GERAL}%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-ok" />
          na meta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-accent" />
          acima de 50%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-warn" />
          abaixo de 50%
        </span>
      </div>

      {!temAlgumaTentativa && (
        <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-muted">
          Ainda não há questões registradas nestas semanas. Assim que você responder as primeiras, cada coluna passa a
          mostrar sua porcentagem de acertos e quantas questões fez naquela semana.
        </p>
      )}
    </section>
  );
}
