// Lógica pura do Simulado: seleção equilibrada, tempo sugerido e correção pelas regras do edital.
import { NOTA_MINIMA_GERAL, PONTOS_POR_QUESTAO, type DisciplinaNota } from "./dominio";

export type TipoSimulado = "completo" | "disciplina" | "topicos" | "periodo";

export const TEMPO_SIMULADO_COMPLETO_MIN = 210; // 3h30
export const MINUTOS_POR_QUESTAO_PROVA = 210 / 50; // 4,2 min (4m12s)

export interface ConfigSimulado {
  titulo: string;
  questaoIds: number[];
  tempoLimiteMin: number;
  disciplinaId?: number;
  topicoIds?: number[];
  diasErros?: number;
}

export interface CandidataSimulado {
  id: number;
  topico_id: number;
}

export interface QuestaoAvaliacao {
  id: number;
  disciplina_id: number;
  disciplina_nome: string;
  topico_id: number;
  topico_titulo: string;
  correta: string;
}

export interface RespostaAvaliacao {
  resposta: string | null;
  chutou: boolean;
}

export interface ResultadoDisciplinaSimulado {
  disciplina_id: number;
  nome: string;
  total: number;
  acertos: number;
  emBranco: number;
  pontos: number;
  taxaAcerto: number;
  minimo: number;
  minimoAplicavel: boolean;
  atingeMinimo: boolean;
}

export interface TopicoReforcoSimulado {
  topico_id: number;
  topico_titulo: string;
  disciplina_id: number;
  disciplina_nome: string;
  total: number;
  acertos: number;
  erros: number;
  chutes: number;
}

export interface ResultadoSimulado {
  tipo: TipoSimulado;
  totalQuestoes: number;
  respondidas: number;
  emBranco: number;
  acertos: number;
  erros: number;
  chutes: number;
  acertosNoChute: number;
  /** Nota de 0 a 100 (no completo: 2 pontos por acerto; nos demais: proporcional a 100). */
  nota: number;
  /** Regra oficial de aprovação (só vale no simulado completo nas proporções da prova). */
  regrasOficiaisAplicaveis: boolean;
  aprovado: boolean;
  atingeMeta: boolean;
  motivosEliminacao: string[];
  porDisciplina: ResultadoDisciplinaSimulado[];
  topicosReforcar: TopicoReforcoSimulado[];
}

/** Tempo sugerido em minutos: 210 min (3h30) no completo; 4,2 min por questão nos recortes (mín. 10). */
export function calcularTempoSugeridoMin(tipo: TipoSimulado, qtdQuestoes: number): number {
  if (tipo === "completo") return TEMPO_SIMULADO_COMPLETO_MIN;
  return Math.max(10, Math.round(Math.max(1, qtdQuestoes) * MINUTOS_POR_QUESTAO_PROVA));
}

/**
 * Seleciona até `limite` questões espalhando entre os tópicos em rodadas (round-robin),
 * mantendo a ordem relativa dentro de cada tópico (ex.: menos vistas primeiro).
 */
export function espalharPorTopico(candidatas: CandidataSimulado[], limite: number): number[] {
  if (limite <= 0 || candidatas.length === 0) return [];
  const filas = new Map<number, number[]>();
  const ordemTopicos: number[] = [];
  for (const c of candidatas) {
    let f = filas.get(c.topico_id);
    if (!f) {
      f = [];
      filas.set(c.topico_id, f);
      ordemTopicos.push(c.topico_id);
    }
    f.push(c.id);
  }
  const escolhidas: number[] = [];
  let houve = true;
  while (escolhidas.length < limite && houve) {
    houve = false;
    for (const tid of ordemTopicos) {
      if (escolhidas.length >= limite) break;
      const f = filas.get(tid)!;
      if (f.length > 0) {
        escolhidas.push(f.shift()!);
        houve = true;
      }
    }
  }
  return escolhidas;
}

/** Avalia as respostas de um simulado pelas regras do Edital IFFar 406/2026. */
export function avaliarSimulado(args: {
  tipo: TipoSimulado;
  disciplinas: DisciplinaNota[];
  questoes: QuestaoAvaliacao[];
  respostas: Record<number, RespostaAvaliacao>;
  notaAlvo: number;
}): ResultadoSimulado {
  const { tipo, disciplinas, questoes, respostas, notaAlvo } = args;
  const totalQuestoes = questoes.length;

  let respondidas = 0;
  let acertos = 0;
  let chutes = 0;
  let acertosNoChute = 0;

  const aggDisc = new Map<number, { total: number; acertos: number; emBranco: number }>();
  const aggTop = new Map<number, TopicoReforcoSimulado>();

  for (const q of questoes) {
    const r = respostas[q.id];
    const resp = r?.resposta ?? null;
    const chutou = !!r?.chutou && resp != null;
    const acertou = resp != null && resp === q.correta;

    if (resp != null) respondidas++;
    if (acertou) acertos++;
    if (chutou) {
      chutes++;
      if (acertou) acertosNoChute++;
    }

    const d = aggDisc.get(q.disciplina_id) ?? { total: 0, acertos: 0, emBranco: 0 };
    d.total++;
    if (acertou) d.acertos++;
    if (resp == null) d.emBranco++;
    aggDisc.set(q.disciplina_id, d);

    const t = aggTop.get(q.topico_id) ?? {
      topico_id: q.topico_id,
      topico_titulo: q.topico_titulo,
      disciplina_id: q.disciplina_id,
      disciplina_nome: q.disciplina_nome,
      total: 0,
      acertos: 0,
      erros: 0,
      chutes: 0,
    };
    t.total++;
    if (acertou) t.acertos++;
    else t.erros++;
    if (chutou) t.chutes++;
    aggTop.set(q.topico_id, t);
  }

  const emBranco = totalQuestoes - respondidas;
  const erros = totalQuestoes - acertos;

  const regrasOficiaisAplicaveis =
    tipo === "completo" &&
    disciplinas.every((d) => (aggDisc.get(d.id)?.total ?? 0) === d.questoes_prova);

  const nota =
    totalQuestoes === 0
      ? 0
      : regrasOficiaisAplicaveis
        ? acertos * PONTOS_POR_QUESTAO
        : Math.round((acertos / totalQuestoes) * 1000) / 10;

  const porDisciplina: ResultadoDisciplinaSimulado[] = disciplinas
    .filter((d) => (aggDisc.get(d.id)?.total ?? 0) > 0)
    .map((d) => {
      const a = aggDisc.get(d.id)!;
      const minimoAplicavel = regrasOficiaisAplicaveis;
      return {
        disciplina_id: d.id,
        nome: d.nome,
        total: a.total,
        acertos: a.acertos,
        emBranco: a.emBranco,
        pontos: a.acertos * PONTOS_POR_QUESTAO,
        taxaAcerto: a.total > 0 ? a.acertos / a.total : 0,
        minimo: d.minimo_acertos,
        minimoAplicavel,
        atingeMinimo: minimoAplicavel ? a.acertos >= d.minimo_acertos : true,
      };
    });

  const motivosEliminacao: string[] = [];
  if (regrasOficiaisAplicaveis) {
    if (nota < NOTA_MINIMA_GERAL) {
      motivosEliminacao.push(`Nota geral abaixo do mínimo de ${NOTA_MINIMA_GERAL} pontos (${nota}/100).`);
    }
    for (const d of porDisciplina) {
      if (!d.atingeMinimo) {
        motivosEliminacao.push(
          `${d.nome} abaixo do mínimo (${d.acertos} de ${d.minimo} acertos exigidos).`,
        );
      }
    }
  }

  const topicosReforcar = [...aggTop.values()]
    .filter((t) => t.erros > 0 || t.chutes > 0)
    .sort((a, b) => b.erros - a.erros || b.chutes - a.chutes || a.acertos / a.total - b.acertos / b.total);

  return {
    tipo,
    totalQuestoes,
    respondidas,
    emBranco,
    acertos,
    erros,
    chutes,
    acertosNoChute,
    nota,
    regrasOficiaisAplicaveis,
    aprovado: regrasOficiaisAplicaveis ? motivosEliminacao.length === 0 : nota >= NOTA_MINIMA_GERAL,
    atingeMeta: nota >= notaAlvo,
    motivosEliminacao,
    porDisciplina,
    topicosReforcar,
  };
}
