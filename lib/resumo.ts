// Seções de um resumo em markdown (para o "Resumo expresso" da reta final). Função pura.

export interface SecaoResumo {
  titulo: string;
  markdown: string;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

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
