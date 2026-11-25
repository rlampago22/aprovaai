// Seleção de questões "mistas": reparte N questões entre as disciplinas na proporção do peso na prova,
// com as sobras indo primeiro para a disciplina de maior peso. Função pura.

export interface GrupoMisto<T> {
  /** Peso da disciplina (ex.: questões na prova). */
  peso: number;
  /** Candidatas, já na ordem de preferência (ex.: menos vistas primeiro). */
  itens: T[];
}

export function selecionarMisto<T>(grupos: GrupoMisto<T>[], n: number): T[] {
  const ordem = [...grupos].filter((g) => g.itens.length > 0).sort((a, b) => b.peso - a.peso);
  const total = ordem.reduce((s, g) => s + g.peso, 0);
  if (n <= 0 || ordem.length === 0 || total <= 0) return [];
  const cota = ordem.map((g) => Math.min(g.itens.length, Math.floor((n * g.peso) / total)));
  let faltam = n - cota.reduce((s, x) => s + x, 0);
  // Sobras: uma a uma, da disciplina de maior peso para a de menor, enquanto houver questões.
  while (faltam > 0) {
    let deu = false;
    for (let i = 0; i < ordem.length && faltam > 0; i++) {
      if (cota[i] < ordem[i].itens.length) {
        cota[i]++;
        faltam--;
        deu = true;
      }
    }
    if (!deu) break;
  }
  return ordem.flatMap((g, i) => g.itens.slice(0, cota[i]));
}
