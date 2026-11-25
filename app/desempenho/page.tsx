"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  Clock,
  Flame,
  Layers,
  Play,
  Target,
} from "lucide-react";
import BarraDominio from "@/components/BarraDominio";
import AcertosPorTopico from "@/components/desempenho/AcertosPorTopico";
import EvolucaoSemanal from "@/components/desempenho/EvolucaoSemanal";
import ProjecaoProva from "@/components/desempenho/ProjecaoProva";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { formatarDuracao } from "@/lib/datas";
import {
  formatarSegundos,
  MIN_QUESTOES_PROJECAO,
  TEMPO_PROVA_POR_QUESTAO_S,
} from "@/lib/desempenho";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { getDesempenho } from "@/lib/queries";

export default function DesempenhoPage() {
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const dados = getDesempenho(catalogo, estado);
  const { resumo, disciplinas, topicos, focoAgora, perfil, revisoesVencidasTotal } = dados;

  const taxaGeralPct = resumo.taxaAcerto != null ? Math.round(resumo.taxaAcerto * 100) : null;
  const taxaFirmePct = resumo.taxaAcertoFirme != null ? Math.round(resumo.taxaAcertoFirme * 100) : null;
  const vistos = resumo.topicosPorEstado.total - resumo.topicosPorEstado.nao_visto;
  const dentroDoRitmoProva =
    resumo.tempoMedioSegundos != null && resumo.tempoMedioSegundos <= TEMPO_PROVA_POR_QUESTAO_S;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Desempenho</h1>
          <p className="mt-1 text-muted">
            Sua projeção de nota, checagem dos mínimos da prova, evolução semanal e acertos em cada tópico.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn">
            <CalendarCheck aria-hidden="true" className="size-4" />
            Roteiro de hoje
          </Link>
          <Link href="/praticar" className="btn btn-primario">
            <Play aria-hidden="true" className="size-4" />
            Praticar agora
          </Link>
        </div>
      </header>

      <section aria-label="Resumo geral" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Target aria-hidden="true" className="size-4 text-accent-texto" />
            Questões feitas
          </p>
          <p className="numero-grande mt-2 text-3xl sm:text-4xl">{resumo.totalTentativas}</p>
          <p className="mt-1.5 text-xs text-muted">
            {taxaGeralPct != null ? (
              <>
                <strong className="text-fg">{taxaGeralPct}% de acerto</strong> ({resumo.totalAcertos}/
                {resumo.totalTentativas})
                {resumo.acertosNoChute > 0 && taxaFirmePct != null && (
                  <> · sem chute: {taxaFirmePct}%</>
                )}
              </>
            ) : (
              "Nenhuma questão feita ainda"
            )}
          </p>
        </article>

        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Layers aria-hidden="true" className="size-4 text-accent-texto" />
            Cobertura do edital
          </p>
          <p className="numero-grande mt-2 text-3xl sm:text-4xl">
            {vistos}
            <span className="text-lg font-bold text-muted"> / {resumo.topicosPorEstado.total}</span>
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {vistos > 0 ? (
              <>
                <strong className="text-ok">{resumo.topicosPorEstado.dominado} dominados</strong> ·{" "}
                {resumo.topicosPorEstado.em_progresso} em progresso ·{" "}
                <strong className={resumo.topicosPorEstado.fraco > 0 ? "text-bad" : "text-muted"}>
                  {resumo.topicosPorEstado.fraco} fracos
                </strong>
              </>
            ) : (
              "Todos os 55 tópicos prontos para começar"
            )}
          </p>
        </article>

        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 text-accent-texto" />
            Tempo por questão
          </p>
          <p className="numero-grande mt-2 text-3xl sm:text-4xl">
            {resumo.tempoMedioSegundos != null ? formatarSegundos(resumo.tempoMedioSegundos) : "—"}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {resumo.tempoMedioSegundos != null ? (
              <span className={dentroDoRitmoProva ? "font-semibold text-ok" : "font-semibold text-warn"}>
                {dentroDoRitmoProva ? "Dentro do ritmo da prova" : "Acima do ritmo da prova"} (4m12s/q.)
              </span>
            ) : (
              "Na prova: 3h30 para 50 q. (4m12s/q.)"
            )}
          </p>
        </article>

        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Flame aria-hidden="true" className="size-4 text-accent-texto" />
            Tempo e constância
          </p>
          <p className="numero-grande mt-2 text-3xl sm:text-4xl">
            {resumo.minutosEstudadosTotal > 0 ? formatarDuracao(resumo.minutosEstudadosTotal) : "0 min"}
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {resumo.diasEstudados7} {resumo.diasEstudados7 === 1 ? "dia" : "dias"} nos últimos 7
            {revisoesVencidasTotal > 0 && ` · ${revisoesVencidasTotal} revisões pendentes`}
          </p>
        </article>
      </section>

      <ProjecaoProva
        projecao={dados.projecao}
        disciplinas={disciplinas}
        notaAlvo={perfil.nota_alvo}
        totalTentativas={resumo.totalTentativas}
        temBaseProjecao={dados.temBaseProjecao}
        faltamParaProjecao={dados.faltamParaProjecao}
        atingeMinimoGeral={dados.atingeMinimoGeral}
        atingeMeta={dados.atingeMeta}
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <EvolucaoSemanal
            semanas={dados.semanas}
            tendencia={dados.tendenciaSemanal}
            notaAlvo={perfil.nota_alvo}
          />
        </div>

        <section aria-labelledby="h-foco" className="cartao xl:col-span-5">
          <h2 id="h-foco" className="rotulo-secao flex items-center gap-2">
            <Target aria-hidden="true" className="size-4 text-accent-texto" />
            Onde focar agora
          </h2>

          {resumo.totalTentativas === 0 ? (
            <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-4">
              <p className="font-semibold text-fg">Ainda sem histórico de questões</p>
              <p className="text-sm text-muted">
                Assim que você praticar seus primeiros tópicos, esta lista vai destacar os assuntos com menor domínio
                que mais pesam na nota da prova — para você saber exatamente o que reforçar.
              </p>
              <p>
                <Link href="/" className="btn btn-primario">
                  <CalendarCheck aria-hidden="true" className="size-4" />
                  Começar pelo roteiro de hoje
                </Link>
              </p>
            </div>
          ) : focoAgora.length === 0 ? (
            <div className="mt-4 space-y-3 rounded-xl bg-ok-bg p-4 text-ok">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
                Todos os tópicos praticados já estão dominados!
              </p>
              <p className="text-sm">
                {resumo.topicosPorEstado.nao_visto > 0
                  ? `Faltam ${resumo.topicosPorEstado.nao_visto} tópicos para ver pela 1ª vez no edital.`
                  : "Você já dominou todos os tópicos do edital. Mantenha o ritmo com revisões."}
              </p>
              <p>
                <Link href="/edital" className="btn">
                  Abrir mapa do edital
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                Tópicos já praticados que mais valem reforçar agora, considerando seu acerto e o peso da disciplina na
                prova.
              </p>
              <ul className="mt-4 space-y-3">
                {focoAgora.map((t) => {
                  const pct = t.taxaAcerto != null ? Math.round(t.taxaAcerto * 100) : 0;
                  return (
                    <li
                      key={t.id}
                      className={`rounded-xl border border-borda bg-bg/60 p-3 ${classeDisciplina(t.disciplina_nome)}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="chip">{nomeCurtoDisciplina(t.disciplina_nome)}</span>
                        <span className="text-xs font-semibold tabular-nums text-muted">
                          {t.acertos}/{t.tentativas} ({pct}%)
                        </span>
                      </div>
                      <p className="mt-1.5 font-semibold text-fg">
                        {t.ordem}. {t.titulo_curto}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <BarraDominio dominio={t.dominio} estado={t.estado} />
                        <div className="flex items-center gap-1.5">
                          <Link href={`/edital/${t.id}`} className="btn !min-h-8 !px-2.5 text-xs">
                            <BookOpen aria-hidden="true" className="size-3.5" />
                            Resumo
                          </Link>
                          <Link href={`/praticar?topico=${t.id}`} className="btn btn-primario !min-h-8 !px-2.5 text-xs">
                            <Play aria-hidden="true" className="size-3.5" />
                            Praticar
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      <AcertosPorTopico
        disciplinas={disciplinas.map((d) => ({ id: d.disciplina_id, nome: d.nome }))}
        topicos={topicos}
      />

      <details className="cartao group">
        <summary className="flex cursor-pointer items-center gap-2 font-bold">
          <CircleHelp aria-hidden="true" className="size-5 text-accent-texto" />
          Como esses números são calculados?
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm text-muted">
          <li>
            <strong className="text-fg">Projeção de nota:</strong> só aparece depois das suas primeiras{" "}
            {MIN_QUESTOES_PROJECAO} questões. Para cada disciplina, tiramos a média do seu domínio nos tópicos dela e
            multiplicamos pelo número de questões da prova (× 2 pontos). Tópicos ainda não praticados entram como chute
            (25%, já que a prova tem 4 alternativas).
          </li>
          <li>
            <strong className="text-fg">Taxa de acerto vs. Domínio:</strong> a taxa de acerto é simples (acertos ÷
            tentativas). O domínio dá peso 2× para o que você fez nos últimos 14 dias e conta acertos marcados como
            &ldquo;Chutei&rdquo; como meio acerto — assim ele reflete o que você realmente sabe hoje. Um tópico vira{" "}
            <strong className="text-fg">Dominado</strong> com domínio ≥ 80% e pelo menos 8 questões feitas.
          </li>
          <li>
            <strong className="text-fg">Mínimos do Edital IFFar 406/2026:</strong> para não ser eliminado, você precisa
            de pelo menos 50 pontos no total e os mínimos por disciplina: 2 de 10 em Português, 2 de 15 em Legislação e
            5 de 25 em Conhecimentos Específicos.
          </li>
          <li>
            <strong className="text-fg">Tempo por questão:</strong> ignora pausas acima de 30 minutos em uma mesma
            questão (por exemplo, se você deixou a aba aberta). Na prova real são 3h30 para 50 questões, o que dá 4m12s
            por questão em média.
          </li>
        </ul>
      </details>
    </div>
  );
}
