// Cálculos puros da página de Desempenho (sem banco nem relógio).
import { formatarDataCurta, somarDias } from "./datas";
import {
  NOTA_MINIMA_GERAL,
  PONTOS_POR_QUESTAO,
  projetarNota,
  type DisciplinaNota,
  type EstadoTopico,
  type ProjecaoDisciplina,
  type ProjecaoNota,
} from "./dominio";
import { inicioDaSemana } from "./meta";

/** Acerto esperado chutando numa questão de 4 alternativas. */
export const CHANCE_CHUTE = 0.25;
/** Abaixo disso, a projeção geral seria só um palpite. */
export const MIN_QUESTOES_PROJECAO = 20;
/** Mínimo por disciplina para a barra e o alerta de mínimo valerem. */
export const MIN_QUESTOES_DISCIPLINA = 5;
/** Quantas semanas aparecem no gráfico de evolução (incluindo a atual). */
export const SEMANAS_EVOLUCAO = 8;
/** Mínimo de questões numa semana para entrar no cálculo de tendência. */
export const MIN_QUESTOES_TENDENCIA = 5;
/** Tempo máximo considerado por questão (30 min), para ignorar abas deixadas abertas. */
const TEMPO_MAX_QUESTAO_MS = 30 * 60 * 1000;
/** Ritmo da prova real: 3h30 (210 min) para 50 questões = 4m12s por questão. */
export const TEMPO_PROVA_POR_QUESTAO_S = Math.round((210 * 60) / 50);

export interface TentativaDesempenho {
  topico_id: number;
  disciplina_id: number;
  acertou: boolean;
  chutou: boolean;
  tempo_ms: number | null;
  criada_em: string;
}

export interface TopicoBaseDesempenho {
  id: number;
  disciplina_id: number;
  disciplina_nome: string;
  ordem: number;
  titulo_curto: string;
  n_questoes: number;
  dominio: number;
  estado: EstadoTopico;
  tentativas: number;
}

export interface DesempenhoDisciplina extends ProjecaoDisciplina {
  questoes_prova: number;
  pontosMaximos: number;
  metaAcertos: number;
  tentativas: number;
  acertos: number;
  acertosSemChute: number;
  taxaAcerto: number | null;
  comDados: boolean;
  topicosTotal: number;
  topicosVistos: number;
  topicosDominados: number;
  topicosFracos: number;
}

export interface DesempenhoTopico {
  id: number;
  disciplina_id: number;
  disciplina_nome: string;
  ordem: number;
  titulo_curto: string;
  n_questoes: number;
  dominio: number;
  estado: EstadoTopico;
  tentativas: number;
  acertos: number;
  acertosSemChute: number;
  chutes: number;
  taxaAcerto: number | null;
  ultimaTentativa: string | null;
  revisoesVencidas: number;
}

export interface SemanaEvolucao {
  /** Segunda-feira da semana (YYYY-MM-DD). */
  inicio: string;
  /** Domingo da semana (YYYY-MM-DD). */
  fim: string;
  /** Rótulo curto da semana (ex.: "23/11"). */
  rotulo: string;
  /** Período completo para legenda e leitores de tela (ex.: "23/11 a 29/11"). */
  periodo: string;
  atual: boolean;
  tentativas: number;
  acertos: number;
  acertosSemChute: number;
  chutes: number;
  taxaAcerto: number | null;
  diasEstudados: number;
}

export interface TendenciaSemanal {
  /** Diferença em pontos percentuais (positivo = melhora). */
  diferencaPp: number;
  semanaAnterior: string;
  semanaAtual: string;
}

export interface ResumoGeralDesempenho {
  totalTentativas: number;
  totalAcertos: number;
  totalAcertosSemChute: number;
  totalChutes: number;
  acertosNoChute: number;
  taxaAcerto: number | null;
  taxaAcertoFirme: number | null;
  tempoMedioSegundos: number | null;
  minutosEstudadosTotal: number;
  diasEstudados7: number;
  diasEstudadosTotal: number;
  topicosPorEstado: {
    nao_visto: number;
    fraco: number;
    em_progresso: number;
    dominado: number;
    total: number;
  };
}

export interface ResumoDesempenho {
  resumo: ResumoGeralDesempenho;
  projecao: ProjecaoNota;
  temBaseProjecao: boolean;
  faltamParaProjecao: number;
  atingeMinimoGeral: boolean;
  atingeMeta: boolean;
  disciplinas: DesempenhoDisciplina[];
  semanas: SemanaEvolucao[];
  tendenciaSemanal: TendenciaSemanal | null;
  topicos: DesempenhoTopico[];
  focoAgora: DesempenhoTopico[];
}

export interface EntradaDesempenho {
  hoje: string;
  disciplinas: DisciplinaNota[];
  topicos: TopicoBaseDesempenho[];
  tentativas: TentativaDesempenho[];
  notaAlvo: number;
  minutosConteudoTotal: number;
  diasEstudados7: number;
  datasEstudoConteudo?: string[];
  revisoesVencidasPorTopico?: Record<number, number>;
  nSemanas?: number;
}

/** Agrupa as tentativas nas últimas N semanas (segunda a domingo), da mais antiga até a atual. */
export function calcularEvolucaoSemanal(
  tentativas: Pick<TentativaDesempenho, "acertou" | "chutou" | "criada_em">[],
  hoje: string,
  nSemanas: number = SEMANAS_EVOLUCAO,
): { semanas: SemanaEvolucao[]; tendencia: TendenciaSemanal | null } {
  const inicioAtual = inicioDaSemana(hoje);
  const semanas: SemanaEvolucao[] = [];
  const porInicio = new Map<string, { semana: SemanaEvolucao; dias: Set<string> }>();

  for (let i = nSemanas - 1; i >= 0; i--) {
    const inicio = somarDias(inicioAtual, -i * 7);
    const fim = somarDias(inicio, 6);
    const semana: SemanaEvolucao = {
      inicio,
      fim,
      rotulo: formatarDataCurta(inicio),
      periodo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`,
      atual: i === 0,
      tentativas: 0,
      acertos: 0,
      acertosSemChute: 0,
      chutes: 0,
      taxaAcerto: null,
      diasEstudados: 0,
    };
    semanas.push(semana);
    porInicio.set(inicio, { semana, dias: new Set() });
  }

  for (const t of tentativas) {
    const data = t.criada_em.slice(0, 10);
    const ini = inicioDaSemana(data);
    const bucket = porInicio.get(ini);
    if (!bucket) continue;
    bucket.semana.tentativas++;
    if (t.acertou) {
      bucket.semana.acertos++;
      if (!t.chutou) bucket.semana.acertosSemChute++;
    }
    if (t.chutou) bucket.semana.chutes++;
    bucket.dias.add(data);
  }

  for (const { semana, dias } of porInicio.values()) {
    semana.diasEstudados = dias.size;
    semana.taxaAcerto = semana.tentativas > 0 ? semana.acertos / semana.tentativas : null;
  }

  const elegiveis = semanas.filter((s) => s.tentativas >= MIN_QUESTOES_TENDENCIA && s.taxaAcerto != null);
  let tendencia: TendenciaSemanal | null = null;
  if (elegiveis.length >= 2) {
    const atual = elegiveis[elegiveis.length - 1];
    const anterior = elegiveis[elegiveis.length - 2];
    tendencia = {
      diferencaPp: Math.round(((atual.taxaAcerto ?? 0) - (anterior.taxaAcerto ?? 0)) * 100),
      semanaAnterior: anterior.periodo,
      semanaAtual: atual.periodo,
    };
  }

  return { semanas, tendencia };
}

/** Formata segundos de forma direta: "48s", "2m15s", "4m". */
export function formatarSegundos(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${min}m` : `${min}m${String(rest).padStart(2, "0")}s`;
}

/** Monta o painel completo de desempenho a partir dos dados já carregados do banco. */
export function calcularDesempenho(entrada: EntradaDesempenho): ResumoDesempenho {
  const {
    hoje,
    disciplinas,
    topicos,
    tentativas,
    notaAlvo,
    minutosConteudoTotal,
    diasEstudados7,
    datasEstudoConteudo = [],
    revisoesVencidasPorTopico = {},
    nSemanas = SEMANAS_EVOLUCAO,
  } = entrada;

  // Agregação por tópico e geral
  const aggTopico = new Map<
    number,
    { tentativas: number; acertos: number; acertosSemChute: number; chutes: number; ultima: string | null }
  >();
  const aggDisciplina = new Map<number, { tentativas: number; acertos: number; acertosSemChute: number }>();

  let totalAcertos = 0;
  let totalAcertosSemChute = 0;
  let totalChutes = 0;
  let acertosNoChute = 0;
  let somaTempoValidoMs = 0;
  let qtdTempoValido = 0;
  let somaTempoTotalMs = 0;
  const diasComEstudo = new Set<string>();

  for (const d of datasEstudoConteudo) {
    if (d) diasComEstudo.add(d.slice(0, 10));
  }

  for (const t of tentativas) {
    const data = t.criada_em.slice(0, 10);
    diasComEstudo.add(data);

    if (t.acertou) {
      totalAcertos++;
      if (t.chutou) acertosNoChute++;
      else totalAcertosSemChute++;
    }
    if (t.chutou) totalChutes++;

    if (t.tempo_ms != null && t.tempo_ms > 0) {
      const clamped = Math.min(t.tempo_ms, TEMPO_MAX_QUESTAO_MS);
      somaTempoTotalMs += clamped;
      if (t.tempo_ms <= TEMPO_MAX_QUESTAO_MS) {
        somaTempoValidoMs += t.tempo_ms;
        qtdTempoValido++;
      }
    }

    const at = aggTopico.get(t.topico_id) ?? {
      tentativas: 0,
      acertos: 0,
      acertosSemChute: 0,
      chutes: 0,
      ultima: null,
    };
    at.tentativas++;
    if (t.acertou) {
      at.acertos++;
      if (!t.chutou) at.acertosSemChute++;
    }
    if (t.chutou) at.chutes++;
    if (!at.ultima || t.criada_em > at.ultima) at.ultima = t.criada_em;
    aggTopico.set(t.topico_id, at);

    const ad = aggDisciplina.get(t.disciplina_id) ?? { tentativas: 0, acertos: 0, acertosSemChute: 0 };
    ad.tentativas++;
    if (t.acertou) {
      ad.acertos++;
      if (!t.chutou) ad.acertosSemChute++;
    }
    aggDisciplina.set(t.disciplina_id, ad);
  }

  // Projeção "se a prova fosse hoje": mesma regra da tela Hoje (tópico sem questão = chute 25%).
  const dominiosParaProjecao: Record<number, number[]> = {};
  const topicosPorEstado = { nao_visto: 0, fraco: 0, em_progresso: 0, dominado: 0, total: topicos.length };
  for (const t of topicos) {
    (dominiosParaProjecao[t.disciplina_id] ??= []).push(t.tentativas > 0 ? t.dominio : CHANCE_CHUTE);
    topicosPorEstado[t.estado]++;
  }
  const projecao = projetarNota(disciplinas, dominiosParaProjecao);
  const totalTentativas = tentativas.length;
  const temBaseProjecao = totalTentativas >= MIN_QUESTOES_PROJECAO;

  const pesoPorDisciplina = new Map<number, number>();
  const totalQuestoesProva = disciplinas.reduce((s, d) => s + d.questoes_prova, 0) || 50;
  for (const d of disciplinas) {
    pesoPorDisciplina.set(d.id, d.questoes_prova / totalQuestoesProva);
  }

  const disciplinasOut: DesempenhoDisciplina[] = projecao.porDisciplina.map((p) => {
    const d = disciplinas.find((x) => x.id === p.disciplina_id)!;
    const ad = aggDisciplina.get(d.id) ?? { tentativas: 0, acertos: 0, acertosSemChute: 0 };
    const listaTopicos = topicos.filter((t) => t.disciplina_id === d.id);
    return {
      ...p,
      questoes_prova: d.questoes_prova,
      pontosMaximos: d.questoes_prova * PONTOS_POR_QUESTAO,
      metaAcertos: (notaAlvo / 100) * d.questoes_prova,
      tentativas: ad.tentativas,
      acertos: ad.acertos,
      acertosSemChute: ad.acertosSemChute,
      taxaAcerto: ad.tentativas > 0 ? ad.acertos / ad.tentativas : null,
      comDados: temBaseProjecao && ad.tentativas >= MIN_QUESTOES_DISCIPLINA,
      topicosTotal: listaTopicos.length,
      topicosVistos: listaTopicos.filter((t) => t.estado !== "nao_visto").length,
      topicosDominados: listaTopicos.filter((t) => t.estado === "dominado").length,
      topicosFracos: listaTopicos.filter((t) => t.estado === "fraco").length,
    };
  });

  const topicosOut: DesempenhoTopico[] = topicos.map((t) => {
    const at = aggTopico.get(t.id);
    const n = at?.tentativas ?? t.tentativas;
    const acertos = at?.acertos ?? 0;
    return {
      id: t.id,
      disciplina_id: t.disciplina_id,
      disciplina_nome: t.disciplina_nome,
      ordem: t.ordem,
      titulo_curto: t.titulo_curto,
      n_questoes: t.n_questoes,
      dominio: t.dominio,
      estado: t.estado,
      tentativas: n,
      acertos,
      acertosSemChute: at?.acertosSemChute ?? 0,
      chutes: at?.chutes ?? 0,
      taxaAcerto: n > 0 ? acertos / n : null,
      ultimaTentativa: at?.ultima ? at.ultima.slice(0, 10) : null,
      revisoesVencidas: revisoesVencidasPorTopico[t.id] ?? 0,
    };
  });

  // Prioridades para reforçar agora: tópicos já praticados em estado "fraco" (primeiro) ou "em_progresso",
  // ordenados por impacto na prova (peso da disciplina × quanto falta dominar).
  const focoAgora = topicosOut
    .filter((t) => t.tentativas > 0 && (t.estado === "fraco" || t.estado === "em_progresso"))
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "fraco" ? -1 : 1;
      const impA = (pesoPorDisciplina.get(a.disciplina_id) ?? 0.2) * (1 - a.dominio);
      const impB = (pesoPorDisciplina.get(b.disciplina_id) ?? 0.2) * (1 - b.dominio);
      return impB - impA || a.dominio - b.dominio;
    })
    .slice(0, 5);

  const { semanas, tendencia } = calcularEvolucaoSemanal(tentativas, hoje, nSemanas);

  return {
    resumo: {
      totalTentativas,
      totalAcertos,
      totalAcertosSemChute,
      totalChutes,
      acertosNoChute,
      taxaAcerto: totalTentativas > 0 ? totalAcertos / totalTentativas : null,
      taxaAcertoFirme: totalTentativas > 0 ? totalAcertosSemChute / totalTentativas : null,
      tempoMedioSegundos: qtdTempoValido > 0 ? Math.round(somaTempoValidoMs / qtdTempoValido / 1000) : null,
      minutosEstudadosTotal: Math.round(somaTempoTotalMs / 60000) + Math.max(0, Math.round(minutosConteudoTotal)),
      diasEstudados7,
      diasEstudadosTotal: diasComEstudo.size,
      topicosPorEstado,
    },
    projecao,
    temBaseProjecao,
    faltamParaProjecao: Math.max(0, MIN_QUESTOES_PROJECAO - totalTentativas),
    atingeMinimoGeral: projecao.nota >= NOTA_MINIMA_GERAL,
    atingeMeta: projecao.nota >= notaAlvo,
    disciplinas: disciplinasOut,
    semanas,
    tendenciaSemanal: tendencia,
    topicos: topicosOut,
    focoAgora,
  };
}
