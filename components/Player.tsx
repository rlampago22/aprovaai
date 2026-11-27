"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarCheck, Check, CircleCheck, CircleX, RotateCcw, Scissors, Timer, X } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { registrarTentativa, type Questao } from "@/lib/queries";

interface Props {
  questoes: Questao[];
  origem: "pratica" | "revisao";
  /** Meta de questões de hoje (com recálculo) e quantas já estavam feitas ao abrir a sessão. */
  metaHoje: number;
  feitasHoje: number;
}

const ROTULO_ORIGEM: Record<string, string> = {
  prova_oficial: "Prova oficial",
  adaptada: "Adaptada",
  gerada_ia: "Gerada por IA",
  manual: "Manual",
};

function mmss(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Player({ questoes: questoesIniciais, origem, metaHoje, feitasHoje }: Props) {
  // Congela a lista da sessão: salvar uma resposta revalida a rota e o servidor
  // devolve as questões em outra ordem (RANDOM). Sem isso, o resultado aparecia
  // em cima de outra questão.
  const { catalogo, atualizarEstado } = useStore();
  const [questoes] = useState(questoesIniciais);
  const [feitasAntes] = useState(feitasHoje);
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [eliminadas, setEliminadas] = useState<string[]>([]);
  const [chutei, setChutei] = useState(false);
  const [resultado, setResultado] = useState<{ acertou: boolean; correta: string } | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const pendente = false;
  const inicio = useRef(0);
  const proximaRef = useRef<HTMLButtonElement>(null);
  const q = questoes[idx];
  const acabou = idx >= questoes.length;

  // Cronômetro discreto (reinicia a cada questão)
  useEffect(() => {
    inicio.current = Date.now();
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [idx]);

  const confirmar = useCallback(() => {
    if (!q || !escolha || resultado || !catalogo) return;
    const tempoMs = Date.now() - inicio.current;
    setErro(null);
    try {
      const acertou = q.correta === escolha;
      atualizarEstado((atual) =>
        registrarTentativa(catalogo, atual, {
          questaoId: q.id,
          resposta: escolha,
          chutou: chutei,
          tempoMs,
          origem,
        }).estado,
      );
      setResultado({ acertou, correta: q.correta });
      setRespondidas((n) => n + 1);
      if (acertou) setAcertos((n) => n + 1);
    } catch {
      setErro("Não foi possível salvar a resposta. Tente confirmar de novo.");
    }
  }, [q, escolha, resultado, catalogo, atualizarEstado, chutei, origem]);

  const selecionar = useCallback((letra: string) => {
    setEscolha(letra);
    setEliminadas((prev) => (prev.includes(letra) ? prev.filter((l) => l !== letra) : prev));
  }, []);

  const alternarEliminada = useCallback(
    (letra: string) => {
      if (resultado) return;
      setEliminadas((prev) => {
        if (prev.includes(letra)) return prev.filter((l) => l !== letra);
        if (escolha === letra) setEscolha(null);
        return [...prev, letra];
      });
    },
    [resultado, escolha],
  );

  const proxima = useCallback(() => {
    setIdx((i) => i + 1);
    setSegundos(0);
    setEscolha(null);
    setEliminadas([]);
    setChutei(false);
    setResultado(null);
    setErro(null);
  }, []);

  // Foco no botão "Próxima" depois de confirmar
  useEffect(() => {
    if (resultado) proximaRef.current?.focus();
  }, [resultado]);

  // Atalhos: 1–4 / A–D marcam, X = chutei, Enter confirma (ou avança)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || acabou || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT" || (alvo.tagName === "INPUT" && (alvo as HTMLInputElement).type !== "radio" && (alvo as HTMLInputElement).type !== "checkbox"))) return;
      const k = e.key.toLowerCase();
      if (!resultado) {
        const pos = "1234".indexOf(k);
        const posLetra = "abcd".indexOf(k);
        const i = pos >= 0 ? pos : posLetra;
        if (i >= 0 && i < q.alternativas.length) {
          e.preventDefault();
          selecionar(q.alternativas[i].letra);
          return;
        }
        if (k === "x") {
          e.preventDefault();
          setChutei((v) => !v);
          return;
        }
      }
      if (e.key === "Enter" && alvo?.tagName !== "BUTTON" && alvo?.tagName !== "A") {
        e.preventDefault();
        if (resultado) proxima();
        else confirmar();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, acabou, resultado, selecionar, confirmar, proxima]);

  if (questoes.length === 0) {
    return (
      <div className="cartao">
        <p className="titulo text-lg font-bold">Nenhuma questão encontrada para este filtro.</p>
        <p className="mt-1 text-muted">
          Tente outro filtro ou veja os tópicos no{" "}
          <Link href="/edital" className="font-semibold text-accent-texto underline">
            mapa do edital
          </Link>
          .
        </p>
      </div>
    );
  }

  if (acabou) {
    const feitasTotal = feitasAntes + respondidas;
    const falta = Math.max(0, metaHoje - feitasTotal);
    const taxa = respondidas > 0 ? Math.round((acertos / respondidas) * 100) : 0;
    return (
      <div className="cartao space-y-5" role="status">
        <h2 className="text-2xl font-extrabold">Sessão concluída</h2>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="numero-grande text-6xl text-accent-texto">
            {acertos}
            <span className="text-3xl text-muted">/{respondidas}</span>
          </p>
          <p className="pb-1 text-lg font-semibold">
            acertos <span className="text-muted">({taxa}%)</span>
          </p>
        </div>
        <div className={`rounded-xl p-4 ${falta === 0 ? "bg-ok-bg text-ok" : "bg-accent-suave text-fg"}`}>
          <p className="flex items-center gap-2 font-bold">
            {falta === 0 && <CircleCheck aria-hidden="true" className="size-5" />}
            {falta === 0
              ? "Meta de hoje batida!"
              : `Faltam ${falta} ${falta === 1 ? "questão" : "questões"} para a meta de hoje.`}
          </p>
          <p className="text-sm">
            Hoje: {Math.min(feitasTotal, metaHoje)} de {metaHoje} questões
            {feitasTotal > metaHoje && ` (+${feitasTotal - metaHoje} além da meta)`}.
          </p>
        </div>
        <p className="text-muted">
          Questões erradas ou chutadas voltam para revisão amanhã (mesmo que você refaça hoje).
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primario btn-grande">
            <CalendarCheck aria-hidden="true" className="size-5" />
            Voltar para Hoje
          </Link>
          <Link href="/praticar?modo=erradas" className="btn btn-grande">
            <RotateCcw aria-hidden="true" className="size-5" />
            Rever erradas
          </Link>
        </div>
      </div>
    );
  }

  const progresso = Math.round((respondidas / questoes.length) * 100);
  const classeDisc = classeDisciplina(q.disciplina_nome);

  return (
    <div className="space-y-4">
      <div
        role="progressbar"
        aria-label="Progresso da sessão"
        aria-valuemin={0}
        aria-valuemax={questoes.length}
        aria-valuenow={respondidas}
        aria-valuetext={`${respondidas} de ${questoes.length} respondidas`}
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progresso}%` }} />
      </div>

      <article className="cartao space-y-5" aria-labelledby="enunciado">
        <header className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-bold">
              Questão {idx + 1} de {questoes.length}
            </span>
            <span className={`chip ${classeDisc}`}>{nomeCurtoDisciplina(q.disciplina_nome)}</span>
            <span className="text-muted">{q.topico_titulo}</span>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-muted">
            {(q.dificuldades ?? 0) > 0 && (
              <span className="rounded-full bg-ambar-bg px-2.5 py-0.5 text-xs font-semibold text-ambar-texto">
                Deu dificuldade ({q.dificuldades}×)
              </span>
            )}
            {!q.revisada && (
              <span className="rounded-full border border-warn px-2 py-0.5 text-xs font-semibold text-warn">
                não revisada
              </span>
            )}
            {q.origem === "prova_oficial" || q.origem === "adaptada" ? (
              <span className="rounded-full bg-accent-suave px-2.5 py-0.5 text-xs font-semibold text-accent-texto">
                {ROTULO_ORIGEM[q.origem] ?? q.origem}
              </span>
            ) : (
              <span>{ROTULO_ORIGEM[q.origem] ?? q.origem}</span>
            )}
            <span aria-hidden="true" className="inline-flex items-center gap-1 tabular-nums">
              <Timer className="size-3.5" />
              {mmss(segundos)}
            </span>
          </p>
        </header>

        {q.texto_base && (
          <blockquote className="rounded-xl border-l-4 border-accent bg-surface-2 p-4">{q.texto_base}</blockquote>
        )}
        <h2 id="enunciado" className="text-xl font-bold leading-snug">
          {q.enunciado}
        </h2>

        <fieldset disabled={!!resultado} className="space-y-3">
          <legend className="sr-only">Alternativas</legend>
          {q.alternativas.map((a, i) => {
            const marcada = escolha === a.letra;
            const eliminada = !resultado && eliminadas.includes(a.letra);
            const ehCorreta = !!resultado && a.letra === resultado.correta;
            const ehErrada = !!resultado && marcada && !resultado.acertou;
            const estilo = ehCorreta
              ? "border-ok bg-ok-bg"
              : ehErrada
                ? "border-bad bg-bad-bg"
                : marcada
                  ? "border-accent bg-accent-suave"
                  : eliminada
                    ? "border-borda bg-surface-2/60 opacity-60 hover:opacity-85"
                    : "border-borda-forte bg-surface hover:border-accent-texto hover:bg-surface-2";
            const selo = ehCorreta
              ? "bg-ok text-surface"
              : ehErrada
                ? "bg-bad text-surface"
                : marcada
                  ? "bg-accent text-accent-fg"
                  : eliminada
                    ? "bg-surface text-muted line-through"
                    : "bg-surface-2 text-fg";
            return (
              <div key={a.letra}>
                <div
                  onContextMenu={(e) => {
                    if (!resultado) {
                      e.preventDefault();
                      alternarEliminada(a.letra);
                    }
                  }}
                  className={`flex items-start rounded-2xl border-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-texto ${estilo}`}
                >
                  <label
                    className={`flex min-h-14 flex-1 cursor-pointer items-start gap-3 p-3.5 ${resultado ? "cursor-default" : ""}`}
                  >
                    <input
                      type="radio"
                      name="alternativa"
                      value={a.letra}
                      checked={marcada}
                      onChange={() => selecionar(a.letra)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`titulo inline-flex size-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${selo}`}
                    >
                      {ehCorreta ? <Check className="size-5" /> : ehErrada ? <X className="size-5" /> : a.letra}
                    </span>
                    <span className={`pt-1 ${eliminada ? "text-muted line-through" : ""}`}>
                      <span className="sr-only">
                        Alternativa {a.letra} (tecla {i + 1}):{" "}
                      </span>
                      {a.texto}
                      {ehCorreta && <strong className="ml-2 text-ok">Correta</strong>}
                      {ehErrada && <strong className="ml-2 text-bad">Sua resposta</strong>}
                    </span>
                  </label>
                  {!resultado && (
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
                  )}
                </div>
                {resultado && <p className="mt-1.5 pl-14 pr-2 text-sm text-muted">{a.explicacao}</p>}
              </div>
            );
          })}
        </fieldset>

        <div role="status" aria-live="polite" className="min-h-6">
          {resultado && (
            <p
              className={`flex items-start gap-3 rounded-xl p-3.5 text-lg font-bold ${
                resultado.acertou ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"
              }`}
            >
              {resultado.acertou ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
              ) : (
                <CircleX aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
              )}
              <span>
                {resultado.acertou ? "Você acertou." : `Você errou. A correta é a alternativa ${resultado.correta}.`}
                {chutei && (
                  <span className="block text-sm font-normal">Marcada como chute: volta para revisão amanhã.</span>
                )}
              </span>
            </p>
          )}
          {erro && <p className="font-semibold text-bad">{erro}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {!resultado ? (
            <>
              <button type="button" onClick={confirmar} disabled={!escolha || pendente} className="btn btn-primario btn-grande">
                {pendente ? "Salvando…" : "Confirmar"}
              </button>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                <input type="checkbox" checked={chutei} onChange={(e) => setChutei(e.target.checked)} className="size-5 accent-[var(--accent)]" />
                Chutei (X)
              </label>
            </>
          ) : (
            <button ref={proximaRef} type="button" onClick={proxima} className="btn btn-primario btn-grande">
              {idx + 1 < questoes.length ? "Próxima questão" : "Ver resumo"}
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
        <p className="hidden text-sm text-muted sm:block">
          Atalhos: 1–4 ou A–D marcam a alternativa, X marca &quot;chutei&quot;, Enter confirma e avança, clique direito ou tesoura riscam uma alternativa.
        </p>
      </article>
    </div>
  );
}
