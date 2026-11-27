"use client";
import { useState, type ReactNode } from "react";
import { Check, CircleCheck, CircleX, Eye, EyeOff, RotateCcw } from "lucide-react";
import type { ItemVF } from "@/lib/resumo";

const RE_INLINE = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function renderInline(texto: string, chave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let ultimo = 0;
  let i = 0;
  for (const m of texto.matchAll(RE_INLINE)) {
    const idx = m.index ?? 0;
    if (idx > ultimo) partes.push(texto.slice(ultimo, idx));
    const t = m[0];
    const k = `${chave}-${i}`;
    if (t.startsWith("[")) {
      const fim = t.indexOf("](");
      partes.push(
        <a
          key={k}
          href={t.slice(fim + 2, -1)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent-texto underline underline-offset-2"
        >
          {renderInline(t.slice(1, fim), k)}
        </a>,
      );
    } else if (t.startsWith("**")) partes.push(<strong key={k}>{renderInline(t.slice(2, -2), k)}</strong>);
    else if (t.startsWith("`"))
      partes.push(
        <code key={k} className="rounded bg-surface-2 px-1 text-[0.9em]">
          {t.slice(1, -1)}
        </code>,
      );
    else partes.push(<em key={k}>{t.slice(1, -1)}</em>);
    ultimo = idx + t.length;
    i++;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

interface Props {
  introducao?: string;
  itens: ItemVF[];
}

export default function TreinoVF({ introducao, itens }: Props) {
  const [respostas, setRespostas] = useState<Record<number, "V" | "F">>({});
  const [mostrarTudo, setMostrarTudo] = useState(false);

  const respondidas = Object.keys(respostas).length;
  const acertos = itens.reduce((s, it, i) => s + (respostas[i] === it.gabarito ? 1 : 0), 0);

  function responder(i: number, escolha: "V" | "F") {
    setRespostas((prev) => (prev[i] ? prev : { ...prev, [i]: escolha }));
  }

  function reiniciar() {
    setRespostas({});
    setMostrarTudo(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-borda bg-bg/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {introducao ?? "Julgue cada afirmação como Verdadeira (V) ou Falsa (F) antes de ver o gabarito."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {respondidas > 0 && (
            <span className="rounded-full bg-accent-suave px-2.5 py-0.5 text-xs font-bold tabular-nums text-accent-texto">
              {acertos}/{respondidas} {acertos === 1 ? "acerto" : "acertos"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMostrarTudo((v) => !v)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-borda bg-surface px-2.5 text-xs font-semibold text-fg hover:bg-surface-2"
          >
            {mostrarTudo ? <EyeOff aria-hidden="true" className="size-3.5" /> : <Eye aria-hidden="true" className="size-3.5" />}
            {mostrarTudo ? "Ocultar gabarito" : "Mostrar tudo"}
          </button>
          {respondidas > 0 && (
            <button
              type="button"
              onClick={reiniciar}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-borda bg-surface px-2.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-fg"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Refazer
            </button>
          )}
        </div>
      </div>

      <ol className="space-y-2.5">
        {itens.map((it, i) => {
          const escolha = respostas[i];
          const revelado = !!escolha || mostrarTudo;
          const acertou = escolha === it.gabarito;
          return (
            <li
              key={i}
              className={`rounded-xl border p-3.5 transition-colors ${
                escolha
                  ? acertou
                    ? "border-ok/50 bg-ok-bg/40"
                    : "border-bad/50 bg-bad-bg/40"
                  : "border-borda bg-surface"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-fg sm:text-base">
                  <span className="mr-1.5 font-bold text-muted">{i + 1}.</span>
                  {renderInline(it.enunciado, `vf-en-${i}`)}
                </p>

                <div className="flex shrink-0 items-center gap-2" role="group" aria-label={`Julgar afirmação ${i + 1}`}>
                  {(["V", "F"] as const).map((op) => {
                    const selecionada = escolha === op;
                    const ehCorreta = revelado && it.gabarito === op;
                    const ehErrada = selecionada && !acertou;
                    const estilo = ehCorreta
                      ? "border-ok bg-ok text-surface"
                      : ehErrada
                        ? "border-bad bg-bad text-surface"
                        : "border-borda-forte bg-surface text-fg hover:border-accent-texto hover:bg-surface-2";
                    return (
                      <button
                        key={op}
                        type="button"
                        disabled={!!escolha}
                        aria-pressed={selecionada}
                        onClick={() => responder(i, op)}
                        className={`inline-flex min-h-10 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 px-3 text-sm font-extrabold transition-colors disabled:cursor-default ${estilo}`}
                      >
                        {ehCorreta && <Check aria-hidden="true" className="size-4" />}
                        {op}
                      </button>
                    );
                  })}
                </div>
              </div>

              {revelado && (
                <div
                  role="status"
                  className={`mt-2.5 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    escolha
                      ? acertou
                        ? "bg-ok-bg text-ok"
                        : "bg-bad-bg text-bad"
                      : "bg-surface-2 text-fg"
                  }`}
                >
                  {escolha ? (
                    acertou ? (
                      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    )
                  ) : null}
                  <p className="min-w-0 leading-snug">
                    <strong>
                      {escolha
                        ? acertou
                          ? `Correto (${it.gabarito === "V" ? "Verdadeiro" : "Falso"}).`
                          : `Gabarito: ${it.gabarito === "V" ? "Verdadeiro" : "Falso"}.`
                        : `${it.gabarito === "V" ? "Verdadeiro" : "Falso"}.`}
                    </strong>{" "}
                    {it.explicacao && (
                      <span className={escolha ? "text-fg" : "text-muted"}>
                        {renderInline(it.explicacao, `vf-ex-${i}`)}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
