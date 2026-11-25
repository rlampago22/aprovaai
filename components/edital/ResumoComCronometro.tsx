"use client";
import { useEffect, useState } from "react";
import { Check, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { formatarDuracao } from "@/lib/datas";
import { alternarEstudo } from "@/lib/queries";

function formatarRelogio(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function dataBR(feitoEm: string): string {
  const [a, m, d] = feitoEm.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

interface Props {
  conteudoId: number;
  minutosPadrao: number;
  feitoEm?: string;
  minutosSalvos?: number;
  children: React.ReactNode;
}

export default function ResumoComCronometro({
  conteudoId,
  minutosPadrao,
  feitoEm,
  minutosSalvos,
  children,
}: Props) {
  const { catalogo, atualizarEstado } = useStore();
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (feitoEm || pausado) return;
    let visivel = typeof document === "undefined" ? true : !document.hidden;
    const onVis = () => {
      visivel = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => {
      if (visivel) setSegundos((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [feitoEm, pausado]);

  const usouCronometro = segundos >= 30;
  const minutosParaSalvar = usouCronometro
    ? Math.min(180, Math.max(1, Math.round(segundos / 60)))
    : minutosPadrao;

  function aoAlternar() {
    if (!catalogo) return;
    atualizarEstado((atual) =>
      alternarEstudo(catalogo, atual, conteudoId, feitoEm ? null : minutosParaSalvar).estado,
    );
  }

  return (
    <div className="space-y-4">
      {!feitoEm && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borda bg-surface-2 px-3.5 py-2.5 text-sm"
          role="region"
          aria-label="Cronômetro de leitura do resumo"
        >
          <div className="flex items-center gap-2">
            <Timer aria-hidden="true" className="size-4 text-accent-texto" />
            <span className="font-semibold text-muted">Tempo de leitura:</span>
            <span className="font-mono text-base font-bold tabular-nums text-fg">
              {formatarRelogio(segundos)}
            </span>
            {pausado && <span className="text-xs font-semibold text-ambar-texto">(pausado)</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPausado((p) => !p)}
              className="btn min-h-9 px-3 py-1 text-xs"
            >
              {pausado ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
              {pausado ? "Retomar" : "Pausar"}
            </button>
            {segundos > 0 && (
              <button
                type="button"
                onClick={() => setSegundos(0)}
                className="btn min-h-9 px-3 py-1 text-xs"
                aria-label="Zerar cronômetro de leitura"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Zerar
              </button>
            )}
          </div>
        </div>
      )}

      {children}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={aoAlternar}
          aria-pressed={!!feitoEm}
          className={`btn ${feitoEm ? "border-ok bg-ok-bg text-ok" : "btn-primario"}`}
        >
          <Check aria-hidden="true" className="size-4" />
          {feitoEm
            ? "Lido"
            : usouCronometro
              ? `Marcar como lido (${formatarDuracao(minutosParaSalvar)})`
              : `Marcar como lido (${minutosPadrao} min estimados)`}
        </button>
        {feitoEm ? (
          <span className="text-sm text-muted">
            em {dataBR(feitoEm)} · {formatarDuracao(minutosSalvos ?? minutosPadrao)} · clique para desfazer
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Timer aria-hidden="true" className="size-3.5" />
            <span className="font-mono tabular-nums">{formatarRelogio(segundos)}</span>
            <span>· pausa sozinho se você sair da aba</span>
          </span>
        )}
      </div>
    </div>
  );
}
