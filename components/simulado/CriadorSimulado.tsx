"use client";

import { useState } from "react";
import { BookMarked, Clock, Layers, ListChecks, Play, RotateCcw } from "lucide-react";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import type { CriarSimuladoInput } from "@/lib/queries";
import { calcularTempoSugeridoMin } from "@/lib/simulado";

interface DisciplinaOpt {
  id: number;
  nome: string;
  questoes_prova: number;
  totalBanco: number;
  totalOficiais?: number;
}

interface TopicoOpt {
  id: number;
  disciplina_id: number;
  ordem: number;
  titulo_curto: string;
  n_questoes: number;
}

interface Props {
  disciplinas: DisciplinaOpt[];
  topicos: TopicoOpt[];
  erradasPorPeriodo: { dias: number; quantidade: number }[];
  onCriar: (input: CriarSimuladoInput) => void;
}

type Aba = "disciplina" | "topicos" | "periodo";

export default function CriadorSimulado({ disciplinas, topicos, erradasPorPeriodo, onCriar }: Props) {
  const [aba, setAba] = useState<Aba>("disciplina");
  const [discId, setDiscId] = useState<number>(disciplinas[0]?.id ?? 1);
  const [qtdDisc, setQtdDisc] = useState<number>(15);
  const [topicosSel, setTopicosSel] = useState<number[]>([]);
  const [qtdTop, setQtdTop] = useState<number>(15);
  const [diasPeriodo, setDiasPeriodo] = useState<number>(7);
  const [qtdPeriodo, setQtdPeriodo] = useState<number>(20);
  const [soOficiais, setSoOficiais] = useState<boolean>(false);

  const qtdErrosNoPeriodo = erradasPorPeriodo.find((e) => e.dias === diasPeriodo)?.quantidade ?? 0;

  function alternarTopico(id: number) {
    setTopicosSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <section aria-labelledby="h-personalizado" className="cartao space-y-5">
      <div>
        <h2 id="h-personalizado" className="rotulo-secao flex items-center gap-2">
          <ListChecks aria-hidden="true" className="size-4 text-accent-texto" />
          Simulado personalizado
        </h2>
        <p className="mt-1 text-sm text-muted">
          Escolha um recorte menor para treinar sem consultar o gabarito antes do fim.
        </p>
      </div>

      {/* Abas + filtro de provas oficiais */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tipo de simulado personalizado" className="flex flex-wrap gap-2">
          {(
            [
              ["disciplina", "Por disciplina", Layers],
              ["topicos", "Por tópicos", BookMarked],
              ["periodo", "Erros recentes", RotateCcw],
            ] as [Aba, string, typeof Layers][]
          ).map(([id, rotulo, Icone]) => {
            const ativo = aba === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setAba(id)}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                  ativo
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-borda bg-bg text-fg hover:bg-surface-2"
                }`}
              >
                <Icone aria-hidden="true" className="size-4" />
                {rotulo}
              </button>
            );
          })}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-borda bg-bg px-3 py-2 text-xs font-semibold text-fg">
          <input
            type="checkbox"
            checked={soOficiais}
            onChange={(e) => setSoOficiais(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Só provas oficiais (Fundatec)
        </label>
      </div>

      {/* Aba 1: Por disciplina */}
      {aba === "disciplina" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCriar({ tipo: "disciplina", disciplinaId: discId, n: qtdDisc, soOficiais });
          }}
          className="space-y-4"
        >

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">1. Escolha a disciplina</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {disciplinas.map((d) => {
                const ativo = discId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setDiscId(d.id)}
                    className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${classeDisciplina(d.nome)} ${
                      ativo
                        ? "border-d bg-d-bg"
                        : "border-borda bg-bg/60 hover:bg-surface-2"
                    }`}
                  >
                    <span className="chip">{nomeCurtoDisciplina(d.nome)}</span>
                    <p className="mt-2 text-xs text-muted">
                      {d.totalBanco} questões
                      {d.totalOficiais != null ? ` (${d.totalOficiais} oficiais)` : ""} · {d.questoes_prova} na prova
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">2. Quantidade de questões</p>
            <div className="flex flex-wrap gap-2">
              {[10, 15, 20, 25].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={qtdDisc === n}
                  onClick={() => setQtdDisc(n)}
                  className={`min-h-10 cursor-pointer rounded-xl border px-4 text-sm font-semibold tabular-nums ${
                    qtdDisc === n
                      ? "border-accent bg-accent-suave text-accent-texto ring-1 ring-accent"
                      : "border-borda bg-bg text-fg hover:bg-surface-2"
                  }`}
                >
                  {n} questões
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Clock aria-hidden="true" className="size-4 text-accent-texto" />
              Tempo sugerido:{" "}
              <strong className="text-fg">{calcularTempoSugeridoMin("disciplina", qtdDisc)} min</strong> (ritmo da
              prova)
            </p>
            <button type="submit" className="btn btn-primario">
              <Play aria-hidden="true" className="size-4" />
              Iniciar simulado
            </button>
          </div>
        </form>
      )}

      {/* Aba 2: Por tópicos */}
      {aba === "topicos" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCriar({ tipo: "topicos", topicoIds: topicosSel, n: qtdTop, soOficiais });
          }}
          className="space-y-4"
        >

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">
              1. Marque um ou mais tópicos ({topicosSel.length} selecionados)
            </p>
            {topicosSel.length > 0 && (
              <button
                type="button"
                onClick={() => setTopicosSel([])}
                className="cursor-pointer text-xs font-semibold text-accent-texto underline"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-borda bg-bg/60 p-3">
            {disciplinas.map((d) => {
              const lista = topicos.filter((t) => t.disciplina_id === d.id);
              return (
                <div key={d.id} className={classeDisciplina(d.nome)}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-d">
                    <span aria-hidden="true" className="inline-block h-3.5 w-1 rounded-full bg-d" />
                    {d.nome}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {lista.map((t) => {
                      const marcado = topicosSel.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                            marcado
                              ? "border-accent bg-accent-suave text-fg"
                              : "border-transparent bg-surface hover:border-borda"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => alternarTopico(t.id)}
                            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold">
                              {t.ordem}. {t.titulo_curto}
                            </span>
                            <span className="ml-1 text-muted">({t.n_questoes})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">2. Limite de questões</p>
            <div className="flex flex-wrap gap-2">
              {[10, 15, 20, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={qtdTop === n}
                  onClick={() => setQtdTop(n)}
                  className={`min-h-10 cursor-pointer rounded-xl border px-4 text-sm font-semibold tabular-nums ${
                    qtdTop === n
                      ? "border-accent bg-accent-suave text-accent-texto ring-1 ring-accent"
                      : "border-borda bg-bg text-fg hover:bg-surface-2"
                  }`}
                >
                  Até {n} questões
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
            <p className="text-sm text-muted">
              {topicosSel.length === 0
                ? "Selecione pelo menos 1 tópico acima."
                : `Tempo sugerido: ~${calcularTempoSugeridoMin("topicos", qtdTop)} min`}
            </p>
            <button type="submit" disabled={topicosSel.length === 0} className="btn btn-primario">
              <Play aria-hidden="true" className="size-4" />
              Iniciar simulado
            </button>
          </div>
        </form>
      )}

      {/* Aba 3: Erros recentes por período */}
      {aba === "periodo" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCriar({ tipo: "periodo", dias: diasPeriodo, n: qtdPeriodo, soOficiais });
          }}
          className="space-y-4"
        >

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">
              1. Questões que você errou ou chutou nos últimos:
            </p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {erradasPorPeriodo.map((p) => {
                const ativo = diasPeriodo === p.dias;
                return (
                  <button
                    key={p.dias}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setDiasPeriodo(p.dias)}
                    className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${
                      ativo
                        ? "border-accent bg-accent-suave"
                        : "border-borda bg-bg/60 hover:bg-surface-2"
                    }`}
                  >
                    <p className="font-bold text-fg">Últimos {p.dias} dias</p>
                    <p className="mt-1 text-xs text-muted">
                      {p.quantidade === 0
                        ? "Nenhuma questão errada/chutada"
                        : `${p.quantidade} ${p.quantidade === 1 ? "questão disponível" : "questões disponíveis"}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-fg">2. Limite de questões</p>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={qtdPeriodo === n}
                  onClick={() => setQtdPeriodo(n)}
                  className={`min-h-10 cursor-pointer rounded-xl border px-4 text-sm font-semibold tabular-nums ${
                    qtdPeriodo === n
                      ? "border-accent bg-accent-suave text-accent-texto ring-1 ring-accent"
                      : "border-borda bg-bg text-fg hover:bg-surface-2"
                  }`}
                >
                  Até {n} questões
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda pt-4">
            <p className="text-sm text-muted">
              {qtdErrosNoPeriodo === 0
                ? "Assim que você errar ou chutar questões praticando, elas ficam disponíveis aqui."
                : `Pronto para montar com até ${Math.min(qtdErrosNoPeriodo, qtdPeriodo)} questões.`}
            </p>
            <button type="submit" disabled={qtdErrosNoPeriodo === 0} className="btn btn-primario">
              <Play aria-hidden="true" className="size-4" />
              Iniciar simulado de erros
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
