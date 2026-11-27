"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Play,
  ShieldAlert,
  Trash2,
  Trophy,
} from "lucide-react";
import CriadorSimulado from "@/components/simulado/CriadorSimulado";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { formatarDataBR, formatarDuracao, hojeISO } from "@/lib/datas";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import {
  contarErradasNoPeriodo,
  criarSimulado,
  descartarSimulado,
  ehProvaOficial,
  getDisciplinas,
  getTopicos,
  listarSimulados,
  todasQuestoes,
  type CriarSimuladoInput,
} from "@/lib/queries";
import { TEMPO_SIMULADO_COMPLETO_MIN } from "@/lib/simulado";

export default function SimuladoPage() {
  const router = useRouter();
  const { pronto, erro, catalogo, estado, substituirEstado, atualizarEstado } = useStore();
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [soOficiaisCompleto, setSoOficiaisCompleto] = useState(false);

  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const hoje = hojeISO();
  const disciplinas = getDisciplinas(catalogo);
  const topicos = getTopicos(catalogo, estado, hoje);
  const simulados = listarSimulados(estado);
  const qsTodas = todasQuestoes(catalogo, estado);
  const topicoPorId = new Map(catalogo.topicos.map((t) => [t.id, t]));
  const totalOficiaisGeral = qsTodas.filter((q) => ehProvaOficial(q.origem)).length;

  const emAndamento = simulados.filter((s) => !s.finalizado_em);
  const concluidos = simulados.filter((s) => !!s.finalizado_em);

  const disciplinasOpt = disciplinas.map((d) => ({
    id: d.id,
    nome: d.nome,
    questoes_prova: d.questoes_prova,
    totalBanco: topicos
      .filter((t) => t.disciplina_id === d.id)
      .reduce((s, t) => s + t.n_questoes, 0),
    totalOficiais: qsTodas.filter(
      (q) => topicoPorId.get(q.topico_id)?.disciplina_id === d.id && ehProvaOficial(q.origem),
    ).length,
  }));

  const erradasPorPeriodo = [7, 14, 30].map((dias) => ({
    dias,
    quantidade: contarErradasNoPeriodo(estado, dias, hoje),
  }));

  function iniciarSimulado(input: CriarSimuladoInput) {
    if (!catalogo) return;
    setErroCriar(null);
    const criado = criarSimulado(catalogo, estado, input, hoje);
    if (!criado) {
      setErroCriar(
        input.tipo === "periodo"
          ? "Você ainda não tem questões erradas ou chutadas nesse período."
          : "Não foi possível montar o simulado com esse filtro.",
      );
      return;
    }
    substituirEstado(criado.estado);
    router.push(`/simulado/ver?id=${criado.id}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Simulado</h1>
        <p className="mt-1 text-muted">
          Treine nas condições reais da Fundatec: sem ver o gabarito durante a prova, com tempo regressivo e correção
          pelos mínimos do Edital IFFar 406/2026.
        </p>
      </header>

      {erroCriar && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-warn-bg p-3.5 text-sm font-semibold text-warn">
          <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
          {erroCriar}
        </p>
      )}

      {emAndamento.length > 0 && (
        <section aria-labelledby="h-andamento" className="cartao border-ambar space-y-3">
          <h2 id="h-andamento" className="rotulo-secao text-ambar-texto">
            Simulado em andamento
          </h2>
          <ul className="space-y-2.5">
            {emAndamento.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg/60 p-3.5"
              >
                <div>
                  <p className="font-bold text-fg">{s.titulo}</p>
                  <p className="text-xs text-muted">
                    Iniciado em {formatarDataBR(s.iniciado_em)} · tempo sugerido{" "}
                    {formatarDuracao(s.tempoLimiteMin)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/simulado/ver?id=${s.id}`} className="btn btn-primario">
                    <Play aria-hidden="true" className="size-4" />
                    Retomar
                  </Link>
                  <button
                    type="button"
                    onClick={() => atualizarEstado((atual) => descartarSimulado(atual, s.id))}
                    className="btn text-xs"
                    aria-label={`Descartar ${s.titulo}`}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    Descartar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="h-completo" className="cartao cartao-destaque space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 id="h-completo" className="rotulo-secao flex items-center gap-2">
              <Trophy aria-hidden="true" className="size-4 text-accent-texto" />
              Prova completa · padrão Edital IFFar 406/2026
            </h2>
            <p className="mt-2 text-lg font-extrabold text-fg sm:text-xl">
              50 questões nas proporções exatas da prova real
            </p>
            <p className="mt-1 text-sm text-muted">
              O sistema prioriza questões de provas oficiais da Fundatec que você ainda não viu e espalha entre os
              tópicos. Só mostra o gabarito e o veredito (aprovado ou eliminado pelos mínimos) quando você entregar.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => iniciarSimulado({ tipo: "completo", soOficiais: soOficiaisCompleto })}
              className="btn btn-primario btn-grande"
            >
              <Play aria-hidden="true" className="size-5" />
              Começar simulado completo
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
              <input
                type="checkbox"
                checked={soOficiaisCompleto}
                onChange={(e) => setSoOficiaisCompleto(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Só provas oficiais da Fundatec ({totalOficiaisGeral} no banco)
            </label>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-4">
          {disciplinas.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border border-borda bg-bg/60 p-3 ${classeDisciplina(d.nome)}`}
            >
              <span className="chip">{nomeCurtoDisciplina(d.nome)}</span>
              <p className="mt-2 text-sm font-bold text-fg">{d.questoes_prova} questões</p>
              <p className="text-xs text-muted">mínimo {d.minimo_acertos} acertos</p>
            </div>
          ))}
          <div className="rounded-xl border border-borda bg-bg/60 p-3">
            <span className="chip">Regras</span>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-fg">
              <Clock aria-hidden="true" className="size-4 text-accent-texto" />
              {formatarDuracao(TEMPO_SIMULADO_COMPLETO_MIN)}
            </p>
            <p className="text-xs text-muted">mínimo geral: 50/100</p>
          </div>
        </div>
      </section>

      <CriadorSimulado
        disciplinas={disciplinasOpt}
        topicos={topicos.map((t) => ({
          id: t.id,
          disciplina_id: t.disciplina_id,
          ordem: t.ordem,
          titulo_curto: t.titulo_curto,
          n_questoes: t.n_questoes,
        }))}
        erradasPorPeriodo={erradasPorPeriodo}
        onCriar={iniciarSimulado}
      />

      <section aria-labelledby="h-historico" className="cartao">
        <h2 id="h-historico" className="rotulo-secao flex items-center gap-2">
          <History aria-hidden="true" className="size-4 text-accent-texto" />
          Simulados concluídos
        </h2>

        {concluidos.length === 0 ? (
          <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm text-muted">
            Você ainda não concluiu nenhum simulado. Quando terminar o primeiro, ele aparece aqui com sua nota e o
            gabarito comentado para rever quando quiser.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-borda border-t border-borda">
            {concluidos.map((s) => {
              const notaTxt =
                s.nota == null
                  ? "—"
                  : Number.isInteger(s.nota)
                    ? String(s.nota)
                    : s.nota.toFixed(1).replace(".", ",");
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="flex items-center gap-2 font-bold text-fg">
                      <ClipboardCheck aria-hidden="true" className="size-4 text-accent-texto" />
                      {s.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Concluído em {formatarDataBR(s.finalizado_em!)} · {s.acertos}/{s.totalQuestoes} acertos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-surface-2 px-3 py-1.5 text-sm font-extrabold tabular-nums text-fg">
                      <CheckCircle2 aria-hidden="true" className="size-4 text-accent-texto" />
                      {notaTxt} / 100
                    </span>
                    <Link href={`/simulado/ver?id=${s.id}`} className="btn !min-h-9 text-xs">
                      Ver resultado
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
