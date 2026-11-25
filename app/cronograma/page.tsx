"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Layers,
  SlidersHorizontal,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import GradeSemanas from "@/components/cronograma/GradeSemanas";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { formatarDataBR, formatarDataCurta, formatarDuracao } from "@/lib/datas";
import { getCronograma } from "@/lib/hoje";
import { DESCRICAO_FASE, NOME_FASE } from "@/lib/planner";

export default function CronogramaPage() {
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const c = getCronograma(catalogo, estado);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Cronograma até a prova</h1>
          <p className="mt-1 text-muted">
            Visão completa de hoje ({formatarDataBR(c.hoje)}) até a prova ({formatarDataBR(c.dataProva)}). Este mapa se
            recalcula sozinho conforme você estuda ou ajusta seus horários — não é uma planilha engessada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primario">
            <CalendarCheck aria-hidden="true" className="size-4" />
            Roteiro de hoje
          </Link>
          <Link href="/perfil" className="btn">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Ajustar horários
          </Link>
        </div>
      </header>

      <section aria-labelledby="h-fases" className="cartao">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-fases" className="rotulo-secao">
            As 3 fases até {formatarDataBR(c.dataProva)}
          </h2>
          <span className="text-xs font-semibold text-muted">
            {c.diasAteProva > 0 ? `Faltam ${c.diasAteProva} dias` : "Dia da prova"}
          </span>
        </div>

        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {c.fases.map((b, i) => (
            <li
              key={b.fase}
              className={`rounded-2xl border p-3.5 ${
                b.ativa
                  ? "border-accent bg-accent-suave/60 ring-1 ring-accent"
                  : b.passada
                    ? "border-borda bg-bg/40 opacity-65"
                    : "border-borda bg-bg/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">Fase {i + 1}</span>
                {b.ativa && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-bold uppercase text-accent-fg">
                    Você está aqui
                  </span>
                )}
              </div>
              <p className="mt-1 font-extrabold text-fg">{NOME_FASE[b.fase]}</p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-accent-texto">
                {b.passada
                  ? "Concluída"
                  : `${formatarDataCurta(b.inicio)} a ${formatarDataCurta(b.fim)} (${b.dias} ${b.dias === 1 ? "dia" : "dias"})`}
              </p>
              <p className="mt-1.5 text-xs text-muted">{DESCRICAO_FASE[b.fase]}</p>
            </li>
          ))}

          <li className="rounded-2xl border border-ambar bg-ambar-bg/60 p-3.5">
            <span className="text-xs font-bold uppercase tracking-wide text-ambar-texto">Alvo</span>
            <p className="mt-1 flex items-center gap-1.5 font-extrabold text-fg">
              <Trophy aria-hidden="true" className="size-4 text-ambar-texto" />
              Prova IFFar
            </p>
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-ambar-texto">
              {formatarDataBR(c.dataProva)}
            </p>
            <p className="mt-1.5 text-xs text-muted">
              50 questões · 4 alternativas · 3h30 · mínimo 50/100.
            </p>
          </li>
        </ol>
      </section>

      <section aria-label="Resumo do ritmo" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Layers aria-hidden="true" className="size-4 text-accent-texto" />
            1ª passagem pelos {c.totalTopicos} tópicos
          </p>
          {c.topicosNaoVistos === 0 ? (
            <>
              <p className="mt-2 flex items-center gap-2 text-xl font-extrabold text-ok">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
                Edital 100% visto
              </p>
              <p className="mt-1 text-xs text-muted">Todos os {c.totalTopicos} tópicos já foram praticados.</p>
            </>
          ) : c.dataConclusaoCobertura ? (
            <>
              <p className="numero-grande mt-2 text-3xl text-fg">{formatarDataBR(c.dataConclusaoCobertura)}</p>
              <p className="mt-1.5 text-xs">
                {c.concluiNaCobertura ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-ok">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Fecha dentro da fase de Cobertura ({c.topicosNaoVistos} faltando)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-warn">
                    <TriangleAlert aria-hidden="true" className="size-3.5" />
                    Termina já na Consolidação — ainda sobram dias para revisar ({c.topicosNaoVistos} faltando)
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-lg font-extrabold text-warn">
                <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
                Faltariam {c.topicosNaoCobertosAteProva} tópicos
              </p>
              <p className="mt-1 text-xs text-muted">
                No ritmo atual, nem todos os tópicos cabem até a prova. Ajuste os horários no Perfil para ganhar fôlego.
              </p>
            </>
          )}
        </article>

        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <ClipboardCheck aria-hidden="true" className="size-4 text-accent-texto" />
            Simulados completos
          </p>
          <p className="numero-grande mt-2 text-3xl text-fg">
            {c.simuladosCompletosPrevistos}
            <span className="ml-1.5 text-base font-bold text-muted">
              {c.simuladosCompletosPrevistos === 1 ? "domingo" : "domingos"}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {c.simuladosCompletosPrevistos > 0
              ? "Sempre que seu domingo tiver ≥ 3h30 no perfil, vira dia de prova completa."
              : "Coloque ≥ 3h30 no domingo (Perfil) para o plano encaixar simulados completos."}
          </p>
        </article>

        <article className="cartao !p-4">
          <p className="rotulo-secao flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 text-accent-texto" />
            Carga semanal do perfil
          </p>
          <p className="numero-grande mt-2 text-3xl text-fg">{formatarDuracao(c.minutosSemanaisPerfil)}</p>
          <p className="mt-1.5 text-xs text-muted">
            ~<strong className="text-fg">{c.questoesSemanaisPerfil} questões/semana</strong> (base).{" "}
            <Link href="/perfil" className="font-semibold text-accent-texto underline">
              Alterar
            </Link>
          </p>
        </article>
      </section>

      <GradeSemanas semanas={c.semanas} />
    </div>
  );
}
