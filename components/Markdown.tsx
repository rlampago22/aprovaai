// Renderizador mínimo e seguro de markdown (sem HTML bruto): títulos, listas, tabelas, citações,
// linhas horizontais, links http(s), negrito, itálico e código. Estilizado com os tokens do app.
import type { ReactNode } from "react";

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
  2: "mt-6 border-b border-borda pb-1 text-lg font-extrabold",
  3: "mt-4 text-base font-bold text-accent-texto",
  4: "mt-3 text-base font-bold",
};

export default function Markdown({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  let ordenada = false;
  let paragrafo: string[] = [];

  const fechaLista = () => {
    if (!lista.length) return;
    const itens = lista.map((l, i) => <li key={i}>{inline(l, `li${blocos.length}-${i}`)}</li>);
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
    lista = [];
  };
  const fechaParagrafo = () => {
    if (!paragrafo.length) return;
    blocos.push(<p key={blocos.length}>{inline(paragrafo.join(" "), `p${blocos.length}`)}</p>);
    paragrafo = [];
  };
  const fechaTudo = () => {
    fechaParagrafo();
    fechaLista();
  };

  for (let n = 0; n < linhas.length; n++) {
    const l = linhas[n].trim();
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    const ul = l.match(/^[-*]\s+(.*)$/);
    const ol = l.match(/^\d+[.)]\s+(.*)$/);

    if (!l) {
      fechaTudo();
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) {
      fechaTudo();
      blocos.push(<hr key={blocos.length} className="border-borda" />);
    } else if (h) {
      fechaTudo();
      const nivel = h[1].length;
      // O título da página é o h1/h2; o conteúdo começa em h3.
      blocos.push(
        <h3 key={blocos.length} className={CLASSE_TITULO[nivel]}>
          {inline(h[2], `h${blocos.length}`)}
        </h3>,
      );
    } else if (l.startsWith(">")) {
      fechaTudo();
      const citacao: string[] = [];
      while (n < linhas.length && linhas[n].trim().startsWith(">")) {
        citacao.push(linhas[n].trim().replace(/^>\s?/, ""));
        n++;
      }
      n--;
      blocos.push(
        <blockquote
          key={blocos.length}
          className="space-y-1 rounded-r-xl border-l-4 border-accent bg-accent-suave px-4 py-3"
        >
          {citacao
            .filter((c) => c.trim())
            .map((c, i) => (
              <p key={i}>{inline(c, `q${blocos.length}-${i}`)}</p>
            ))}
        </blockquote>,
      );
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
