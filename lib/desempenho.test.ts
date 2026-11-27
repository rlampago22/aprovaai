import { describe, expect, it } from "vitest";
import {
  calcularDesempenho,
  calcularEvolucaoSemanal,
  CHANCE_CHUTE,
  formatarSegundos,
  MIN_QUESTOES_PROJECAO,
  type TentativaDesempenho,
  type TopicoBaseDesempenho,
} from "./desempenho";
import type { DisciplinaNota } from "./dominio";

const DISCIPLINAS: DisciplinaNota[] = [
  { id: 1, nome: "Língua Portuguesa", questoes_prova: 10, minimo_acertos: 2 },
  { id: 2, nome: "Legislação", questoes_prova: 15, minimo_acertos: 2 },
  { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25, minimo_acertos: 5 },
];

const TOPICOS_BASE: TopicoBaseDesempenho[] = [
  {
    id: 1,
    disciplina_id: 1,
    disciplina_nome: "Língua Portuguesa",
    ordem: 1,
    titulo_curto: "Interpretação de texto",
    n_questoes: 15,
    dominio: 0.3,
    estado: "nao_visto",
    tentativas: 0,
  },
  {
    id: 2,
    disciplina_id: 2,
    disciplina_nome: "Legislação",
    ordem: 1,
    titulo_curto: "Lei 8.112/90",
    n_questoes: 20,
    dominio: 0.1,
    estado: "nao_visto",
    tentativas: 0,
  },
  {
    id: 3,
    disciplina_id: 3,
    disciplina_nome: "Conhecimentos Específicos",
    ordem: 1,
    titulo_curto: "Licitações (Lei 14.133/2021)",
    n_questoes: 25,
    dominio: 0.2,
    estado: "nao_visto",
    tentativas: 0,
  },
];

describe("calcularDesempenho — estado vazio", () => {
  it("não inventa projeção nem taxa de acerto quando ainda não há tentativas", () => {
    const r = calcularDesempenho({
      hoje: "2026-11-23",
      disciplinas: DISCIPLINAS,
      topicos: TOPICOS_BASE,
      tentativas: [],
      notaAlvo: 80,
      minutosConteudoTotal: 0,
      diasEstudados7: 0,
    });

    expect(r.temBaseProjecao).toBe(false);
    expect(r.faltamParaProjecao).toBe(MIN_QUESTOES_PROJECAO);
    expect(r.resumo.totalTentativas).toBe(0);
    expect(r.resumo.taxaAcerto).toBeNull();
    expect(r.resumo.taxaAcertoFirme).toBeNull();
    expect(r.resumo.tempoMedioSegundos).toBeNull();
    expect(r.resumo.topicosPorEstado).toEqual({
      nao_visto: 3,
      fraco: 0,
      em_progresso: 0,
      dominado: 0,
      total: 3,
    });
    expect(r.disciplinas.every((d) => !d.comDados && d.taxaAcerto === null)).toBe(true);
    expect(r.focoAgora).toEqual([]);
    expect(r.semanas).toHaveLength(8);
    expect(r.semanas.every((s) => s.taxaAcerto === null && s.tentativas === 0)).toBe(true);
    expect(r.semanas[7].atual).toBe(true);
    expect(r.tendenciaSemanal).toBeNull();
    // Projeção interna usa chute (25%) para não vistos: 0.25 * 50 * 2 = 25
    expect(r.projecao.nota).toBeCloseTo(CHANCE_CHUTE * 100, 5);
  });
});

describe("calcularDesempenho — projeção, mínimos e foco", () => {
  it("libera projeção a partir de 20 tentativas e marca comDados por disciplina (>= 5)", () => {
    const topicos: TopicoBaseDesempenho[] = [
      { ...TOPICOS_BASE[0], dominio: 0.85, estado: "dominado", tentativas: 10 },
      { ...TOPICOS_BASE[1], dominio: 0.35, estado: "fraco", tentativas: 8 },
      { ...TOPICOS_BASE[2], dominio: 0.65, estado: "em_progresso", tentativas: 4 },
    ];
    const tentativas: TentativaDesempenho[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        topico_id: 1,
        disciplina_id: 1,
        acertou: i < 9,
        chutou: i === 8,
        tempo_ms: 90_000,
        criada_em: "2026-11-23 10:00:00",
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        topico_id: 2,
        disciplina_id: 2,
        acertou: i < 2,
        chutou: false,
        tempo_ms: 120_000,
        criada_em: "2026-11-22 10:00:00",
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        topico_id: 3,
        disciplina_id: 3,
        acertou: i < 3,
        chutou: false,
        // Outlier de 2h em uma questão não deve estragar o tempo médio
        tempo_ms: i === 0 ? 7_200_000 : 150_000,
        criada_em: "2026-11-21 10:00:00",
      })),
    ];

    const r = calcularDesempenho({
      hoje: "2026-11-23",
      disciplinas: DISCIPLINAS,
      topicos,
      tentativas,
      notaAlvo: 80,
      minutosConteudoTotal: 25,
      diasEstudados7: 3,
      datasEstudoConteudo: ["2026-11-20 09:00:00"],
    });

    expect(r.temBaseProjecao).toBe(true);
    expect(r.faltamParaProjecao).toBe(0);
    expect(r.resumo.totalTentativas).toBe(22);
    expect(r.resumo.totalAcertos).toBe(14);
    expect(r.resumo.totalChutes).toBe(1);
    expect(r.resumo.acertosNoChute).toBe(1);
    expect(r.resumo.totalAcertosSemChute).toBe(13);
    expect(r.resumo.diasEstudadosTotal).toBe(4);
    // Tempo médio: (10*90 + 8*120 + 3*150) / 21 = 2310 / 21 = 110s
    expect(r.resumo.tempoMedioSegundos).toBe(110);

    const pt = r.disciplinas.find((d) => d.disciplina_id === 1)!;
    const leg = r.disciplinas.find((d) => d.disciplina_id === 2)!;
    const esp = r.disciplinas.find((d) => d.disciplina_id === 3)!;
    expect(pt.comDados).toBe(true);
    expect(leg.comDados).toBe(true);
    expect(esp.comDados).toBe(false); // só 4 questões em Específicos

    // Projeção: 0.85*10*2 + 0.35*15*2 + 0.65*25*2 = 17 + 10.5 + 32.5 = 60
    expect(r.projecao.nota).toBeCloseTo(60, 4);
    expect(r.atingeMinimoGeral).toBe(true);
    expect(r.atingeMeta).toBe(false);

    // Foco agora: tópico 2 (fraco) vem antes do tópico 3 (em_progresso); dominado não entra
    expect(r.focoAgora.map((t) => t.id)).toEqual([2, 3]);
  });

  it("ordena tópicos fracos pelo impacto da disciplina na prova", () => {
    const topicos: TopicoBaseDesempenho[] = [
      { ...TOPICOS_BASE[0], dominio: 0.4, estado: "fraco", tentativas: 5 },
      { ...TOPICOS_BASE[1], dominio: 0.4, estado: "fraco", tentativas: 5 },
      { ...TOPICOS_BASE[2], dominio: 0.4, estado: "fraco", tentativas: 5 },
    ];
    const r = calcularDesempenho({
      hoje: "2026-11-23",
      disciplinas: DISCIPLINAS,
      topicos,
      tentativas: [],
      notaAlvo: 80,
      minutosConteudoTotal: 0,
      diasEstudados7: 0,
    });
    // Mesmo domínio (0.4), Específicos (50%) > Legislação (30%) > Português (20%)
    expect(r.focoAgora.map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it("repetições no mesmo dia não inflam acertos nem contagem, mas preservam o tempo estudado", () => {
    const tentativas: TentativaDesempenho[] = [
      // Dia 24: errou Q101, depois refez 2x acertando
      { questao_id: 101, topico_id: 3, disciplina_id: 3, acertou: false, chutou: false, tempo_ms: 60_000, criada_em: "2026-11-24 18:00:00" },
      { questao_id: 101, topico_id: 3, disciplina_id: 3, acertou: true, chutou: false, tempo_ms: 60_000, criada_em: "2026-11-24 18:10:00" },
      { questao_id: 101, topico_id: 3, disciplina_id: 3, acertou: true, chutou: false, tempo_ms: 60_000, criada_em: "2026-11-24 18:15:00" },
      // Dia 25: acertou Q101 na revisão do dia seguinte -> conta como nova questão do dia 25
      { questao_id: 101, topico_id: 3, disciplina_id: 3, acertou: true, chutou: false, tempo_ms: 60_000, criada_em: "2026-11-25 18:00:00" },
    ];
    const r = calcularDesempenho({
      hoje: "2026-11-25",
      disciplinas: DISCIPLINAS,
      topicos: TOPICOS_BASE,
      tentativas,
      notaAlvo: 80,
      minutosConteudoTotal: 0,
      diasEstudados7: 2,
    });
    expect(r.resumo.totalTentativas).toBe(2);
    expect(r.resumo.totalRespostasBrutas).toBe(4);
    expect(r.resumo.totalAcertos).toBe(1);
    expect(r.resumo.taxaAcerto).toBeCloseTo(0.5, 5);
    // Tempo total soma todas as 4 respostas (4 min)
    expect(r.resumo.minutosEstudadosTotal).toBe(4);
  });
});

describe("calcularEvolucaoSemanal", () => {
  it("agrupa por semana (seg a dom) e calcula tendência quando há 2 semanas com >= 5 questões", () => {
    // 2026-11-23 é segunda-feira.
    const tentativas = [
      // Semana anterior (16/11 a 22/11): 6 questões, 3 acertos = 50%
      ...Array.from({ length: 6 }, (_, i) => ({
        acertou: i < 3,
        chutou: false,
        criada_em: i < 3 ? "2026-11-17 10:00:00" : "2026-11-20 10:00:00",
      })),
      // Semana atual (23/11 a 29/11): 5 questões, 4 acertos = 80%
      ...Array.from({ length: 5 }, (_, i) => ({
        acertou: i < 4,
        chutou: false,
        criada_em: "2026-11-23 14:00:00",
      })),
      // Muito antiga (fora da janela de 4 semanas): deve ser ignorada
      { acertou: true, chutou: false, criada_em: "2026-09-01 10:00:00" },
    ];

    const { semanas, tendencia } = calcularEvolucaoSemanal(tentativas, "2026-11-23", 4);
    expect(semanas).toHaveLength(4);
    expect(semanas[2].inicio).toBe("2026-11-16");
    expect(semanas[2].tentativas).toBe(6);
    expect(semanas[2].diasEstudados).toBe(2);
    expect(semanas[2].taxaAcerto).toBeCloseTo(0.5, 5);

    expect(semanas[3].inicio).toBe("2026-11-23");
    expect(semanas[3].atual).toBe(true);
    expect(semanas[3].tentativas).toBe(5);
    expect(semanas[3].taxaAcerto).toBeCloseTo(0.8, 5);

    expect(tendencia).toEqual({
      diferencaPp: 30,
      semanaAnterior: "16/11 a 22/11",
      semanaAtual: "23/11 a 29/11",
    });
  });
});

describe("formatarSegundos", () => {
  it("formata segundos e minutos de forma curta", () => {
    expect(formatarSegundos(45)).toBe("45s");
    expect(formatarSegundos(60)).toBe("1m");
    expect(formatarSegundos(125)).toBe("2m05s");
    expect(formatarSegundos(252)).toBe("4m12s");
  });
});
