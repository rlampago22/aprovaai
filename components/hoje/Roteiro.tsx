import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Flag,
  RotateCcw,
  Shuffle,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import type { EstadoPasso, Passo, TipoPasso } from "@/lib/planner";

const ICONE: Record<TipoPasso, LucideIcon> = {
  aquecimento: RotateCcw,
  estudo: BookOpen,
  misto: Shuffle,
  simulado: ClipboardCheck,
  fechamento: Flag,
};
const ROTULO_TIPO: Record<TipoPasso, string> = {
  aquecimento: "Aquecimento",
  estudo: "Estudo",
  misto: "Misto",
  simulado: "Simulado",
  fechamento: "Fechamento",
};
const ROTULO_ESTADO: Record<EstadoPasso, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  feito: "Feito",
};

export default function Roteiro({
  passos,
  nomeDisciplina,
}: {
  passos: Passo[];
  nomeDisciplina: (id?: number) => string | undefined;
}) {
  const indiceFoco = passos.findIndex((p) => p.estado !== "feito");
  return (
    <ol className="space-y-0">
      {passos.map((p, i) => {
        const Icone = ICONE[p.tipo];
        const foco = i === indiceFoco;
        const feito = p.estado === "feito";
        const disc = nomeDisciplina(p.disciplinaId);
        const ultimo = i === passos.length - 1;
        return (
          <li key={p.ordem} className="relative flex gap-3 pb-4 last:pb-0" aria-current={foco ? "step" : undefined}>
            {!ultimo && <span aria-hidden="true" className="absolute left-[1.15rem] top-10 bottom-0 w-0.5 bg-borda" />}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${
                feito
                  ? "border-ok bg-ok text-surface"
                  : foco
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-borda-forte bg-surface text-muted"
              }`}
            >
              {feito ? <Check className="size-4.5" /> : <Icone className="size-4.5" />}
            </span>

            <div
              className={`min-w-0 flex-1 rounded-2xl border p-4 ${
                foco ? "border-accent bg-accent-suave" : "border-borda bg-surface"
              } ${feito ? "opacity-75" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                <span className="uppercase tracking-wide">{ROTULO_TIPO[p.tipo]}</span>
                {disc && <span className={`chip ${classeDisciplina(disc)}`}>{nomeCurtoDisciplina(disc)}</span>}
                <span className="inline-flex items-center gap-1">
                  <Timer aria-hidden="true" className="size-3.5" />
                  {p.minutos} min
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 ${
                    feito
                      ? "bg-ok-bg text-ok"
                      : p.estado === "em_andamento"
                        ? "bg-ambar-bg text-ambar-texto"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {ROTULO_ESTADO[p.estado]}
                  {p.estado === "em_andamento" &&
                    (p.detalheEstado
                      ? ` · ${p.detalheEstado}`
                      : p.questoes > 0
                        ? ` · ${p.feitas}/${p.questoes}`
                        : null)}
                </span>
              </div>
              <h3 className="mt-1.5 text-lg font-bold">{p.titulo}</h3>
              <p className="text-fg">{p.descricao}</p>
              <p className="mt-0.5 text-sm text-muted">{p.motivo}</p>
              {!feito && (
                <Link
                  href={p.href}
                  className={`btn mt-3 ${foco ? "btn-primario btn-grande w-full sm:w-auto" : ""}`}
                  aria-label={`${
                    p.estado === "em_andamento"
                      ? foco
                        ? "Continuar agora"
                        : "Continuar"
                      : foco
                        ? "Começar agora"
                        : "Começar"
                  }: ${p.titulo}`}
                >
                  {p.estado === "em_andamento"
                    ? foco
                      ? "Continuar agora"
                      : "Continuar"
                    : foco
                      ? "Começar agora"
                      : "Começar"}
                  <ArrowRight aria-hidden="true" className="size-4.5" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
