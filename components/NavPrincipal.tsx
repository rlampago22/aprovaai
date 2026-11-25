"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChartLine,
  ClipboardCheck,
  Ellipsis,
  GraduationCap,
  Map as MapIcon,
  Target,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Preferencias from "./Preferencias";

interface Item {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  embreve?: boolean;
}

const PRINCIPAIS: Item[] = [
  { href: "/", rotulo: "Hoje", icone: CalendarCheck },
  { href: "/praticar", rotulo: "Praticar", icone: Target },
  { href: "/edital", rotulo: "Edital", icone: MapIcon },
  { href: "/perfil", rotulo: "Perfil", icone: UserRound },
];
const SECUNDARIOS: Item[] = [
  { href: "/cronograma", rotulo: "Cronograma", icone: CalendarDays },
  { href: "/simulado", rotulo: "Simulado", icone: ClipboardCheck },
  { href: "/desempenho", rotulo: "Desempenho", icone: ChartLine },
  { href: "/como-estudar", rotulo: "Como estudar", icone: GraduationCap },
  { href: "/questoes/importar", rotulo: "Importar", icone: Upload },
];

function normalizarRota(p: string) {
  const semBarra = p.replace(/\/+$/, "");
  return semBarra || "/";
}

function ativoEm(caminho: string, href: string) {
  const c = normalizarRota(caminho);
  const h = normalizarRota(href);
  return h === "/" ? c === "/" : c === h || c.startsWith(`${h}/`);
}

export default function NavPrincipal() {
  const caminho = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const [rotaAnterior, setRotaAnterior] = useState(caminho);
  const botaoMais = useRef<HTMLButtonElement>(null);

  // Fecha o painel "Mais" ao trocar de página (ajuste de estado durante a renderização).
  if (rotaAnterior !== caminho) {
    setRotaAnterior(caminho);
    setMaisAberto(false);
  }

  useEffect(() => {
    if (!maisAberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMaisAberto(false);
        botaoMais.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maisAberto]);

  const secundarioAtivo = SECUNDARIOS.some((i) => ativoEm(caminho, i.href));
  const maisDestaque = maisAberto || secundarioAtivo;

  return (
    <>
      {/* Desktop: navegação no topo */}
      <nav aria-label="Principal" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-0.5 lg:flex-nowrap">
          {[...PRINCIPAIS, ...SECUNDARIOS].map((i) => {
            const ativo = ativoEm(caminho, i.href);
            const Icone = i.icone;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[0.84rem] font-semibold no-underline ${
                    ativo ? "bg-accent-suave text-accent-texto" : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <Icone aria-hidden="true" className="size-4" />
                  {i.rotulo}
                  {i.embreve && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide">
                      breve
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Celular: barra inferior fixa */}
      <nav
        aria-label="Principal (celular)"
        className="nav-inferior fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-surface md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {PRINCIPAIS.map((i) => {
            const ativo = ativoEm(caminho, i.href);
            const Icone = i.icone;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold no-underline ${
                    ativo ? "text-accent-texto" : "text-muted"
                  }`}
                >
                  <span className={`rounded-full px-4 py-1 ${ativo ? "bg-accent-suave" : ""}`}>
                    <Icone aria-hidden="true" className="size-5" />
                  </span>
                  {i.rotulo}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              ref={botaoMais}
              type="button"
              aria-expanded={maisAberto}
              aria-controls="painel-mais"
              onClick={() => setMaisAberto((v) => !v)}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                maisDestaque ? "text-accent-texto" : "text-muted"
              }`}
            >
              <span className={`rounded-full px-4 py-1 ${maisDestaque ? "bg-accent-suave" : ""}`}>
                {maisAberto ? (
                  <X aria-hidden="true" className="size-5" />
                ) : (
                  <Ellipsis aria-hidden="true" className="size-5" />
                )}
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {maisAberto && (
        <div
          id="painel-mais"
          role="dialog"
          aria-label="Mais opções"
          className="fixed inset-x-3 bottom-20 z-40 rounded-2xl border border-borda bg-surface p-4 shadow-xl md:hidden"
        >
          <ul className="space-y-1">
            {SECUNDARIOS.map((i) => {
              const Icone = i.icone;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={ativoEm(caminho, i.href) ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold no-underline hover:bg-surface-2"
                  >
                    <Icone aria-hidden="true" className="size-5 text-accent-texto" />
                    {i.rotulo}
                    {i.embreve && <span className="text-xs font-normal text-muted">(em breve)</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-borda pt-3">
            <p className="rotulo-secao mb-2">Aparência</p>
            <Preferencias />
          </div>
        </div>
      )}
    </>
  );
}
