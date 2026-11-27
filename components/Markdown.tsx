// Renderizador seguro de markdown (sem HTML bruto): títulos, listas, tabelas, citações tipadas
// (Analogia, Exemplo, Para decorar, Atenção, Abertura), pegadinhas, blocos visuais (mapa, fluxo, comparar)
// e treino interativo de V ou F na seção "Como a Fundatec cobra".
import type { ReactNode } from "react";
import { AlertTriangle, Brain, FlaskConical, Info, Lightbulb, Zap } from "lucide-react";
import { FluxogramaVisual, MapaMentalVisual, QuadroCompararVisual } from "@/components/edital/DiagramaResumo";
import TreinoVF from "@/components/edital/TreinoVF";
import { parsearItensVF } from "@/lib/resumo";

const RE_INLINE = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function inline(texto: string, chave: string): ReactNode[] {
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
          {inline(t.slice(1, fim), k)}
        </a>,
      );
    } else if (t.startsWith("**")) partes.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>);
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

function celulas(linha: string): string[] {
  return linha
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const ehSeparadorTabela = (l: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(l.trim());

const CLASSE_TITULO: Record<number, string> = {
  1: "mt-6 text-xl font-extrabold",
  2: "mt-7 border-b border-borda pb-1.5 text-lg font-extrabold",
  3: "mt-4 text-base font-bold text-accent-texto",
  4: "mt-3 text-base font-bold",
};

type EstiloCitacao = {
  container: string;
  icone: typeof Lightbulb;
  corIcone: string;
  rotulo?: string;
  stripPrefix?: RegExp;
};

function classificarCitacao(primeiraLinha: string): EstiloCitacao {
  const s = primeiraLinha.trim();
  if (/^💡/.test(s)) {
    return {
      container: "rounded-2xl border border-accent/40 border-l-4 border-l-accent bg-accent-suave/70 px-4 py-3.5",
      icone: Lightbulb,
      corIcone: "text-accent-texto",
      stripPrefix: /^💡\s*/,
    };
  }
  if (/^🧪/.test(s)) {
    return {
      container:
        "rounded-2xl border border-[var(--d-esp)]/35 border-l-4 border-l-[var(--d-esp)] bg-[var(--d-esp-bg)]/60 px-4 py-3.5",
      icone: FlaskConical,
      corIcone: "text-[var(--d-esp)]",
      stripPrefix: /^🧪\s*/,
    };
  }
  if (/^🧠/.test(s)) {
    return {
      container: "rounded-2xl border border-ambar/70 border-l-4 border-l-ambar bg-ambar-bg/80 px-4 py-3.5",
      icone: Brain,
      corIcone: "text-ambar-texto",
      stripPrefix: /^🧠\s*/,
    };
  }
  if (/^⚠️/.test(s)) {
    return {
      container: "rounded-2xl border border-warn/50 border-l-4 border-l-warn bg-warn-bg/80 px-4 py-3.5",
      icone: AlertTriangle,
      corIcone: "text-warn",
      stripPrefix: /^⚠️\s*/,
    };
  }
  if (/^\*\*Por que importa:?\*\*/i.test(s) || /^\*\*Fonte oficial:?\*\*/i.test(s)) {
    return {
      container: "rounded-2xl border border-borda bg-surface-2/80 px-4 py-3.5 text-sm",
      icone: Info,
      corIcone: "text-accent-texto",
    };
  }
  return {
    container: "rounded-r-xl border-l-4 border-accent bg-accent-suave px-4 py-3",
    icone: Info,
    corIcone: "text-accent-texto",
  };
}

function normTitulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Markdown({ texto, tituloSecao }: { texto: string; tituloSecao?: string }) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const tituloSecaoNorm = tituloSecao ? normTitulo(tituloSecao) : "";
  if (tituloSecaoNorm.startsWith("como a fundatec cobra")) {
    const vf = parsearItensVF(linhas);
    if (vf) {
      return <TreinoVF introducao={vf.introducao} itens={vf.itens} />;
    }
  }
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  let ordenada = false;
  let paragrafo: string[] = [];
  let modoPegadinha = false;
  let modoRevisao30 = tituloSecaoNorm.startsWith("revisao em 30 segundos");

  const fechaLista = () => {
    if (!lista.length) return;
    const itens = lista.map((l, i) => <li key={i}>{inline(l, `li${blocos.length}-${i}`)}</li>);
    if (modoPegadinha) {
      blocos.push(
        <div
          key={blocos.length}
          className="rounded-2xl border border-warn/50 border-l-4 border-l-warn bg-warn-bg/65 px-4 py-3.5"
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-warn">
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
            Pegadinhas da banca
          </p>
          <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed marker:text-warn">{itens}</ul>
        </div>,
      );
      modoPegadinha = false;
    } else if (modoRevisao30) {
      blocos.push(
        <div
          key={blocos.length}
          className="rounded-2xl border border-accent/45 bg-accent-suave/55 px-4 py-3.5"
        >
          <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-accent-texto">
            <Zap aria-hidden="true" className="size-4 shrink-0" />
            Checklist rápido
          </p>
          <ul className="ml-5 list-disc space-y-1.5 marker:text-accent-texto">{itens}</ul>
        </div>,
      );
      modoRevisao30 = false;
    } else {
      blocos.push(
        ordenada ? (
          <ol key={blocos.length} className="ml-6 list-decimal space-y-1 marker:font-semibold marker:text-muted">
            {itens}
          </ol>
        ) : (
          <ul key={blocos.length} className="ml-6 list-disc space-y-1 marker:text-accent-texto">
            {itens}
          </ul>
        ),
      );
    }
    lista = [];
  };

  const fechaParagrafo = () => {
    if (!paragrafo.length) return;
    const unido = paragrafo.join(" ");
    if (/^\*\*Pegadinhas?:?\*\*$/i.test(unido.trim())) {
      modoPegadinha = true;
      paragrafo = [];
      return;
    }
    if (/^\*\*Pegadinha:?\*\*\s+/i.test(unido.trim())) {
      const resto = unido.trim().replace(/^\*\*Pegadinha:?\*\*\s+/i, "");
      blocos.push(
        <div
          key={blocos.length}
          className="flex items-start gap-2.5 rounded-2xl border border-warn/50 border-l-4 border-l-warn bg-warn-bg/65 px-4 py-3"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-warn" />
          <p className="min-w-0 text-sm leading-relaxed">
            <strong className="text-warn">Pegadinha: </strong>
            {inline(resto, `peg${blocos.length}`)}
          </p>
        </div>,
      );
      paragrafo = [];
      return;
    }
    blocos.push(<p key={blocos.length}>{inline(unido, `p${blocos.length}`)}</p>);
    paragrafo = [];
  };

  const fechaTudo = () => {
    fechaParagrafo();
    fechaLista();
  };

  for (let n = 0; n < linhas.length; n++) {
    const rawLine = linhas[n];
    const l = rawLine.trim();
    const fence = l.match(/^```([a-zA-Z0-9_-]*)\s*$/);
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    const ul = l.match(/^[-*]\s+(.*)$/);
    const ol = l.match(/^\d+[.)]\s+(.*)$/);

    if (fence) {
      fechaTudo();
      const lang = fence[1].toLowerCase();
      const corpo: string[] = [];
      n++;
      while (n < linhas.length && !linhas[n].trim().startsWith("```")) {
        corpo.push(linhas[n]);
        n++;
      }
      const codigo = corpo.join("\n").trim();
      const k = `code-${blocos.length}`;
      if (lang === "mapa") {
        blocos.push(<MapaMentalVisual key={k} codigo={codigo} inline={inline} chave={k} />);
      } else if (lang === "fluxo" || lang === "linha-tempo") {
        blocos.push(<FluxogramaVisual key={k} codigo={codigo} inline={inline} chave={k} />);
      } else if (lang === "comparar") {
        blocos.push(<QuadroCompararVisual key={k} codigo={codigo} inline={inline} chave={k} />);
      } else if (codigo) {
        blocos.push(
          <pre
            key={k}
            className="overflow-x-auto rounded-xl border border-borda bg-surface-2 px-4 py-3 font-mono text-sm leading-relaxed text-fg"
          >
            <code>{codigo}</code>
          </pre>,
        );
      }
    } else if (!l) {
      fechaTudo();
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) {
      fechaTudo();
      modoPegadinha = false;
      modoRevisao30 = false;
      blocos.push(<hr key={blocos.length} className="border-borda" />);
    } else if (h) {
      fechaTudo();
      modoPegadinha = false;
      const nivel = h[1].length;
      const tituloNorm = normTitulo(h[2]);
      modoRevisao30 = nivel === 2 && tituloNorm.startsWith("revisao em 30 segundos");

      // O título da página é o h1/h2; o conteúdo começa em h3.
      blocos.push(
        <h3 key={blocos.length} className={CLASSE_TITULO[nivel]}>
          {inline(h[2], `h${blocos.length}`)}
        </h3>,
      );

      // Seção "Como a Fundatec cobra": tenta montar treino interativo V ou F.
      if (nivel === 2 && tituloNorm.startsWith("como a fundatec cobra")) {
        const blocoLinhas: string[] = [];
        let cursor = n + 1;
        while (cursor < linhas.length) {
          const prox = linhas[cursor].trim();
          if (/^##\s+/.test(prox) || /^(-{3,}|\*{3,}|_{3,})$/.test(prox)) break;
          blocoLinhas.push(linhas[cursor]);
          cursor++;
        }
        const vf = parsearItensVF(blocoLinhas);
        if (vf) {
          blocos.push(<TreinoVF key={`vf-${blocos.length}`} introducao={vf.introducao} itens={vf.itens} />);
          n = cursor - 1;
        }
      }
    } else if (l.startsWith(">")) {
      fechaTudo();
      const gruposCitacao: string[][] = [];
      let grupoAtual: string[] = [];
      while (n < linhas.length && linhas[n].trim().startsWith(">")) {
        const conteudo = linhas[n].trim().replace(/^>\s?/, "");
        if (grupoAtual.length > 0 && /^(?:💡|🧪|🧠|⚠️)/.test(conteudo.trim())) {
          gruposCitacao.push(grupoAtual);
          grupoAtual = [conteudo];
        } else {
          grupoAtual.push(conteudo);
        }
        n++;
      }
      if (grupoAtual.length > 0) gruposCitacao.push(grupoAtual);
      n--;
      for (const citacao of gruposCitacao) {
        const limpas = citacao.filter((c) => c.trim());
        if (limpas.length === 0) continue;
        const estilo = classificarCitacao(limpas[0]);
        const Icone = estilo.icone;
        const k = blocos.length;
        blocos.push(
          <blockquote key={k} className={`flex items-start gap-3 ${estilo.container}`}>
            <Icone aria-hidden="true" className={`mt-1 size-4.5 shrink-0 ${estilo.corIcone}`} />
            <div className="min-w-0 flex-1 space-y-1.5">
              {limpas.map((c, i) => {
                const textoLinha = i === 0 && estilo.stripPrefix ? c.replace(estilo.stripPrefix, "") : c;
                return <p key={i}>{inline(textoLinha, `q${k}-${i}`)}</p>;
              })}
            </div>
          </blockquote>,
        );
      }
    } else if (l.startsWith("|") && n + 1 < linhas.length && ehSeparadorTabela(linhas[n + 1])) {
      fechaTudo();
      const cab = celulas(l);
      n += 2;
      const corpo: string[][] = [];
      while (n < linhas.length && linhas[n].trim().startsWith("|")) {
        corpo.push(celulas(linhas[n]));
        n++;
      }
      n--;
      const k = blocos.length;
      blocos.push(
        <div key={k} className="overflow-x-auto rounded-xl border border-borda">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                {cab.map((c, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-bold">
                    {inline(c, `th${k}-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((linha, r) => (
                <tr key={r} className="border-t border-borda align-top">
                  {linha.map((c, i) => (
                    <td key={i} className="px-3 py-2">
                      {inline(c, `td${k}-${r}-${i}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (ul || ol) {
      fechaParagrafo();
      const ehOrd = !!ol;
      if (lista.length && ordenada !== ehOrd) fechaLista();
      ordenada = ehOrd;
      lista.push((ul ?? ol)![1]);
    } else {
      fechaLista();
      paragrafo.push(l);
    }
  }
  fechaTudo();
  return <div className="space-y-3 leading-relaxed">{blocos}</div>;
}
