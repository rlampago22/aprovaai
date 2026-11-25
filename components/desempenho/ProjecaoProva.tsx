import { CheckCircle2, Flag, ShieldAlert, ShieldCheck, TriangleAlert, Trophy } from "lucide-react";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import {
  MIN_QUESTOES_DISCIPLINA,
  MIN_QUESTOES_PROJECAO,
  type DesempenhoDisciplina,
} from "@/lib/desempenho";
import { NOTA_MINIMA_GERAL, type ProjecaoNota } from "@/lib/dominio";

interface Props {
  projecao: ProjecaoNota;
  disciplinas: DesempenhoDisciplina[];
  notaAlvo: number;
  totalTentativas: number;
  temBaseProjecao: boolean;
  faltamParaProjecao: number;
  atingeMinimoGeral: boolean;
  atingeMeta: boolean;
}

const formatarDecimal = (n: number) =>
  (Math.round(n * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function ProjecaoProva({
  projecao,
  disciplinas,
  notaAlvo,
  totalTentativas,
  temBaseProjecao,
  faltamParaProjecao,
  atingeMinimoGeral,
  atingeMeta,
}: Props) {
  const notaArredondada = Math.round(projecao.nota);
  const abaixoMinimo = disciplinas.filter((d) => d.comDados && !d.atingeMinimo);
  const faltamParaMeta = Math.max(0, notaAlvo - notaArredondada);
  const pctDesbloqueio = Math.min(100, Math.round((totalTentativas / MIN_QUESTOES_PROJECAO) * 100));

  return (
    <section aria-labelledby="h-projecao" className="cartao cartao-destaque">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="h-projecao" className="rotulo-secao flex items-center gap-2">
            <Trophy aria-hidden="true" className="size-4 text-accent-texto" />
            Projeção de nota e mínimos da prova
          </h2>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="numero-grande text-5xl sm:text-6xl">
              {temBaseProjecao ? notaArredondada : "—"}
            </span>
            <span className="text-xl font-bold text-muted">/ 100 pontos</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-xl bg-surface-2 px-3 py-1.5 font-semibold text-fg">
            Mínimo geral: <span className="tabular-nums">{NOTA_MINIMA_GERAL}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-ambar-bg px-3 py-1.5 font-semibold text-ambar-texto">
            <Flag aria-hidden="true" className="size-3.5" />
            Sua meta: <span className="tabular-nums">{notaAlvo}</span>
          </span>
        </div>
      </div>

      {!temBaseProjecao ? (
        <div className="mt-4 rounded-xl bg-surface-2 p-4">
          <p className="text-sm font-semibold text-fg">
            Projeção liberada após {MIN_QUESTOES_PROJECAO} questões ({totalTentativas} de {MIN_QUESTOES_PROJECAO}{" "}
            feitas)
          </p>
          <p className="mt-1 text-sm text-muted">
            {faltamParaProjecao === 1
              ? "Falta só 1 questão para liberar sua nota projetada."
              : `Faltam ${faltamParaProjecao} questões para liberar sua nota projetada.`}{" "}
            Antes disso, o número seria só um palpite.
          </p>
          <div
            role="progressbar"
            aria-label="Progresso para liberar a projeção de nota"
            aria-valuemin={0}
            aria-valuemax={MIN_QUESTOES_PROJECAO}
            aria-valuenow={Math.min(totalTentativas, MIN_QUESTOES_PROJECAO)}
            className="mt-3 h-2.5 overflow-hidden rounded-full border border-borda bg-surface"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${pctDesbloqueio}%` }} />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">
            Estimativa se a prova fosse hoje, usando seu domínio em cada tópico. Tópico ainda não praticado entra como
            chute (25% em 4 alternativas).
          </p>
          {abaixoMinimo.length > 0 || !atingeMinimoGeral ? (
            <p role="status" className="flex items-start gap-3 rounded-xl bg-warn-bg p-3.5 text-sm font-semibold text-warn">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                {!atingeMinimoGeral && (
                  <>
                    A projeção ({notaArredondada} pontos) ainda está abaixo do mínimo geral de {NOTA_MINIMA_GERAL}{" "}
                    pontos.{" "}
                  </>
                )}
                {abaixoMinimo.length > 0 && (
                  <>
                    Abaixo do mínimo por disciplina em{" "}
                    {abaixoMinimo
                      .map((d) => `${nomeCurtoDisciplina(d.nome)} (mínimo ${d.minimo})`)
                      .join(" e ")}
                    .
                  </>
                )}
              </span>
            </p>
          ) : atingeMeta ? (
            <p role="status" className="flex items-start gap-3 rounded-xl bg-ok-bg p-3.5 text-sm font-semibold text-ok">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                Acima de todos os mínimos do edital e dentro da sua meta de {notaAlvo} pontos. Mantenha as revisões em
                dia para segurar esse patamar.
              </span>
            </p>
          ) : (
            <p role="status" className="flex items-start gap-3 rounded-xl bg-accent-suave p-3.5 text-sm font-semibold text-accent-texto">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                Acima do mínimo geral e dos mínimos nas disciplinas avaliadas. Faltam ~{faltamParaMeta}{" "}
                {faltamParaMeta === 1 ? "ponto" : "pontos"} para bater sua meta de {notaAlvo}.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {disciplinas.map((d) => {
          const pct = (v: number) => `${Math.min(100, Math.max(0, (v / d.questoes_prova) * 100))}%`;
          const taxaPct = d.taxaAcerto != null ? Math.round(d.taxaAcerto * 100) : null;
          return (
            <article
              key={d.disciplina_id}
              className={`rounded-2xl border border-borda bg-bg/60 p-4 ${classeDisciplina(d.nome)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="chip">{nomeCurtoDisciplina(d.nome)}</span>
                <span className="text-xs font-semibold text-muted">
                  {d.questoes_prova} q. · {d.pontosMaximos} pts
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                {d.comDados ? (
                  <>
                    <p className="numero-grande text-2xl text-fg">
                      ~{formatarDecimal(d.acertosEsperados)}
                      <span className="text-sm font-semibold text-muted"> / {d.questoes_prova}</span>
                    </p>
                    <span className="text-xs font-semibold text-muted tabular-nums">
                      ~{Math.round(d.pontos)} pts
                    </span>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted">
                    Sem projeção ainda{" "}
                    <span className="font-normal">
                      ({d.tentativas}/{MIN_QUESTOES_DISCIPLINA} q.)
                    </span>
                  </p>
                )}
              </div>

              <div
                role="meter"
                aria-label={`${d.nome}: acertos esperados na prova`}
                aria-valuemin={0}
                aria-valuemax={d.questoes_prova}
                aria-valuenow={d.comDados ? Number(d.acertosEsperados.toFixed(1)) : 0}
                aria-valuetext={
                  d.comDados
                    ? `${formatarDecimal(d.acertosEsperados)} de ${d.questoes_prova} acertos; mínimo ${d.minimo}; meta ${Math.round(d.metaAcertos)}`
                    : `sem projeção ainda; mínimo ${d.minimo}; meta ${Math.round(d.metaAcertos)}`
                }
                className="relative mt-3 h-4"
              >
                <div className="absolute inset-x-0 top-0.5 h-3 overflow-hidden rounded-full border border-borda-forte bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: d.comDados ? pct(d.acertosEsperados) : 0,
                      minWidth: d.comDados && d.acertosEsperados > 0 ? "0.5rem" : 0,
                      backgroundColor: "var(--d)",
                    }}
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -top-1 h-6 border-l-2 border-dashed border-bad"
                  style={{ left: pct(d.minimo) }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-0 size-4 -translate-x-1/2 rotate-45 rounded-sm border-2 border-surface bg-ambar"
                  style={{ left: pct(d.metaAcertos) }}
                />
              </div>

              <dl className="mt-3 space-y-1 text-xs text-muted">
                <div className="flex items-center justify-between gap-2">
                  <dt>Mínimo do edital</dt>
                  <dd className="inline-flex items-center gap-1 font-semibold">
                    {d.comDados ? (
                      d.atingeMinimo ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <CheckCircle2 aria-hidden="true" className="size-3.5" />
                          {d.minimo} acertos (ok)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-bad">
                          <TriangleAlert aria-hidden="true" className="size-3.5" />
                          {d.minimo} acertos (abaixo)
                        </span>
                      )
                    ) : (
                      <span className="text-fg">{d.minimo} acertos</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Acertos nas feitas</dt>
                  <dd className="font-semibold tabular-nums text-fg">
                    {taxaPct != null ? `${d.acertos}/${d.tentativas} (${taxaPct}%)` : "Nenhuma feita"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Tópicos vistos</dt>
                  <dd className="font-semibold tabular-nums text-fg">
                    {d.topicosVistos} de {d.topicosTotal}
                    {d.topicosDominados > 0 && ` · ${d.topicosDominados} dom.`}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-borda pt-3 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 border-l-2 border-dashed border-bad" />
            mínimo para não ser eliminado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flag aria-hidden="true" className="size-3.5 text-ambar-texto" />
            meta ({notaAlvo}% em cada disciplina)
          </span>
        </p>
        <p>Desempate (após idade): Específicos → Português → Legislação.</p>
      </div>
    </section>
  );
}
