"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  Scissors,
  Send,
  Timer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { descartarSimulado, finalizarSimulado, type QuestaoSimulado } from "@/lib/queries";

interface Props {
  simuladoId: number;
  titulo: string;
  tempoLimiteMin: number;
  questoes: QuestaoSimulado[];
}

interface RascunhoQuestao {
  resposta: string | null;
  chutou: boolean;
  marcada: boolean;
  tempoMs: number;
  eliminadas?: string[];
}

interface RascunhoSalvo {
  restanteSeg: number;
  idx: number;
  itens: Record<number, RascunhoQuestao>;
}

function hhmmss(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const VAZIO: RascunhoQuestao = { resposta: null, chutou: false, marcada: false, tempoMs: 0 };

export default function ExecucaoSimulado({ simuladoId, titulo, tempoLimiteMin, questoes }: Props) {
  const router = useRouter();
  const { catalogo, atualizarEstado } = useStore();
  const chaveStorage = `aprovaai-simulado-${simuladoId}`;
  const [idx, setIdx] = useState(0);
  const [itens, setItens] = useState<Record<number, RascunhoQuestao>>({});
  const [restanteSeg, setRestanteSeg] = useState(tempoLimiteMin * 60);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pendente = false;
  const [hidratado, setHidratado] = useState(false);

  const entradaQuestaoMs = useRef<number>(0);
  const idxAtualRef = useRef<number>(0);

  // Restaura rascunho local se o usuário recarregar a página no meio da prova
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveStorage);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Partial<RascunhoSalvo>;
        /* eslint-disable react-hooks/set-state-in-effect -- restaura rascunho salvo apenas no cliente */
        if (typeof salvo.restanteSeg === "number" && salvo.restanteSeg >= 0) setRestanteSeg(salvo.restanteSeg);
        if (typeof salvo.idx === "number" && salvo.idx >= 0 && salvo.idx < questoes.length) setIdx(salvo.idx);
        if (salvo.itens && typeof salvo.itens === "object") setItens(salvo.itens);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // ignora erro de localStorage
    }
    entradaQuestaoMs.current = Date.now();
    setHidratado(true);
  }, [chaveStorage, questoes.length]);

  // Persiste rascunho no localStorage
  useEffect(() => {
    if (!hidratado) return;
    try {
      const payload: RascunhoSalvo = { restanteSeg, idx, itens };
      localStorage.setItem(chaveStorage, JSON.stringify(payload));
    } catch {
      // ignora se storage estiver cheio
    }
  }, [hidratado, chaveStorage, restanteSeg, idx, itens]);

  // Cronômetro regressivo
  useEffect(() => {
    const t = setInterval(() => {
      setRestanteSeg((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const registrarTempoAtual = useCallback(() => {
    const qAtual = questoes[idxAtualRef.current];
    if (!qAtual || !entradaQuestaoMs.current) return;
    const delta = Math.max(0, Date.now() - entradaQuestaoMs.current);
    entradaQuestaoMs.current = Date.now();
    if (delta === 0) return;
    setItens((prev) => {
      const cur = prev[qAtual.id] ?? VAZIO;
      return { ...prev, [qAtual.id]: { ...cur, tempoMs: cur.tempoMs + delta } };
    });
  }, [questoes]);

  const irPara = useCallback(
    (novoIdx: number) => {
      if (novoIdx < 0 || novoIdx >= questoes.length || novoIdx === idxAtualRef.current) return;
      registrarTempoAtual();
      idxAtualRef.current = novoIdx;
      setIdx(novoIdx);
    },
    [questoes.length, registrarTempoAtual],
  );

  useEffect(() => {
    idxAtualRef.current = idx;
  }, [idx]);

  const q = questoes[idx];
  const atual = q ? (itens[q.id] ?? VAZIO) : VAZIO;
  const eliminadasAtual = atual.eliminadas ?? [];

  const atualizarAtual = useCallback(
    (patch: Partial<RascunhoQuestao>) => {
      if (!q) return;
      setItens((prev) => {
        const cur = prev[q.id] ?? VAZIO;
        return { ...prev, [q.id]: { ...cur, ...patch } };
      });
    },
    [q],
  );

  const selecionarAlternativa = useCallback(
    (letra: string) => {
      if (!q) return;
      setItens((prev) => {
        const cur = prev[q.id] ?? VAZIO;
        const elims = cur.eliminadas ?? [];
        return {
          ...prev,
          [q.id]: {
            ...cur,
            resposta: letra,
            eliminadas: elims.includes(letra) ? elims.filter((l) => l !== letra) : cur.eliminadas,
          },
        };
      });
    },
    [q],
  );

  const alternarEliminada = useCallback(
    (letra: string) => {
      if (!q) return;
      setItens((prev) => {
        const cur = prev[q.id] ?? VAZIO;
        const elims = cur.eliminadas ?? [];
        const ja = elims.includes(letra);
        if (ja) {
          return { ...prev, [q.id]: { ...cur, eliminadas: elims.filter((l) => l !== letra) } };
        }
        return {
          ...prev,
          [q.id]: {
            ...cur,
            eliminadas: [...elims, letra],
            ...(cur.resposta === letra ? { resposta: null, chutou: false } : {}),
          },
        };
      });
    },
    [q],
  );

  // Atalhos de teclado: 1–4 / A–D marcam, X = chutei, M = marcar para revisar, ← / → navegam
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || confirmandoEntrega || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "SELECT" ||
          (alvo.tagName === "INPUT" &&
            (alvo as HTMLInputElement).type !== "radio" &&
            (alvo as HTMLInputElement).type !== "checkbox"))
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      const pos = "1234".indexOf(k);
      const posLetra = "abcd".indexOf(k);
      const i = pos >= 0 ? pos : posLetra;
      if (i >= 0 && i < q.alternativas.length) {
        e.preventDefault();
        selecionarAlternativa(q.alternativas[i].letra);
        return;
      }
      if (k === "x") {
        e.preventDefault();
        atualizarAtual({ chutou: !atual.chutou });
        return;
      }
      if (k === "m") {
        e.preventDefault();
        atualizarAtual({ marcada: !atual.marcada });
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        irPara(idx + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        irPara(idx - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, confirmandoEntrega, atual.chutou, atual.marcada, atualizarAtual, selecionarAlternativa, irPara, idx]);

  const respondidas = questoes.filter((item) => !!itens[item.id]?.resposta).length;
  const emBranco = questoes.length - respondidas;
  const marcadas = questoes.filter((item) => !!itens[item.id]?.marcada).length;
  const tempoCritico = restanteSeg <= 15 * 60 && restanteSeg > 0;
  const tempoEsgotado = restanteSeg === 0;

  function entregarProva() {
    if (!catalogo) return;
    setErro(null);
    const deltaFinal = entradaQuestaoMs.current ? Math.max(0, Date.now() - entradaQuestaoMs.current) : 0;
    const payload = questoes.map((item) => {
      const r = itens[item.id] ?? VAZIO;
      const tempo = r.tempoMs + (q && item.id === q.id ? deltaFinal : 0);
      return {
        questaoId: item.id,
        resposta: r.resposta,
        chutou: r.chutou,
        tempoMs: tempo > 0 ? tempo : null,
      };
    });

    try {
      atualizarEstado((atual) =>
        finalizarSimulado(catalogo, atual, { simuladoId, respostas: payload }).estado,
      );
      try {
        localStorage.removeItem(chaveStorage);
      } catch {
        // ignora
      }
    } catch {
      setErro("Não foi possível entregar o simulado agora. Tente novamente.");
    }
  }

  if (!q) return null;

  return (
    <div className="space-y-5">
      {/* Barra de status da prova */}
      <header className="cartao !p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="rotulo-secao">Simulado em andamento · sem correção</p>
            <h1 className="mt-0.5 text-xl font-extrabold sm:text-2xl">{titulo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="timer"
              aria-label={`Tempo restante: ${hhmmss(restanteSeg)}`}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-bold tabular-nums ${
                tempoEsgotado
                  ? "border-bad bg-bad-bg text-bad"
                  : tempoCritico
                    ? "border-ambar bg-ambar-bg text-ambar-texto"
                    : "border-borda bg-surface-2 text-fg"
              }`}
            >
              <Timer aria-hidden="true" className="size-4" />
              {hhmmss(restanteSeg)}
            </div>
            <button
              type="button"
              onClick={() => setConfirmandoEntrega(true)}
              className="btn btn-primario"
            >
              <Send aria-hidden="true" className="size-4" />
              Entregar prova
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>
            Respondidas: <strong className="tabular-nums text-fg">{respondidas}/{questoes.length}</strong>
          </span>
          <span>
            Em branco: <strong className="tabular-nums text-fg">{emBranco}</strong>
          </span>
          {marcadas > 0 && (
            <span className="font-semibold text-ambar-texto">
              Marcadas para revisar: {marcadas}
            </span>
          )}
        </div>

        {tempoEsgotado && (
          <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-warn-bg p-3 text-sm font-semibold text-warn">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            O tempo sugerido acabou. Você pode entregar a prova agora ou terminar de revisar suas respostas.
          </p>
        )}
      </header>

      {/* Painel de confirmação antes de entregar */}
      {confirmandoEntrega && (
        <section
          role="dialog"
          aria-labelledby="h-entregar"
          className="cartao cartao-destaque space-y-3"
        >
          <h2 id="h-entregar" className="text-lg font-extrabold">
            Confirmar entrega do simulado?
          </h2>
          <p className="text-sm text-muted">
            Depois de entregar, o gabarito comentado é liberado e suas respostas entram no seu histórico de desempenho e
            revisão.
          </p>
          <ul className="flex flex-wrap gap-3 text-sm">
            <li className="rounded-lg bg-ok-bg px-3 py-1.5 font-semibold text-ok">
              Respondidas: {respondidas} de {questoes.length}
            </li>
            {emBranco > 0 && (
              <li className="rounded-lg bg-warn-bg px-3 py-1.5 font-semibold text-warn">
                Em branco: {emBranco}
              </li>
            )}
            {marcadas > 0 && (
              <li className="rounded-lg bg-ambar-bg px-3 py-1.5 font-semibold text-ambar-texto">
                Marcadas para revisar: {marcadas}
              </li>
            )}
          </ul>
          {erro && <p role="alert" className="text-sm font-semibold text-bad">{erro}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={entregarProva}
              disabled={pendente}
              className="btn btn-primario"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {pendente ? "Corrigindo…" : "Confirmar e ver resultado"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoEntrega(false)}
              disabled={pendente}
              className="btn"
            >
              Voltar para a prova
            </button>
          </div>
        </section>
      )}

      {/* Mapa de questões (navegação direta) */}
      <nav aria-label="Mapa de questões do simulado" className="cartao !p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="font-bold uppercase tracking-wide">Navegação das questões</span>
          <span className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="size-2.5 rounded-sm bg-accent" /> respondida
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="size-2.5 rounded-sm bg-ambar" /> marcada
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="size-2.5 rounded-sm border border-borda-forte bg-surface" /> em branco
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {questoes.map((item, i) => {
            const st = itens[item.id] ?? VAZIO;
            const ehAtual = i === idx;
            const respondida = !!st.resposta;
            const cor = st.marcada
              ? "border-ambar bg-ambar-bg text-ambar-texto"
              : respondida
                ? "border-accent bg-accent text-accent-fg"
                : "border-borda bg-bg text-fg hover:bg-surface-2";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => irPara(i)}
                aria-current={ehAtual ? "step" : undefined}
                aria-label={`Questão ${i + 1}${respondida ? `, marcada ${st.resposta}` : ", em branco"}${st.marcada ? ", para revisar" : ""}`}
                className={`inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors ${cor} ${
                  ehAtual ? "ring-2 ring-fg ring-offset-2 ring-offset-[var(--surface)]" : ""
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Questão atual */}
      <article className="cartao space-y-5" aria-labelledby="sim-enunciado">
        <header className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-bold">
              Questão {idx + 1} de {questoes.length}
            </span>
            <span className={`chip ${classeDisciplina(q.disciplina_nome)}`}>
              {nomeCurtoDisciplina(q.disciplina_nome)}
            </span>
          </p>
          <div className="flex items-center gap-2">
            {atual.resposta && (
              <button
                type="button"
                onClick={() => atualizarAtual({ resposta: null, chutou: false })}
                className="cursor-pointer text-xs font-semibold text-muted underline hover:text-fg"
              >
                Limpar marcação
              </button>
            )}
          </div>
        </header>

        {q.texto_base && (
          <blockquote className="whitespace-pre-line rounded-xl border-l-4 border-accent bg-surface-2 p-4 text-sm leading-relaxed">
            {q.texto_base}
          </blockquote>
        )}

        <h2 id="sim-enunciado" className="whitespace-pre-line text-lg font-bold leading-snug sm:text-xl">
          {q.enunciado}
        </h2>

        <fieldset className="space-y-3">
          <legend className="sr-only">Alternativas</legend>
          {q.alternativas.map((a, i) => {
            const marcada = atual.resposta === a.letra;
            const eliminada = eliminadasAtual.includes(a.letra);
            const estilo = marcada
              ? "border-accent bg-accent-suave"
              : eliminada
                ? "border-borda bg-surface-2/60 opacity-60 hover:opacity-85"
                : "border-borda-forte bg-surface hover:border-accent-texto hover:bg-surface-2";
            const selo = marcada
              ? "bg-accent text-accent-fg"
              : eliminada
                ? "bg-surface text-muted line-through"
                : "bg-surface-2 text-fg";
            return (
              <div
                key={a.letra}
                onContextMenu={(e) => {
                  e.preventDefault();
                  alternarEliminada(a.letra);
                }}
                className={`flex items-start rounded-2xl border-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-texto ${estilo}`}
              >
                <label className="flex min-h-14 flex-1 cursor-pointer items-start gap-3 p-3.5">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={a.letra}
                    checked={marcada}
                    onChange={() => selecionarAlternativa(a.letra)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`titulo inline-flex size-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${selo}`}
                  >
                    {a.letra}
                  </span>
                  <span className={`pt-1 ${eliminada ? "text-muted line-through" : ""}`}>
                    <span className="sr-only">
                      Alternativa {a.letra} (tecla {i + 1}):{" "}
                    </span>
                    {a.texto}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => alternarEliminada(a.letra)}
                  aria-pressed={eliminada}
                  aria-label={eliminada ? `Restaurar alternativa ${a.letra}` : `Riscar alternativa ${a.letra}`}
                  title={
                    eliminada
                      ? "Restaurar alternativa (ou clique direito)"
                      : "Riscar alternativa eliminada (ou clique direito)"
                  }
                  className={`mr-2 mt-2.5 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                    eliminada
                      ? "bg-surface text-fg ring-1 ring-borda-forte"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <Scissors aria-hidden="true" className="size-4" />
                </button>
              </div>
            );
          })}
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-borda pt-4">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={atual.chutou}
              onChange={(e) => atualizarAtual({ chutou: e.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            Chutei (X)
          </label>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ambar-texto">
            <input
              type="checkbox"
              checked={atual.marcada}
              onChange={(e) => atualizarAtual({ marcada: e.target.checked })}
              className="size-4 accent-[var(--ambar)]"
            />
            <Flag aria-hidden="true" className="size-4" />
            Marcar para revisar depois (M)
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => irPara(idx - 1)}
            disabled={idx === 0}
            className="btn"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Anterior
          </button>

          {idx + 1 < questoes.length ? (
            <button type="button" onClick={() => irPara(idx + 1)} className="btn btn-primario">
              Próxima
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmandoEntrega(true)} className="btn btn-primario">
              <Send aria-hidden="true" className="size-4" />
              Entregar prova
            </button>
          )}
        </div>

        <p className="hidden text-xs text-muted sm:block">
          Atalhos: 1–4 ou A–D marcam a alternativa · clique direito ou tesoura riscam · X marca chute · M marca para revisar · ← / → trocam de questão.
        </p>
      </article>

      {/* Descartar simulado acidental */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem(chaveStorage);
            } catch {
              // ignora
            }
            atualizarEstado((atual) => descartarSimulado(atual, simuladoId));
            router.push("/simulado");
          }}
          className="btn text-xs text-muted"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Descartar este simulado sem salvar
        </button>
      </div>
    </div>
  );
}
