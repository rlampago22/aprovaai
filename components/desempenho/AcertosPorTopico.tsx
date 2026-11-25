"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, BookOpen, Filter, Play, RotateCcw } from "lucide-react";
import BarraDominio from "@/components/BarraDominio";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import type { DesempenhoTopico } from "@/lib/desempenho";
import type { EstadoTopico } from "@/lib/dominio";

interface DisciplinaFiltro {
  id: number;
  nome: string;
}

interface Props {
  disciplinas: DisciplinaFiltro[];
  topicos: DesempenhoTopico[];
}

type FiltroEstado = "todos" | "praticados" | EstadoTopico;
type Ordenacao = "edital" | "menor_acerto" | "maior_acerto" | "mais_praticados";

const ROTULO_FILTRO: Record<FiltroEstado, string> = {
  todos: "Todos",
  praticados: "Praticados",
  fraco: "Fracos",
  em_progresso: "Em progresso",
  dominado: "Dominados",
  nao_visto: "Não vistos",
};

export default function AcertosPorTopico({ disciplinas, topicos }: Props) {
  const [discId, setDiscId] = useState<number | "todas">("todas");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [ordem, setOrdem] = useState<Ordenacao>("edital");

  const contagensEstado = useMemo(() => {
    const base = discId === "todas" ? topicos : topicos.filter((t) => t.disciplina_id === discId);
    return {
      todos: base.length,
      praticados: base.filter((t) => t.tentativas > 0).length,
      fraco: base.filter((t) => t.estado === "fraco").length,
      em_progresso: base.filter((t) => t.estado === "em_progresso").length,
      dominado: base.filter((t) => t.estado === "dominado").length,
      nao_visto: base.filter((t) => t.estado === "nao_visto").length,
    };
  }, [topicos, discId]);

  const filtrados = useMemo(() => {
    const lista = topicos.filter((t) => {
      if (discId !== "todas" && t.disciplina_id !== discId) return false;
      if (estado === "praticados") return t.tentativas > 0;
      if (estado !== "todos" && t.estado !== estado) return false;
      return true;
    });

    if (ordem === "edital") return lista;

    return [...lista].sort((a, b) => {
      if (ordem === "mais_praticados") {
        return b.tentativas - a.tentativas || a.disciplina_id - b.disciplina_id || a.ordem - b.ordem;
      }
      // Para menor/maior acerto, tópicos nunca praticados ficam sempre no final para não poluir.
      if (a.taxaAcerto == null && b.taxaAcerto == null) {
        return a.disciplina_id - b.disciplina_id || a.ordem - b.ordem;
      }
      if (a.taxaAcerto == null) return 1;
      if (b.taxaAcerto == null) return -1;
      if (ordem === "menor_acerto") {
        return a.taxaAcerto - b.taxaAcerto || a.dominio - b.dominio || b.tentativas - a.tentativas;
      }
      return b.taxaAcerto - a.taxaAcerto || b.dominio - a.dominio || b.tentativas - a.tentativas;
    });
  }, [topicos, discId, estado, ordem]);

  const temFiltroAtivo = discId !== "todas" || estado !== "todos" || ordem !== "edital";

  return (
    <section aria-labelledby="h-topicos" className="cartao">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="h-topicos" className="rotulo-secao flex items-center gap-2">
            <Filter aria-hidden="true" className="size-4 text-accent-texto" />
            Acertos por tópico
          </h2>
          <p className="mt-1 text-sm text-muted">
            Veja quantas questões você acertou em cada um dos {topicos.length} tópicos do edital e filtre os que
            precisam de reforço.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ordem-topicos" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <ArrowUpDown aria-hidden="true" className="size-3.5" />
            Ordenar:
          </label>
          <select
            id="ordem-topicos"
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordenacao)}
            className="campo !w-auto !min-h-10 !py-1.5 text-sm font-medium"
          >
            <option value="edital">Ordem do edital</option>
            <option value="menor_acerto">Menor acerto primeiro</option>
            <option value="maior_acerto">Maior acerto primeiro</option>
            <option value="mais_praticados">Mais praticados</option>
          </select>
        </div>
      </div>

      {/* Filtros de disciplina */}
      <div role="group" aria-label="Filtrar por disciplina" className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={discId === "todas"}
          onClick={() => setDiscId("todas")}
          className={`min-h-10 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors ${
            discId === "todas"
              ? "border-accent bg-accent text-accent-fg"
              : "border-borda bg-bg text-fg hover:bg-surface-2"
          }`}
        >
          Todas ({topicos.length})
        </button>
        {disciplinas.map((d) => {
          const ativo = discId === d.id;
          const qtd = topicos.filter((t) => t.disciplina_id === d.id).length;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setDiscId(d.id)}
              className={`min-h-10 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors ${classeDisciplina(d.nome)} ${
                ativo
                  ? "border-d bg-d-bg text-d ring-1 ring-d"
                  : "border-borda bg-bg text-fg hover:bg-surface-2"
              }`}
            >
              {nomeCurtoDisciplina(d.nome)} ({qtd})
            </button>
          );
        })}
      </div>

      {/* Filtros de situação */}
      <div role="group" aria-label="Filtrar por situação do tópico" className="mt-2.5 flex flex-wrap gap-1.5">
        {(Object.keys(ROTULO_FILTRO) as FiltroEstado[]).map((chave) => {
          const ativo = estado === chave;
          const qtd = contagensEstado[chave];
          return (
            <button
              key={chave}
              type="button"
              aria-pressed={ativo}
              onClick={() => setEstado(chave)}
              className={`min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors ${
                ativo
                  ? "bg-accent-suave text-accent-texto ring-1 ring-accent"
                  : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {ROTULO_FILTRO[chave]} ({qtd})
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          Mostrando <strong className="text-fg">{filtrados.length}</strong> de {topicos.length} tópicos
        </p>
        {temFiltroAtivo && (
          <button
            type="button"
            onClick={() => {
              setDiscId("todas");
              setEstado("todos");
              setOrdem("edital");
            }}
            className="inline-flex cursor-pointer items-center gap-1 font-semibold text-accent-texto underline"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="mt-4 rounded-xl bg-surface-2 p-6 text-center">
          <p className="font-semibold text-fg">Nenhum tópico encontrado com esse filtro.</p>
          <p className="mt-1 text-sm text-muted">
            {estado !== "todos" && contagensEstado.praticados === 0
              ? "Você ainda não praticou questões nesta seleção. Quando praticar, os tópicos aparecerão aqui."
              : "Tente mudar a situação ou escolher outra disciplina."}
          </p>
          {temFiltroAtivo && (
            <button
              type="button"
              onClick={() => {
                setDiscId("todas");
                setEstado("todos");
                setOrdem("edital");
              }}
              className="btn mt-3"
            >
              Mostrar todos os tópicos
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-borda border-t border-borda">
          {filtrados.map((t) => {
            const pct = t.taxaAcerto != null ? Math.round(t.taxaAcerto * 100) : null;
            return (
              <li
                key={t.id}
                className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 py-3.5 ${classeDisciplina(t.disciplina_nome)}`}
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">{nomeCurtoDisciplina(t.disciplina_nome)}</span>
                    {t.revisoesVencidas > 0 && (
                      <span className="rounded-full bg-ambar-bg px-2 py-0.5 text-xs font-semibold text-ambar-texto">
                        {t.revisoesVencidas} {t.revisoesVencidas === 1 ? "revisão vencida" : "revisões vencidas"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-semibold">
                    <Link href={`/edital/${t.id}`} className="text-fg no-underline hover:text-accent-texto hover:underline">
                      <span className="text-muted">{t.ordem}.</span> {t.titulo_curto}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {pct != null ? (
                      <>
                        <strong className="tabular-nums text-fg">
                          {t.acertos}/{t.tentativas} acertos ({pct}%)
                        </strong>
                        {t.chutes > 0 && ` · ${t.chutes} ${t.chutes === 1 ? "chute" : "chutes"}`}
                        {` · ${t.n_questoes} no banco`}
                      </>
                    ) : (
                      <>Ainda não praticado · {t.n_questoes} questões no banco</>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <BarraDominio dominio={t.dominio} estado={t.estado} />
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/edital/${t.id}`}
                      aria-label={`Ver resumo de ${t.titulo_curto}`}
                      className="btn !min-h-9 !px-2.5 text-xs"
                    >
                      <BookOpen aria-hidden="true" className="size-3.5" />
                      Resumo
                    </Link>
                    {t.n_questoes > 0 && (
                      <Link
                        href={`/praticar?topico=${t.id}`}
                        aria-label={`Praticar ${t.titulo_curto}`}
                        className="btn btn-primario !min-h-9 !px-3 text-xs"
                      >
                        <Play aria-hidden="true" className="size-3.5" />
                        Praticar
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
