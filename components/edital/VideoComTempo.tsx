"use client";
import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { formatarDuracao } from "@/lib/datas";
import { alternarEstudo } from "@/lib/queries";

function dataBR(feitoEm: string): string {
  const [a, m, d] = feitoEm.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

interface Props {
  conteudoId: number;
  duracaoReal?: number;
  minutosPadrao: number;
  estudo?: { feitoEm: string; minutos: number };
}

export default function VideoComTempo({ conteudoId, duracaoReal, minutosPadrao, estudo }: Props) {
  const { catalogo, atualizarEstado } = useStore();
  const inicial = duracaoReal ?? minutosPadrao;
  const [minutos, setMinutos] = useState<string>(String(inicial));
  const [editando, setEditando] = useState(false);

  const parsed = Number(minutos);
  const minutosValidos =
    Number.isFinite(parsed) && parsed >= 1 ? Math.min(300, Math.round(parsed)) : inicial;
  const videoLongo = (duracaoReal ?? 0) >= 45;

  function alternar() {
    if (!catalogo) return;
    atualizarEstado((atual) =>
      alternarEstudo(catalogo, atual, conteudoId, estudo ? undefined : minutosValidos).estado,
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={!!estudo}
          onClick={alternar}
          className={`btn ${estudo ? "border-ok bg-ok-bg text-ok" : "btn-primario"}`}
        >
          <Check aria-hidden="true" className="size-4" />
          {estudo
            ? "Assistido"
            : `Marcar como assistido (${formatarDuracao(minutosValidos)}${duracaoReal == null ? " est." : ""})`}
        </button>

        {estudo ? (
          <span className="text-sm text-muted">
            em {dataBR(estudo.feitoEm)} · {formatarDuracao(estudo.minutos)} · clique para desfazer
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent-texto underline"
          >
            <Clock aria-hidden="true" className="size-3.5" />
            {editando ? "Fechar ajuste" : "Ajustar tempo assistido"}
          </button>
        )}
      </div>

      {!estudo && (editando || videoLongo) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
          {videoLongo && !editando ? (
            <span>
              Vídeo longo ({formatarDuracao(duracaoReal!)}): se assistiu só um trecho ou em velocidade 1,5×/2×,{" "}
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="cursor-pointer font-semibold text-accent-texto underline"
              >
                ajuste os minutos
              </button>{" "}
              antes de marcar.
            </span>
          ) : (
            <>
              <label htmlFor={`min-vid-${conteudoId}`} className="font-semibold text-fg">
                Minutos assistidos:
              </label>
              <input
                id={`min-vid-${conteudoId}`}
                type="number"
                min={1}
                max={300}
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
                className="campo !min-h-9 !w-24 text-sm tabular-nums"
              />
              <span className="text-xs">
                {duracaoReal != null
                  ? `Duração real do vídeo: ${formatarDuracao(duracaoReal)} (pode mudar se viu um trecho ou em 2×).`
                  : "Informe quanto tempo você assistiu."}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
