"use client";
import { useState } from "react";
import { BatteryFull, BatteryLow, BatteryMedium, Clock, type LucideIcon } from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { formatarDuracao, hojeISO } from "@/lib/datas";
import type { Energia } from "@/lib/planner";
import { salvarCheckin } from "@/lib/queries";

const OPCOES: { valor: Energia; rotulo: string; icone: LucideIcon }[] = [
  { valor: "baixa", rotulo: "Baixa", icone: BatteryLow },
  { valor: "media", rotulo: "Média", icone: BatteryMedium },
  { valor: "alta", rotulo: "Alta", icone: BatteryFull },
];

interface Props {
  energia: Energia;
  minutosCheckin: number | null;
  minutosPerfil: number;
}

export default function Checkin({ energia, minutosCheckin, minutosPerfil }: Props) {
  const { atualizarEstado } = useStore();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(minutosCheckin ?? minutosPerfil));
  const minutos = minutosCheckin ?? minutosPerfil;

  function salvar(e: Energia, min: number | null) {
    const limitado = min != null && min >= 0 ? Math.min(min, 1440) : null;
    atualizarEstado((atual) => salvarCheckin(atual, hojeISO(), e, limitado));
  }

  return (
    <section
      aria-labelledby="h-checkin"
      className="flex flex-col gap-3 rounded-2xl border border-borda bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="h-checkin" className="text-sm font-bold">
          Como você está hoje?
        </h2>
        <div role="group" aria-labelledby="h-checkin" className="inline-flex overflow-hidden rounded-xl border border-borda-forte">
          {OPCOES.map((o) => {
            const ativo = energia === o.valor;
            const Icone = o.icone;
            return (
              <button
                key={o.valor}
                type="button"
                aria-pressed={ativo}
                onClick={() => salvar(o.valor, minutosCheckin)}
                className={`inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold ${
                  ativo ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-2"
                }`}
              >
                <Icone aria-hidden="true" className="size-4" />
                {o.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {editando ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const n = Number(valor);
            salvar(energia, Number.isFinite(n) && valor.trim() !== "" ? Math.max(0, Math.round(n)) : null);
            setEditando(false);
          }}
        >
          <label htmlFor="min-hoje" className="text-sm font-semibold">
            Minutos hoje
          </label>
          <input
            id="min-hoje"
            type="number"
            min={0}
            max={1440}
            step={5}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="campo !w-24"
          />
          <button type="submit" className="btn btn-primario">
            Salvar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              salvar(energia, null);
              setValor(String(minutosPerfil));
              setEditando(false);
            }}
          >
            Usar o do perfil
          </button>
        </form>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <Clock aria-hidden="true" className="size-4 text-muted" />
          <span>
            Tempo hoje: <strong>{formatarDuracao(minutos)}</strong>
            {minutosCheckin == null && <span className="text-muted"> (do perfil)</span>}
          </span>
          <button
            type="button"
            onClick={() => {
              setValor(String(minutos));
              setEditando(true);
            }}
            className="min-h-11 rounded-lg px-2 font-semibold text-accent-texto underline"
          >
            alterar
          </button>
        </p>
      )}
    </section>
  );
}
