"use client";

import { useRef, useState } from "react";
import {
  CircleCheck,
  Clock,
  Download,
  Flag,
  Gauge,
  HardDrive,
  RotateCcw,
  Save,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { hojeISO } from "@/lib/datas";
import { getDisciplinas, getPerfil, salvarPerfil } from "@/lib/queries";
import { exportarBackupJson, importarBackupJson } from "@/lib/store";

const DIAS = [
  ["seg", "Segunda"],
  ["ter", "Terça"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
] as const;

const NIVEIS = [
  [1, "1 – Quase nada"],
  [2, "2 – Pouco"],
  [3, "3 – Razoável"],
  [4, "4 – Bom"],
  [5, "5 – Muito bom"],
] as const;

function inteiro(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export default function PerfilPage() {
  const { pronto, erro, catalogo, estado, atualizarEstado, substituirEstado, resetarEstado } = useStore();
  const [salvo, setSalvo] = useState(false);
  const [msgBackup, setMsgBackup] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const inputBackupRef = useRef<HTMLInputElement>(null);

  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const perfil = getPerfil(estado);
  const disciplinas = getDisciplinas(catalogo);

  function aoSalvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const minutos = { ...perfil.minutos_por_dia };
    for (const [d] of DIAS) {
      const n = inteiro(fd.get(`min_${d}`));
      if (n != null && n >= 0) minutos[d] = Math.min(n, 1440);
    }
    const nivel: Record<string, number> = { ...perfil.nivel_inicial };
    for (const d of disciplinas) {
      const n = inteiro(fd.get(`nivel_${d.id}`));
      if (n != null) nivel[String(d.id)] = Math.min(5, Math.max(1, n));
    }
    const data = String(fd.get("data_prova") ?? "");
    const periodo = String(fd.get("periodo"));
    const nota = inteiro(fd.get("nota_alvo"));

    atualizarEstado((atual) =>
      salvarPerfil(atual, {
        data_prova: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : perfil.data_prova,
        nota_alvo: nota != null ? Math.min(100, Math.max(0, nota)) : perfil.nota_alvo,
        periodo: periodo === "manha" || periodo === "tarde" ? periodo : "noite",
        minutos_por_dia: minutos,
        nivel_inicial: nivel,
      }),
    );
    setSalvo(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function baixarBackup() {
    const json = exportarBackupJson(estado);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aprovaai-backup-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsgBackup({ tipo: "ok", texto: "Backup baixado. Guarde o arquivo se quiser restaurar em outro aparelho." });
  }

  function restaurarBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    if (!arq) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const res = importarBackupJson(reader.result);
      if (res.ok) {
        substituirEstado(res.estado);
        setMsgBackup({ tipo: "ok", texto: "Progresso restaurado com sucesso." });
      } else {
        setMsgBackup({ tipo: "erro", texto: res.erro });
      }
      if (inputBackupRef.current) inputBackupRef.current.value = "";
    };
    reader.readAsText(arq, "utf-8");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Perfil</h1>
      <p className="text-muted">
        O plano do dia se adapta a esses dados. Você pode mudar quando quiser.
      </p>
      {salvo && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-bg p-3 font-semibold text-ok">
          <CircleCheck aria-hidden="true" className="size-5" />
          Perfil salvo.
        </p>
      )}

      <form
        key={`${perfil.data_prova}-${perfil.nota_alvo}-${perfil.periodo}-${JSON.stringify(perfil.minutos_por_dia)}`}
        onSubmit={aoSalvar}
        className="space-y-6"
      >
        <section className="cartao space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Flag aria-hidden="true" className="size-5 text-accent-texto" />
            Prova e meta
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="data_prova" className="mb-1 block text-sm font-medium">
                Data da prova
              </label>
              <input id="data_prova" name="data_prova" type="date" required defaultValue={perfil.data_prova} className="campo" />
            </div>
            <div>
              <label htmlFor="nota_alvo" className="mb-1 block text-sm font-medium">
                Nota-alvo (0 a 100)
              </label>
              <input id="nota_alvo" name="nota_alvo" type="number" min={0} max={100} required defaultValue={perfil.nota_alvo} className="campo" />
            </div>
            <div>
              <label htmlFor="periodo" className="mb-1 block text-sm font-medium">
                Período de estudo
              </label>
              <select id="periodo" name="periodo" defaultValue={perfil.periodo} className="campo">
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
          </div>
        </section>

        <section className="cartao">
          <fieldset className="space-y-4">
            <legend className="flex items-center gap-2 text-lg font-bold">
              <Clock aria-hidden="true" className="size-5 text-accent-texto" />
              Minutos disponíveis por dia
            </legend>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {DIAS.map(([k, r]) => (
                <div key={k}>
                  <label htmlFor={`min_${k}`} className="mb-1 block text-sm font-medium">
                    {r}
                  </label>
                  <input id={`min_${k}`} name={`min_${k}`} type="number" min={0} max={1440} step={5} defaultValue={perfil.minutos_por_dia[k]} className="campo" />
                </div>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="cartao">
          <fieldset className="space-y-4">
            <legend className="flex items-center gap-2 text-lg font-bold">
              <Gauge aria-hidden="true" className="size-5 text-accent-texto" />
              Nível inicial por disciplina
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {disciplinas.map((d) => (
                <div key={d.id}>
                  <label htmlFor={`nivel_${d.id}`} className="mb-1 block text-sm font-medium">
                    {d.nome}
                  </label>
                  <select id={`nivel_${d.id}`} name={`nivel_${d.id}`} defaultValue={perfil.nivel_inicial[String(d.id)] ?? 3} className="campo">
                    {NIVEIS.map(([v, r]) => (
                      <option key={v} value={v}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>
        </section>

        <button type="submit" className="btn btn-primario btn-grande">
          <Save aria-hidden="true" className="size-5" />
          Salvar perfil
        </button>
      </form>

      <section aria-labelledby="h-dados" className="cartao space-y-4">
        <h2 id="h-dados" className="flex items-center gap-2 text-lg font-bold">
          <HardDrive aria-hidden="true" className="size-5 text-accent-texto" />
          Seu progresso neste navegador
        </h2>
        <p className="text-sm text-muted">
          Tudo o que você responde, lê e configura fica salvo só neste navegador (ninguém mais vê seus dados).
          Para levar seu progresso para outro celular ou computador, baixe um backup e importe lá.
        </p>

        {msgBackup && (
          <p
            role="status"
            className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
              msgBackup.tipo === "ok" ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"
            }`}
          >
            {msgBackup.tipo === "ok" ? (
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
            )}
            {msgBackup.texto}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={baixarBackup} className="btn">
            <Download aria-hidden="true" className="size-4" />
            Baixar backup (.json)
          </button>
          <label className="btn cursor-pointer">
            <Upload aria-hidden="true" className="size-4" />
            Restaurar backup
            <input
              ref={inputBackupRef}
              type="file"
              accept=".json,application/json"
              onChange={restaurarBackup}
              className="sr-only"
            />
          </label>
          {!confirmandoReset ? (
            <button
              type="button"
              onClick={() => setConfirmandoReset(true)}
              className="btn text-muted"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Zerar meu progresso
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bad bg-bad-bg px-3 py-2 text-sm text-bad">
              <span className="font-semibold">Apagar todas as suas respostas deste navegador?</span>
              <button
                type="button"
                onClick={() => {
                  resetarEstado();
                  setConfirmandoReset(false);
                  setSalvo(false);
                  setMsgBackup({ tipo: "ok", texto: "Progresso zerado neste navegador." });
                }}
                className="btn !min-h-9 border-bad bg-bad text-xs text-surface"
              >
                Sim, apagar
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoReset(false)}
                className="btn !min-h-9 text-xs"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
