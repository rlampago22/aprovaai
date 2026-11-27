// Componentes visuais estruturados para resumos: mapa mental, fluxograma/linha do tempo e quadro comparativo.
// 100% responsivos, tema claro/escuro com contraste AA e escala fluida de fonte.
import type { ReactNode } from "react";
import { GitCommitHorizontal, Network, Scale } from "lucide-react";

type RenderInline = (texto: string, chave: string) => ReactNode[];

type CorRamo = "teal" | "azul" | "violeta" | "ambar" | "esmeralda" | "alerta";

const CICLO_CORES: CorRamo[] = ["teal", "azul", "violeta", "ambar", "esmeralda", "alerta"];

const ESTILO_RAMO: Record<CorRamo, { borda: string; cabecalho: string; ponto: string; titulo: string }> = {
  teal: {
    borda: "border-accent/50",
    cabecalho: "bg-accent-suave",
    ponto: "bg-accent",
    titulo: "text-accent-texto",
  },
  azul: {
    borda: "border-[var(--d-pt)]/45",
    cabecalho: "bg-[var(--d-pt-bg)]",
    ponto: "bg-[var(--d-pt)]",
    titulo: "text-[var(--d-pt)]",
  },
  violeta: {
    borda: "border-[var(--d-leg)]/45",
    cabecalho: "bg-[var(--d-leg-bg)]",
    ponto: "bg-[var(--d-leg)]",
    titulo: "text-[var(--d-leg)]",
  },
  ambar: {
    borda: "border-ambar/70",
    cabecalho: "bg-ambar-bg",
    ponto: "bg-ambar",
    titulo: "text-ambar-texto",
  },
  esmeralda: {
    borda: "border-[var(--d-esp)]/45",
    cabecalho: "bg-[var(--d-esp-bg)]",
    ponto: "bg-[var(--d-esp)]",
    titulo: "text-[var(--d-esp)]",
  },
  alerta: {
    borda: "border-bad/45",
    cabecalho: "bg-bad-bg",
    ponto: "bg-bad",
    titulo: "text-bad",
  },
};

const ALIAS_COR: Record<string, CorRamo> = {
  teal: "teal",
  petroleo: "teal",
  verde: "esmeralda",
  esmeralda: "esmeralda",
  azul: "azul",
  violeta: "violeta",
  roxo: "violeta",
  ambar: "ambar",
  amarelo: "ambar",
  laranja: "ambar",
  alerta: "alerta",
  vermelho: "alerta",
};

interface RamoMapa {
  titulo: string;
  cor: CorRamo;
  itens: { texto: string; subitens: string[] }[];
}

function parsearMapa(codigo: string): { centro: string; ramos: RamoMapa[] } | null {
  const linhas = codigo
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (linhas.length < 2) return null;

  let idxInicio = 0;
  let centro = "Mapa mental";
  if (!/^\s*[-*]\s+/.test(linhas[0])) {
    centro = linhas[0].replace(/^#+\s*/, "").trim();
    idxInicio = 1;
  }

  const ramos: RamoMapa[] = [];
  for (let i = idxInicio; i < linhas.length; i++) {
    const raw = linhas[i];
    const m = raw.match(/^(\s*)[-*]\s+(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ").length;
    const conteudo = m[2].trim();

    if (indent < 2) {
      let titulo = conteudo;
      let cor: CorRamo = CICLO_CORES[ramos.length % CICLO_CORES.length];
      const tagCor = titulo.match(/\s*\[([a-zA-ZÀ-ÿ]+)\]\s*$/);
      if (tagCor) {
        const chave = tagCor[1]
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        if (ALIAS_COR[chave]) cor = ALIAS_COR[chave];
        titulo = titulo.slice(0, tagCor.index).trim();
      }
      ramos.push({ titulo, cor, itens: [] });
    } else if (indent < 4) {
      const atual = ramos[ramos.length - 1];
      if (atual) atual.itens.push({ texto: conteudo, subitens: [] });
    } else {
      const atual = ramos[ramos.length - 1];
      const ultimoItem = atual?.itens[atual.itens.length - 1];
      if (ultimoItem) ultimoItem.subitens.push(conteudo);
      else if (atual) atual.itens.push({ texto: conteudo, subitens: [] });
    }
  }

  if (ramos.length === 0) return null;
  return { centro, ramos };
}

export function MapaMentalVisual({
  codigo,
  inline,
  chave,
}: {
  codigo: string;
  inline: RenderInline;
  chave: string;
}) {
  const mapa = parsearMapa(codigo);
  if (!mapa) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-borda bg-surface-2 p-4 text-sm">
        <code>{codigo}</code>
      </pre>
    );
  }

  const cols =
    mapa.ramos.length === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : mapa.ramos.length === 1
        ? "grid-cols-1"
        : "sm:grid-cols-2";

  return (
    <figure
      aria-label={`Mapa mental: ${mapa.centro}`}
      className="my-4 overflow-hidden rounded-2xl border border-borda bg-bg/60 p-4 sm:p-5"
    >
      <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1.5 text-accent-texto">
          <Network aria-hidden="true" className="size-4" />
          Mapa mental
        </span>
        <span className="font-medium normal-case tracking-normal">Visão rápida para memorizar</span>
      </figcaption>

      {/* Nó central */}
      <div className="flex flex-col items-center">
        <div className="max-w-xl rounded-2xl border-2 border-accent bg-accent px-5 py-2.5 text-center shadow-sm">
          <p className="titulo text-base font-extrabold text-accent-fg sm:text-lg">
            {inline(mapa.centro, `${chave}-centro`)}
          </p>
        </div>
        {/* Conector vertical + barra de distribuição */}
        <div aria-hidden="true" className="h-4 w-0.5 bg-borda-forte/70" />
        {mapa.ramos.length > 1 && <div aria-hidden="true" className="h-0.5 w-3/4 max-w-2xl bg-borda-forte/50" />}
      </div>

      {/* Ramos */}
      <div className={`mt-3 grid gap-3 ${cols}`}>
        {mapa.ramos.map((ramo, ri) => {
          const st = ESTILO_RAMO[ramo.cor];
          return (
            <div
              key={ri}
              className={`flex flex-col overflow-hidden rounded-xl border-2 bg-surface shadow-xs ${st.borda}`}
            >
              <div className={`flex items-center gap-2 px-3.5 py-2 ${st.cabecalho}`}>
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${st.ponto}`} />
                <h4 className={`titulo text-sm font-extrabold sm:text-base ${st.titulo}`}>
                  {inline(ramo.titulo, `${chave}-r${ri}`)}
                </h4>
              </div>
              {ramo.itens.length > 0 && (
                <ul className="space-y-1.5 px-3.5 py-3 text-sm leading-snug">
                  {ramo.itens.map((it, ii) => (
                    <li key={ii} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 size-1.5 shrink-0 rounded-full opacity-75 ${st.ponto}`}
                        />
                        <span className="min-w-0 text-fg">{inline(it.texto, `${chave}-r${ri}-i${ii}`)}</span>
                      </div>
                      {it.subitens.length > 0 && (
                        <ul className="ml-4 space-y-1 border-l-2 border-borda pl-2.5 text-xs text-muted">
                          {it.subitens.map((sub, si) => (
                            <li key={si}>{inline(sub, `${chave}-r${ri}-i${ii}-s${si}`)}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

interface PassoFluxo {
  titulo: string;
  detalhe?: string;
  etiqueta?: string;
}

function parsearFluxo(codigo: string): { titulo?: string; passos: PassoFluxo[] } | null {
  const linhas = codigo
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length < 2) return null;

  let titulo: string | undefined;
  let inicio = 0;
  if (linhas[0].startsWith("#")) {
    titulo = linhas[0].replace(/^#+\s*/, "").trim();
    inicio = 1;
  }

  const passos: PassoFluxo[] = [];
  for (let i = inicio; i < linhas.length; i++) {
    const limpa = linhas[i].replace(/^(?:->|→|=>|\d+[.)]|[-*])\s*/, "").trim();
    if (!limpa) continue;
    const partes = limpa.split("|").map((p) => p.trim());
    if (partes.length >= 3) {
      passos.push({ titulo: partes[0], etiqueta: partes[1], detalhe: partes.slice(2).join(" · ") });
    } else if (partes.length === 2) {
      passos.push({ titulo: partes[0], detalhe: partes[1] });
    } else {
      passos.push({ titulo: partes[0] });
    }
  }

  if (passos.length < 2) return null;
  return { titulo, passos };
}

export function FluxogramaVisual({
  codigo,
  inline,
  chave,
}: {
  codigo: string;
  inline: RenderInline;
  chave: string;
}) {
  const fluxo = parsearFluxo(codigo);
  if (!fluxo) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-borda bg-surface-2 p-4 text-sm">
        <code>{codigo}</code>
      </pre>
    );
  }

  return (
    <figure
      aria-label={fluxo.titulo ? `Fluxograma: ${fluxo.titulo}` : "Fluxograma / Linha do tempo"}
      className="my-4 rounded-2xl border border-borda bg-bg/60 p-4 sm:p-5"
    >
      <figcaption className="mb-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1.5 text-accent-texto">
          <GitCommitHorizontal aria-hidden="true" className="size-4" />
          {fluxo.titulo ?? "Sequência / Linha do tempo"}
        </span>
      </figcaption>

      <ol className="space-y-0">
        {fluxo.passos.map((p, i) => {
          const ultimo = i === fluxo.passos.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
              {!ultimo && (
                <span aria-hidden="true" className="absolute left-[0.95rem] top-8 bottom-0 w-0.5 bg-accent/45" />
              )}
              <span
                aria-hidden="true"
                className="titulo relative z-10 mt-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent text-xs font-extrabold text-accent-fg shadow-xs"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-accent/35 bg-surface px-3.5 py-2.5 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="titulo text-sm font-extrabold text-fg sm:text-base">
                    {inline(p.titulo, `${chave}-ft${i}`)}
                  </span>
                  {p.etiqueta && (
                    <span className="rounded-full bg-ambar-bg px-2.5 py-0.5 text-xs font-bold text-ambar-texto">
                      {p.etiqueta}
                    </span>
                  )}
                </div>
                {p.detalhe && (
                  <p className="mt-1 text-sm leading-snug text-muted">
                    {inline(p.detalhe, `${chave}-fd${i}`)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

interface QuadroComparar {
  titulo?: string;
  colunas: string[];
  linhas: string[][];
}

function parsearComparar(codigo: string): QuadroComparar | null {
  const raw = codigo
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (raw.length < 2) return null;

  let titulo: string | undefined;
  let i = 0;
  if (raw[0].startsWith("#")) {
    titulo = raw[0].replace(/^#+\s*/, "").trim();
    i = 1;
  }
  if (i >= raw.length) return null;

  const colunas = raw[i]
    .replace(/^[-*]\s*/, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  if (colunas.length < 2 || colunas.length > 3) return null;

  const linhas: string[][] = [];
  for (let k = i + 1; k < raw.length; k++) {
    const cel = raw[k]
      .replace(/^[-*]\s*/, "")
      .split("|")
      .map((c) => c.trim());
    if (cel.length >= 2) linhas.push(cel);
  }
  if (linhas.length === 0) return null;
  return { titulo, colunas, linhas };
}

const CORES_COLUNA = [
  { borda: "border-accent/50", cab: "bg-accent-suave text-accent-texto", ponto: "bg-accent" },
  { borda: "border-ambar/70", cab: "bg-ambar-bg text-ambar-texto", ponto: "bg-ambar" },
  { borda: "border-[var(--d-leg)]/45", cab: "bg-[var(--d-leg-bg)] text-[var(--d-leg)]", ponto: "bg-[var(--d-leg)]" },
];

export function QuadroCompararVisual({
  codigo,
  inline,
  chave,
}: {
  codigo: string;
  inline: RenderInline;
  chave: string;
}) {
  const q = parsearComparar(codigo);
  if (!q) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-borda bg-surface-2 p-4 text-sm">
        <code>{codigo}</code>
      </pre>
    );
  }

  return (
    <figure
      aria-label={q.titulo ?? `Comparação: ${q.colunas.join(" vs. ")}`}
      className="my-4 rounded-2xl border border-borda bg-bg/60 p-4 sm:p-5"
    >
      <figcaption className="mb-3.5 flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ambar-texto">
        <Scale aria-hidden="true" className="size-4" />
        {q.titulo ?? "Não confunda na prova"}
      </figcaption>
      <div className={`grid gap-3 ${q.colunas.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {q.colunas.map((col, ci) => {
          const st = CORES_COLUNA[ci % CORES_COLUNA.length];
          return (
            <div key={ci} className={`overflow-hidden rounded-xl border-2 bg-surface ${st.borda}`}>
              <h4 className={`titulo px-3.5 py-2 text-sm font-extrabold sm:text-base ${st.cab}`}>
                {inline(col, `${chave}-cc${ci}`)}
              </h4>
              <ul className="space-y-2 px-3.5 py-3 text-sm leading-snug">
                {q.linhas.map((lin, li) => {
                  const val = lin[ci];
                  if (!val) return null;
                  return (
                    <li key={li} className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${st.ponto}`} />
                      <span className="min-w-0 text-fg">{inline(val, `${chave}-c${ci}-l${li}`)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
