"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  ChevronsDownUp,
  ChevronsUpDown,
  Coffee,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { DiaCronograma, SemanaCronograma } from "@/lib/cronograma";
import { formatarDuracao, type DiaSemana } from "@/lib/datas";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { NOME_FASE, type Fase } from "@/lib/planner";

interface Props {
  semanas: SemanaCronograma[];
}

type FiltroFase = "todas" | Fase;

const NOME_DIA: Record<DiaSemana, string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
};

const ESTILO_FASE: Record<Fase, string> = {
  cobertura: "bg-accent-suave text-accent-texto",
  consolidacao: "bg-ambar-bg text-ambar-texto",
  reta_final: "bg-warn-bg text-warn",
};

function LinhaDia({ d }: { d: DiaCronograma }) {
  const base = d.ehHoje
    ? "border-accent bg-accent-suave/60 ring-1 ring-accent"
    : d.tipo === "prova"
      ? "border-ambar bg-ambar-bg/60"
      : d.tipo === "simulado"
        ? "border-borda bg-surface-2/80"
        : d.tipo === "passado" || d.tipo === "folga"
          ? "border-borda/60 bg-bg/40 opacity-80"
          : "border-borda bg-bg/60";

  return (
    <li className={`rounded-xl border p-3 ${base}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-extrabold tabular-nums ${d.ehHoje ? "text-accent-texto" : "text-fg"}`}>
            {NOME_DIA[d.dia]} {d.rotuloCurto}
          </span>
          {d.ehHoje && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-accent-fg">
              Hoje
            </span>
          )}
          {d.tipo === "prova" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ambar px-2.5 py-0.5 text-xs font-extrabold text-[#1a1200]">
              <Trophy aria-hidden="true" className="size-3.5" />
              Dia da prova
            </span>
          )}
          {d.tipo === "simulado" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-suave px-2.5 py-0.5 text-xs font-bold text-accent-texto">
              <ClipboardCheck aria-hidden="true" className="size-3.5" />
              Simulado completo
            </span>
          )}
          {d.tipo === "folga" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
              <Coffee aria-hidden="true" className="size-3.5" />
              Descanso
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
          {d.tipo === "passado" ? (
            <span>
              Feito: <strong className="text-fg">{d.feitoQuestoes}</strong>/{d.metaQuestoes} q.
            </span>
          ) : d.tipo === "prova" ? (
            <span className="font-semibold text-ambar-texto">50 questões · 3h30</span>
          ) : d.minutosPlanejados > 0 ? (
            <span>
              <strong className="text-fg">{formatarDuracao(d.minutosPlanejados)}</strong> · {d.metaQuestoes} q.
              {d.ehHoje && d.feitoQuestoes > 0 && ` (${d.feitoQuestoes} feitas)`}
            </span>
          ) : null}
          {d.ehHoje && (
            <Link href="/" className="font-semibold text-accent-texto underline">
              Abrir roteiro
            </Link>
          )}
          {d.tipo === "simulado" && (
            <Link href="/simulado" className="font-semibold text-accent-texto underline">
              Ir para Simulado
            </Link>
          )}
        </div>
      </div>

      {/* Conteúdo do dia */}
      {d.topicos.length > 0 ? (
        <div className="mt-2.5 space-y-2">
          {d.temAquecimento && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <RotateCcw aria-hidden="true" className="size-3.5 text-accent-texto" />
              Aquecimento com revisão de erros + tópicos previstos:
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {d.topicos.map((t) => (
              <Link
                key={`${d.data}-${t.id}`}
                href={`/edital/${t.id}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border border-borda bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg no-underline transition-colors hover:border-accent-texto hover:bg-surface-2 ${classeDisciplina(t.disciplina_nome)}`}
              >
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-d" />
                <span className="text-d">{nomeCurtoDisciplina(t.disciplina_nome)}:</span>
                <span>
                  {t.ordem}. {t.titulo_curto}
                </span>
                {t.modo === "novo" && (
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-muted">
                    1ª vez
                  </span>
                )}
                {t.modo === "expresso" && (
                  <span className="rounded bg-ambar-bg px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-ambar-texto">
                    expresso
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          {d.tipo === "reta_final" && <Flame aria-hidden="true" className="size-3.5 text-warn" />}
          {d.tipo === "estudo" && <Sparkles aria-hidden="true" className="size-3.5 text-accent-texto" />}
          {d.resumo}
        </p>
      )}
    </li>
  );
}

export default function GradeSemanas({ semanas }: Props) {
  const [filtroFase, setFiltroFase] = useState<FiltroFase>("todas");
  const [abertas, setAbertas] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    semanas.forEach((s, i) => {
      init[s.numero] = i < 2; // Semana atual e próxima abertas por padrão
    });
    return init;
  });

  const filtradas = useMemo(
    () => (filtroFase === "todas" ? semanas : semanas.filter((s) => s.fasePredominante === filtroFase)),
    [semanas, filtroFase],
  );

  const todasAbertas = filtradas.length > 0 && filtradas.every((s) => !!abertas[s.numero]);

  function alternarTodas() {
    const novo = !todasAbertas;
    setAbertas((prev) => {
      const next = { ...prev };
      for (const s of filtradas) next[s.numero] = novo;
      return next;
    });
  }

  function alternarSemana(num: number) {
    setAbertas((prev) => ({ ...prev, [num]: !prev[num] }));
  }

  return (
    <section aria-labelledby="h-semanas" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="h-semanas" className="rotulo-secao flex items-center gap-2">
            <CalendarCheck aria-hidden="true" className="size-4 text-accent-texto" />
            Cronograma semana a semana ({filtradas.length} {filtradas.length === 1 ? "semana" : "semanas"})
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Clique em qualquer tópico previsto para abrir o resumo, vídeo e questões daquela matéria.
          </p>
        </div>

        <button type="button" onClick={alternarTodas} className="btn !min-h-10 text-xs">
          {todasAbertas ? (
            <>
              <ChevronsDownUp aria-hidden="true" className="size-4" />
              Recolher todas
            </>
          ) : (
            <>
              <ChevronsUpDown aria-hidden="true" className="size-4" />
              Expandir todas
            </>
          )}
        </button>
      </div>

      {/* Filtro por fase */}
      <div role="group" aria-label="Filtrar semanas por fase" className="flex flex-wrap gap-1.5">
        {(
          [
            ["todas", `Todas (${semanas.length})`],
            ["cobertura", `Cobertura (${semanas.filter((s) => s.fasePredominante === "cobertura").length})`],
            ["consolidacao", `Consolidação (${semanas.filter((s) => s.fasePredominante === "consolidacao").length})`],
            ["reta_final", `Reta final (${semanas.filter((s) => s.fasePredominante === "reta_final").length})`],
          ] as [FiltroFase, string][]
        ).map(([k, rotulo]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filtroFase === k}
            onClick={() => setFiltroFase(k)}
            className={`min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors ${
              filtroFase === k
                ? "bg-accent-suave text-accent-texto ring-1 ring-accent"
                : "bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* Lista de semanas */}
      <div className="space-y-3">
        {filtradas.map((s) => {
          const aberta = !!abertas[s.numero];
          const rotuloSemana = s.ehSemanaAtual
            ? "Semana atual"
            : s.numero === 2
              ? "Próxima semana"
              : s.ehSemanaProva
                ? `Semana ${s.numero} · Semana da prova`
                : `Semana ${s.numero}`;
          return (
            <article
              key={s.inicio}
              className={`cartao !p-0 overflow-hidden ${s.ehSemanaAtual ? "cartao-destaque" : ""}`}
            >
              <button
                type="button"
                aria-expanded={aberta}
                onClick={() => alternarSemana(s.numero)}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-surface-2/60 sm:px-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 shrink-0 text-muted transition-transform ${aberta ? "rotate-180" : ""}`}
                  />
                  <span className="titulo text-base font-extrabold text-fg">{rotuloSemana}</span>
                  <span className="text-sm font-semibold tabular-nums text-muted">({s.periodo})</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_FASE[s.fasePredominante]}`}>
                    {NOME_FASE[s.fasePredominante]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted tabular-nums">
                  {s.topicosNovosPrevistos > 0 && (
                    <span className="rounded-lg bg-surface-2 px-2 py-1 font-semibold text-fg">
                      +{s.topicosNovosPrevistos} {s.topicosNovosPrevistos === 1 ? "tópico novo" : "tópicos novos"}
                    </span>
                  )}
                  <span className="rounded-lg bg-surface-2 px-2 py-1">
                    ~{s.questoesPrevistas} q. · {formatarDuracao(s.minutosPrevistos)}
                  </span>
                  {s.temSimuladoCompleto && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-accent-suave px-2 py-1 font-semibold text-accent-texto">
                      <ClipboardCheck aria-hidden="true" className="size-3.5" />
                      Simulado
                    </span>
                  )}
                </div>
              </button>

              {aberta && (
                <div className="border-t border-borda p-3 sm:p-4">
                  <ul className="space-y-2">
                    {s.dias.map((d) => (
                      <LinhaDia key={d.data} d={d} />
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
