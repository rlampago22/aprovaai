"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  CircleX,
  ClipboardCheck,
  Flag,
  Play,
  ShieldAlert,
  ShieldCheck,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import { formatarDataBR } from "@/lib/datas";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import type { QuestaoSimulado, SimuladoDetalhe } from "@/lib/queries";
import type { ResultadoSimulado } from "@/lib/simulado";

interface Props {
  titulo: string;
  finalizadoEm: string;
  notaAlvo: number;
  questoes: QuestaoSimulado[];
  respostas: SimuladoDetalhe["respostas"];
  resultado: ResultadoSimulado;
}

type FiltroRevisao = "todas" | "erradas" | "chutadas" | "acertadas";

export default function ResultadoSimuladoView({
  titulo,
  finalizadoEm,
  notaAlvo,
  questoes,
  respostas,
  resultado,
}: Props) {
  const [filtro, setFiltro] = useState<FiltroRevisao>("erradas");

  const itensComIndice = useMemo(
    () =>
      questoes.map((q, i) => {
        const r = respostas[q.id];
        return {
          numero: i + 1,
          q,
          resposta: r?.resposta ?? null,
          acertou: !!r?.acertou,
          chutou: !!r?.chutou,
        };
      }),
    [questoes, respostas],
  );

  const filtrados = useMemo(() => {
    if (filtro === "todas") return itensComIndice;
    if (filtro === "erradas") return itensComIndice.filter((x) => !x.acertou);
    if (filtro === "chutadas") return itensComIndice.filter((x) => x.chutou);
    return itensComIndice.filter((x) => x.acertou);
  }, [itensComIndice, filtro]);

  const notaTexto = Number.isInteger(resultado.nota)
    ? String(resultado.nota)
    : resultado.nota.toFixed(1).replace(".", ",");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo-secao">Resultado do simulado · {formatarDataBR(finalizadoEm)}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/simulado" className="btn">
            <ClipboardCheck aria-hidden="true" className="size-4" />
            Novo simulado
          </Link>
          <Link href="/desempenho" className="btn btn-primario">
            Ver desempenho geral
          </Link>
        </div>
      </header>

      {/* Placar principal e veredito do edital */}
      <section aria-labelledby="h-placar" className="cartao cartao-destaque space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="h-placar" className="rotulo-secao">
              Nota obtida
            </h2>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="numero-grande text-5xl sm:text-6xl">{notaTexto}</span>
              <span className="text-xl font-bold text-muted">/ 100 pontos</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-xl bg-surface-2 px-3 py-1.5 font-semibold text-fg tabular-nums">
              {resultado.acertos}/{resultado.totalQuestoes} acertos (
              {resultado.totalQuestoes > 0 ? Math.round((resultado.acertos / resultado.totalQuestoes) * 100) : 0}%)
            </span>
            {resultado.emBranco > 0 && (
              <span className="rounded-xl bg-warn-bg px-3 py-1.5 font-semibold text-warn tabular-nums">
                {resultado.emBranco} em branco
              </span>
            )}
            {resultado.chutes > 0 && (
              <span className="rounded-xl bg-ambar-bg px-3 py-1.5 font-semibold text-ambar-texto tabular-nums">
                {resultado.chutes} {resultado.chutes === 1 ? "chute" : "chutes"} ({resultado.acertosNoChute}{" "}
                {resultado.acertosNoChute === 1 ? "acerto" : "acertos"})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-ambar-bg px-3 py-1.5 font-semibold text-ambar-texto">
              <Flag aria-hidden="true" className="size-3.5" />
              Meta: {notaAlvo}
            </span>
          </div>
        </div>

        {resultado.regrasOficiaisAplicaveis ? (
          resultado.aprovado ? (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-ok-bg p-4 text-ok">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
              <div>
                <p className="font-extrabold">
                  Aprovado pelos critérios do Edital IFFar 406/2026
                  {resultado.atingeMeta && " — e acima da sua meta!"}
                </p>
                <p className="mt-0.5 text-sm">
                  Você bateu o mínimo geral (50 pontos) e todos os mínimos por disciplina (2 em Português, 2 em
                  Legislação e 5 em Específicos).
                </p>
              </div>
            </div>
          ) : (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-bad-bg p-4 text-bad">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
              <div>
                <p className="font-extrabold">Eliminado pelos critérios do Edital IFFar 406/2026</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  {resultado.motivosEliminacao.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
            Simulado de recorte: a checagem oficial de eliminação (mínimos por disciplina + 50/100) vale no{" "}
            <strong className="text-fg">Simulado completo (50 questões)</strong>. As questões erradas ou chutadas já
            foram enviadas para a sua fila de revisão de amanhã.
          </p>
        )}

        {/* Barras por disciplina */}
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          {resultado.porDisciplina.map((d) => {
            const pct = (v: number) => `${Math.min(100, Math.max(0, (v / d.total) * 100))}%`;
            return (
              <article
                key={d.disciplina_id}
                className={`rounded-2xl border border-borda bg-bg/60 p-4 ${classeDisciplina(d.nome)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="chip">{nomeCurtoDisciplina(d.nome)}</span>
                  <span className="text-xs font-semibold tabular-nums text-muted">
                    {Math.round(d.taxaAcerto * 100)}%
                  </span>
                </div>
                <p className="numero-grande mt-3 text-2xl text-fg">
                  {d.acertos}
                  <span className="text-sm font-semibold text-muted"> / {d.total} acertos</span>
                </p>
                <div
                  role="meter"
                  aria-label={`${d.nome}: ${d.acertos} de ${d.total} acertos`}
                  aria-valuemin={0}
                  aria-valuemax={d.total}
                  aria-valuenow={d.acertos}
                  className="relative mt-3 h-4"
                >
                  <div className="absolute inset-x-0 top-0.5 h-3 overflow-hidden rounded-full border border-borda-forte bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: pct(d.acertos),
                        minWidth: d.acertos > 0 ? "0.5rem" : 0,
                        backgroundColor: "var(--d)",
                      }}
                    />
                  </div>
                  {d.minimoAplicavel && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 h-6 border-l-2 border-dashed border-bad"
                      style={{ left: pct(d.minimo) }}
                    />
                  )}
                </div>
                <p className="mt-2 text-xs">
                  {d.minimoAplicavel ? (
                    d.atingeMinimo ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-ok">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        Mínimo de {d.minimo} atingido ({d.pontos} pts)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-bad">
                        <TriangleAlert aria-hidden="true" className="size-3.5" />
                        Abaixo do mínimo de {d.minimo} acertos
                      </span>
                    )
                  ) : (
                    <span className="text-muted">
                      {d.emBranco > 0 ? `${d.emBranco} em branco` : "Todas respondidas"}
                    </span>
                  )}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Tópicos para reforçar */}
      <section aria-labelledby="h-reforco" className="cartao">
        <h2 id="h-reforco" className="rotulo-secao flex items-center gap-2">
          <Target aria-hidden="true" className="size-4 text-accent-texto" />
          Tópicos para reforçar a partir deste simulado
        </h2>

        {resultado.topicosReforcar.length === 0 ? (
          <p className="mt-3 rounded-xl bg-ok-bg p-4 font-semibold text-ok">
            Nenhum erro nem chute neste simulado. Excelente desempenho!
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-borda border-t border-borda">
            {resultado.topicosReforcar.map((t) => (
              <li
                key={t.topico_id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${classeDisciplina(t.disciplina_nome)}`}
              >
                <div className="min-w-0 flex-1 basis-60">
                  <span className="chip">{nomeCurtoDisciplina(t.disciplina_nome)}</span>
                  <p className="mt-1 font-semibold text-fg">{t.topico_titulo}</p>
                  <p className="text-xs text-muted">
                    {t.acertos}/{t.total} acertos
                    {t.erros > 0 && ` · ${t.erros} ${t.erros === 1 ? "erro" : "erros"}`}
                    {t.chutes > 0 && ` · ${t.chutes} ${t.chutes === 1 ? "chute" : "chutes"}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/edital/${t.topico_id}`} className="btn !min-h-9 !px-3 text-xs">
                    <BookOpen aria-hidden="true" className="size-3.5" />
                    Resumo
                  </Link>
                  <Link href={`/praticar?topico=${t.topico_id}`} className="btn btn-primario !min-h-9 !px-3 text-xs">
                    <Play aria-hidden="true" className="size-3.5" />
                    Praticar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gabarito comentado */}
      <section aria-labelledby="h-gabarito" className="cartao space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="h-gabarito" className="rotulo-secao">
              Gabarito comentado
            </h2>
            <p className="mt-1 text-sm text-muted">
              Revise cada questão com a explicação de todas as alternativas.
            </p>
          </div>

          <div role="group" aria-label="Filtrar revisão" className="flex flex-wrap gap-1.5">
            {(
              [
                ["erradas", `Erradas/branco (${resultado.erros})`],
                ["chutadas", `Chutadas (${resultado.chutes})`],
                ["acertadas", `Acertadas (${resultado.acertos})`],
                ["todas", `Todas (${resultado.totalQuestoes})`],
              ] as [FiltroRevisao, string][]
            ).map(([k, rotulo]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filtro === k}
                onClick={() => setFiltro(k)}
                className={`min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold ${
                  filtro === k
                    ? "bg-accent-suave text-accent-texto ring-1 ring-accent"
                    : "bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
            Nenhuma questão neste filtro. Use os botões acima para ver todas as questões.
          </p>
        ) : (
          <ol className="space-y-4">
            {filtrados.map(({ numero, q, resposta, acertou, chutou }) => (
              <li
                key={q.id}
                className={`rounded-2xl border border-borda bg-bg/50 p-4 space-y-3 ${classeDisciplina(q.disciplina_nome)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-fg">Questão {numero}</span>
                    <span className="chip">{nomeCurtoDisciplina(q.disciplina_nome)}</span>
                    <span className="text-muted">{q.topico_titulo}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    {acertou ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ok-bg px-2.5 py-0.5 text-ok">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        Acertou{chutou ? " (no chute)" : ""}
                      </span>
                    ) : resposta ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bad-bg px-2.5 py-0.5 text-bad">
                        <CircleX aria-hidden="true" className="size-3.5" />
                        Errou (marcou {resposta} · correta {q.correta})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">
                        Em branco (correta {q.correta})
                      </span>
                    )}
                  </div>
                </div>

                {q.texto_base && (
                  <details className="rounded-xl border border-borda bg-surface p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-accent-texto">
                      Ver texto-base desta questão
                    </summary>
                    <p className="mt-2 whitespace-pre-line leading-relaxed text-fg">{q.texto_base}</p>
                  </details>
                )}

                <p className="whitespace-pre-line font-semibold text-fg">{q.enunciado}</p>

                <ul className="space-y-2">
                  {q.alternativas.map((a) => {
                    const ehCorreta = a.letra === q.correta;
                    const ehMarcadaErrada = resposta === a.letra && !ehCorreta;
                    return (
                      <li
                        key={a.letra}
                        className={`rounded-xl border p-3 text-sm ${
                          ehCorreta
                            ? "border-ok bg-ok-bg"
                            : ehMarcadaErrada
                              ? "border-bad bg-bad-bg"
                              : "border-borda bg-surface"
                        }`}
                      >
                        <p className="flex items-start gap-2 font-medium text-fg">
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                              ehCorreta
                                ? "bg-ok text-surface"
                                : ehMarcadaErrada
                                  ? "bg-bad text-surface"
                                  : "bg-surface-2 text-fg"
                            }`}
                          >
                            {ehCorreta ? <Check className="size-3.5" /> : ehMarcadaErrada ? <X className="size-3.5" /> : a.letra}
                          </span>
                          <span>
                            {a.texto}
                            {ehCorreta && <strong className="ml-2 text-ok">Correta</strong>}
                            {ehMarcadaErrada && <strong className="ml-2 text-bad">Sua resposta</strong>}
                          </span>
                        </p>
                        <p className="mt-1 pl-8 text-xs text-muted">{a.explicacao}</p>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
