"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Tema = "sistema" | "claro" | "escuro";
type Fonte = "normal" | "grande" | "maior";

function IconeTema({ tema }: { tema: Tema }) {
  const Icone = tema === "sistema" ? Monitor : tema === "claro" ? Sun : Moon;
  return <Icone aria-hidden="true" className="size-4" />;
}

function aplicar(tema: Tema, fonte: Fonte) {
  const d = document.documentElement;
  if (tema === "sistema") d.removeAttribute("data-tema");
  else d.setAttribute("data-tema", tema);
  if (fonte === "normal") d.removeAttribute("data-fonte");
  else d.setAttribute("data-fonte", fonte);
}

export default function Preferencias() {
  const [tema, setTema] = useState<Tema>("sistema");
  const [fonte, setFonte] = useState<Fonte>("normal");

  useEffect(() => {
    const t = localStorage.getItem("aprovaai-tema");
    const f = localStorage.getItem("aprovaai-fonte");
    /* eslint-disable react-hooks/set-state-in-effect -- lê preferência salva só no cliente (evita divergência na hidratação) */
    if (t === "claro" || t === "escuro") setTema(t);
    if (f === "grande" || f === "maior") setFonte(f);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function mudarTema(t: Tema) {
    setTema(t);
    if (t === "sistema") localStorage.removeItem("aprovaai-tema");
    else localStorage.setItem("aprovaai-tema", t);
    aplicar(t, fonte);
  }
  function mudarFonte(f: Fonte) {
    setFonte(f);
    if (f === "normal") localStorage.removeItem("aprovaai-fonte");
    else localStorage.setItem("aprovaai-fonte", f);
    aplicar(tema, f);
  }

  const grupo = "inline-flex overflow-hidden rounded-xl border border-borda-forte";
  const botao = (ativo: boolean) =>
    `inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 text-sm font-semibold ${ativo ? "bg-accent text-accent-fg" : "bg-surface hover:bg-surface-2"}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Tema" className={grupo}>
        {(["sistema", "claro", "escuro"] as Tema[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tema === t}
            onClick={() => mudarTema(t)}
            className={botao(tema === t)}
          >
            <IconeTema tema={t} />
            {t === "sistema" ? "Auto" : t === "claro" ? "Claro" : "Escuro"}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Tamanho da fonte" className={grupo}>
        {(
          [
            ["normal", "A", "Fonte normal"],
            ["grande", "A+", "Fonte grande"],
            ["maior", "A++", "Fonte maior"],
          ] as [Fonte, string, string][]
        ).map(([v, r, rotulo]) => (
          <button
            key={v}
            type="button"
            aria-pressed={fonte === v}
            aria-label={rotulo}
            onClick={() => mudarFonte(v)}
            className={botao(fonte === v)}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
