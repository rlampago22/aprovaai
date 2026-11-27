// Domínio por tópico: funções puras (sem acesso a banco).
import { diasEntre } from "./datas";

export type EstadoTopico = "nao_visto" | "fraco" | "em_progresso" | "dominado";

export interface TentativaDominio {
  /** Opcional: quando presente, repetições da mesma questão no mesmo dia são ignoradas (vale só a 1ª do dia). */
  questao_id?: number;
  acertou: boolean;
  chutou: boolean;
  /** Data/hora ISO da tentativa (só os 10 primeiros caracteres importam). */
  criada_em: string;
}

/**
 * Mantém apenas a primeira tentativa de cada questão por dia (na ordem recebida).
 * Itens sem `questao_id` passam direto (compatibilidade com testes unitários).
 */
export function deduplicarTentativasPorDia<T extends { questao_id?: number; criada_em: string }>(lista: T[]): T[] {
  const vistos = new Set<string>();
  const out: T[] = [];
  for (const t of lista) {
    if (t.questao_id != null) {
      const chave = `${t.questao_id}|${t.criada_em.slice(0, 10)}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
    }
    out.push(t);
  }
  return out;
}

export interface ResultadoDominio {
  dominio: number;
  estado: EstadoTopico;
  tentativas: number;
}

export const JANELA_RECENTE_DIAS = 14;
export const MIN_TENTATIVAS_DOMINADO = 8;

/** Prior do nível inicial (1–5) para tópicos ainda não vistos: 0,1 … 0,5. */
export function priorDoNivel(nivel: number | undefined): number {
  const n = Math.min(5, Math.max(1, nivel ?? 3));
  return 0.1 + (n - 1) * 0.1;
}

export function pesoRecencia(criadaEm: string, hoje: string): number {
  const idade = diasEntre(criadaEm.slice(0, 10), hoje);
  return idade <= JANELA_RECENTE_DIAS ? 2 : 1;
}

export function estadoDoDominio(dominio: number, tentativas: number): EstadoTopico {
  if (tentativas === 0) return "nao_visto";
  if (dominio >= 0.8 && tentativas >= MIN_TENTATIVAS_DOMINADO) return "dominado";
  if (dominio < 0.5) return "fraco";
  return "em_progresso";
}

/**
 * dominio = (acertos_ponderados + 1) / (tentativas_ponderadas + 2)
 * Últimos 14 dias pesam 2x; acerto com "chutei" conta como meio acerto.
 * Sem tentativas: devolve o prior do nível inicial e estado "nao_visto".
 */
export function calcularDominio(
  tentativas: TentativaDominio[],
  hoje: string,
  prior: number = priorDoNivel(3),
): ResultadoDominio {
  const unicas = deduplicarTentativasPorDia(tentativas);
  if (unicas.length === 0) return { dominio: prior, estado: "nao_visto", tentativas: 0 };
  let acertos = 0;
  let total = 0;
  for (const t of unicas) {
    const w = pesoRecencia(t.criada_em, hoje);
    total += w;
    if (t.acertou) acertos += w * (t.chutou ? 0.5 : 1);
  }
  const dominio = (acertos + 1) / (total + 2);
  return { dominio, estado: estadoDoDominio(dominio, unicas.length), tentativas: unicas.length };
}

export interface DisciplinaNota {
  id: number;
  nome: string;
  questoes_prova: number;
  minimo_acertos: number;
}

export interface ProjecaoDisciplina {
  disciplina_id: number;
  nome: string;
  dominioMedio: number;
  acertosEsperados: number;
  pontos: number;
  minimo: number;
  atingeMinimo: boolean;
}

export interface ProjecaoNota {
  nota: number;
  porDisciplina: ProjecaoDisciplina[];
  atingeMinimos: boolean;
}

export const PONTOS_POR_QUESTAO = 2;
export const NOTA_MINIMA_GERAL = 50;

/** Projeção: domínio médio da disciplina × nº de questões × 2. */
export function projetarNota(
  disciplinas: DisciplinaNota[],
  dominioPorDisciplina: Record<number, number[]>,
): ProjecaoNota {
  const porDisciplina = disciplinas.map((d) => {
    const lista = dominioPorDisciplina[d.id] ?? [];
    const media = lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : 0;
    const acertosEsperados = media * d.questoes_prova;
    return {
      disciplina_id: d.id,
      nome: d.nome,
      dominioMedio: media,
      acertosEsperados,
      pontos: acertosEsperados * PONTOS_POR_QUESTAO,
      minimo: d.minimo_acertos,
      atingeMinimo: acertosEsperados >= d.minimo_acertos,
    };
  });
  const nota = porDisciplina.reduce((s, d) => s + d.pontos, 0);
  return { nota, porDisciplina, atingeMinimos: porDisciplina.every((d) => d.atingeMinimo) };
}
