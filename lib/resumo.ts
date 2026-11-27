// Seções de um resumo em markdown (para o "Resumo expresso" da reta final). Função pura.

export interface SecaoResumo {
  titulo: string;
  markdown: string;
}

export interface ItemVF {
  enunciado: string;
  gabarito: "V" | "F";
  explicacao: string;
}

export interface BlocoVF {
  introducao?: string;
  itens: ItemVF[];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Extrai itens de Verdadeiro ou Falso da seção "Como a Fundatec cobra".
 * Aceita formatos como: `1. "Afirmação..." → **V** (explicação).` ou `- Afirmação -> **F**. Explicação.`
 */
export function parsearItensVF(linhas: string[]): BlocoVF | null {
  const itens: ItemVF[] = [];
  const intro: string[] = [];

  for (const raw of linhas) {
    const l = raw.trim();
    if (!l || /^-{3,}$/.test(l)) continue;
    const semNum = l.replace(/^(?:\d+[.)]|[-*])\s+/, "");
    const ehItemLista = semNum !== l;
    if (!ehItemLista) {
      if (itens.length === 0) intro.push(l);
      continue;
    }
    const m = semNum.match(
      /^(.+?)\s*(?:→|->)\s*\*\*(V|F|Verdadeiro|Falso)(?:\s*[^*]*)?\*\*\.?\s*(.*)$/i,
    );
    if (!m) continue;
    let enunciado = m[1].trim();
    // Remove aspas externas simples/duplas decorativas sem perder conteúdo
    if (
      (enunciado.startsWith('"') && enunciado.endsWith('"')) ||
      (enunciado.startsWith("“") && enunciado.endsWith("”"))
    ) {
      enunciado = enunciado.slice(1, -1).trim();
    }
    const gab = m[2].toUpperCase().startsWith("V") ? "V" : "F";
    const explicacao = m[3].replace(/^[\s.—–:-]+/, "").trim();
    itens.push({ enunciado, gabarito: gab, explicacao });
  }

  if (itens.length < 2) return null;
  return {
    introducao: intro.length > 0 ? intro.join(" ") : undefined,
    itens,
  };
}

/** Seções "## ..." cujo título começa com um dos prefixos (sem acento/caixa), na ordem dos prefixos. */
export function extrairSecoes(markdown: string, prefixos: string[]): SecaoResumo[] {
  const linhas = markdown.replace(/\r\n/g, "\n").split("\n");
  const secoes: SecaoResumo[] = [];
  let atual: { titulo: string; corpo: string[] } | null = null;
  for (const l of linhas) {
    const m = /^##\s+(.+?)\s*$/.exec(l);
    if (m) {
      if (atual) secoes.push({ titulo: atual.titulo, markdown: atual.corpo.join("\n").trim() });
      atual = { titulo: m[1], corpo: [] };
    } else if (atual) {
      atual.corpo.push(l);
    }
  }
  if (atual) secoes.push({ titulo: atual.titulo, markdown: atual.corpo.join("\n").trim() });
  const out: SecaoResumo[] = [];
  for (const p of prefixos) {
    const s = secoes.find((x) => norm(x.titulo).startsWith(norm(p)));
    if (s) out.push({ titulo: s.titulo, markdown: s.markdown.replace(/\n-{3,}\s*$/, "").trim() });
  }
  return out;
}
