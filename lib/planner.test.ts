import { describe, expect, it } from "vitest";
import { calcularDominio, projetarNota } from "./dominio";
import { proximaRevisao } from "./revisao";
import {
  faseDaProva,
  montarPlano,
  type PlannerInput,
  type TopicoPlanner,
} from "./planner";

const disciplinas = [
  { id: 1, nome: "Língua Portuguesa", questoes_prova: 10 },
  { id: 2, nome: "Legislação", questoes_prova: 15 },
  { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25 },
];

function topico(p: Partial<TopicoPlanner> & { id: number; disciplina_id: number }): TopicoPlanner {
  return {
    titulo_curto: `Tópico ${p.id}`,
    dominio: 0.5,
    estado: "em_progresso",
    n_questoes: 10,
    conteudos: [],
    ...p,
  };
}

function entrada(p: Partial<PlannerInput> = {}): PlannerInput {
  return {
    hoje: "2027-01-06", // quarta
    perfil: {
      data_prova: "2027-01-31",
      minutos_por_dia: { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 180, dom: 240 },
    },
    checkin: null,
    disciplinas,
    topicos: [
      topico({ id: 1, disciplina_id: 1 }),
      topico({ id: 2, disciplina_id: 2 }),
      topico({ id: 3, disciplina_id: 3 }),
      topico({ id: 4, disciplina_id: 3 }),
      topico({ id: 5, disciplina_id: 2 }),
      topico({ id: 6, disciplina_id: 1 }),
    ],
    revisoesVencidas: 0,
    ...p,
  };
}

describe("fases", () => {
  it("60 dias = cobertura, 30 = consolidação, 10 = reta final", () => {
    expect(faseDaProva(60)).toBe("cobertura");
    expect(faseDaProva(46)).toBe("cobertura");
    expect(faseDaProva(45)).toBe("consolidacao");
    expect(faseDaProva(30)).toBe("consolidacao");
    expect(faseDaProva(15)).toBe("consolidacao");
    expect(faseDaProva(14)).toBe("reta_final");
    expect(faseDaProva(10)).toBe("reta_final");
  });

  it("montarPlano calcula a fase pela data", () => {
    expect(montarPlano(entrada({ hoje: "2026-12-02" })).fase).toBe("cobertura");
    expect(montarPlano(entrada({ hoje: "2027-01-01" })).fase).toBe("consolidacao");
    expect(montarPlano(entrada({ hoje: "2027-01-21" })).fase).toBe("reta_final");
  });

  it("reta final só inclui tópico não visto como resumo expresso e inclui simulado", () => {
    const plano = montarPlano(
      entrada({
        hoje: "2027-01-21",
        topicos: [
          topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.3 }),
          topico({ id: 2, disciplina_id: 1, estado: "fraco", dominio: 0.3 }),
        ],
      }),
    );
    expect(plano.passos.some((b) => b.tipo === "simulado")).toBe(true);
    expect(plano.passos.filter((b) => b.topicoId === 1).every((b) => b.titulo.startsWith("Resumo expresso"))).toBe(true);
  });
});

describe("tempo e energia", () => {
  it("energia baixa reduz o número de passos (x0,6)", () => {
    const normal = montarPlano(entrada({ checkin: { energia: "media", minutos_hoje: null } }));
    const baixa = montarPlano(entrada({ checkin: { energia: "baixa", minutos_hoje: null } }));
    expect(normal.minutosEfetivos).toBe(120);
    expect(baixa.minutosEfetivos).toBe(72);
    expect(normal.passos.length).toBe(4);
    expect(baixa.passos.length).toBe(2);
  });

  it("minutos do check-in substituem o perfil", () => {
    const plano = montarPlano(entrada({ checkin: { energia: "alta", minutos_hoje: 50 } }));
    expect(plano.minutosEfetivos).toBe(50);
    expect(plano.passos.length).toBe(2);
  });

  it("garante no mínimo 1 passo de 15 min (meta mínima de 5 questões)", () => {
    const plano = montarPlano(entrada({ checkin: { energia: "baixa", minutos_hoje: 10 } }));
    expect(plano.passos.length).toBe(1);
    expect(plano.passos[0].minutos).toBe(15);
    expect(plano.passos[0].questoes).toBe(5);
    const zero = montarPlano(entrada({ checkin: { energia: "media", minutos_hoje: 0 } }));
    expect(zero.passos.length).toBe(1);
    expect(zero.passos[0].minutos).toBe(15);
  });

  it("a soma das questões do roteiro acompanha a meta do dia", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 8 })); // 120 min → meta 26
    expect(plano.metaQuestoes).toBe(26);
    const soma = plano.passos.reduce((s, p) => s + p.questoes, 0);
    expect(Math.abs(soma - 26)).toBeLessThanOrEqual(2);
  });

  it("a meta recalculada (déficit da semana) aumenta as questões do roteiro", () => {
    const base = montarPlano(entrada());
    const mais = montarPlano(entrada({ metaQuestoes: base.metaQuestoes + 6 }));
    const soma = (p: typeof base) => p.passos.reduce((s, x) => s + x.questoes, 0);
    expect(soma(mais)).toBeGreaterThan(soma(base));
  });
});

describe("conteúdo dos passos", () => {
  it("revisão vencida (>= 3) vira o aquecimento, passo 1", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 5 }));
    expect(plano.passos[0].tipo).toBe("aquecimento");
    expect(plano.passos[0].ordem).toBe(1);
    expect(plano.passos[0].titulo).toBe("Revisar 5 questões que você errou");
    expect(plano.passos[0].href).toContain("modo=revisao");
  });

  it("menos de 3 revisões não gera aquecimento", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 2 }));
    expect(plano.passos.some((b) => b.tipo === "aquecimento")).toBe(false);
  });

  it("o último passo (com 3+ passos) é o fechamento, que refaz as erradas", () => {
    const plano = montarPlano(entrada());
    const ultimo = plano.passos[plano.passos.length - 1];
    expect(ultimo.tipo).toBe("fechamento");
    expect(ultimo.minutos).toBe(5);
    expect(ultimo.href).toContain("modo=erradas");
  });

  it("na Cobertura, tópico não visto ganha prioridade", () => {
    const plano = montarPlano(
      entrada({
        hoje: "2026-12-02",
        checkin: { energia: "media", minutos_hoje: 25 },
        topicos: [
          topico({ id: 1, disciplina_id: 3, estado: "em_progresso", dominio: 0.5 }),
          topico({ id: 2, disciplina_id: 3, estado: "nao_visto", dominio: 0.5 }),
        ],
      }),
    );
    expect(plano.passos[0].topicoId).toBe(2);
  });

  it("Específicos é priorizado sobre Português com o mesmo domínio", () => {
    const plano = montarPlano(
      entrada({
        checkin: { energia: "media", minutos_hoje: 25 },
        topicos: [
          topico({ id: 1, disciplina_id: 1, dominio: 0.4, estado: "fraco" }),
          topico({ id: 2, disciplina_id: 3, dominio: 0.4, estado: "fraco" }),
        ],
      }),
    );
    expect(plano.passos[0].topicoId).toBe(2);
  });

  it("passo de estudo tem título, descrição com vídeo e questões, motivo e link", () => {
    const plano = montarPlano(
      entrada({
        hoje: "2026-12-02",
        checkin: { energia: "media", minutos_hoje: 25 },
        topicos: [
          topico({
            id: 1,
            disciplina_id: 3,
            titulo_curto: "Licitações (Lei 14.133/2021)",
            estado: "nao_visto",
            dominio: 0.3,
            conteudos: [{ tipo: "video", minutos: 8 }],
          }),
        ],
      }),
    );
    const p = plano.passos[0];
    expect(p.tipo).toBe("estudo");
    expect(p.titulo).toBe("Licitações (Lei 14.133/2021)");
    expect(p.descricao).toBe("Ver vídeo (8 min) → 5 questões");
    expect(p.motivo).toBe("Específicos vale 50% da prova e você ainda não viu este tópico");
    // Tópico com conteúdo: o botão leva à trilha (resumo → vídeo → questões), não direto às questões.
    expect(p.href).toBe("/edital/1?n=5");
    expect(p.minutos).toBe(23);
  });

  it("tópico não visto com resumo e vídeo: 'Ler resumo → vídeo opcional (X min) → N questões' e link para a trilha", () => {
    const plano = montarPlano(
      entrada({
        hoje: "2026-12-02",
        checkin: { energia: "media", minutos_hoje: 25 },
        topicos: [
          topico({
            id: 7,
            disciplina_id: 2,
            estado: "nao_visto",
            dominio: 0.3,
            conteudos: [{ tipo: "teoria" }, { tipo: "video", minutos: 12 }, { tipo: "fonte" }],
          }),
        ],
      }),
    );
    const p = plano.passos[0];
    expect(p.descricao).toBe("Ler resumo → vídeo opcional (12 min) → 5 questões");
    expect(p.href).toBe("/edital/7?n=5");
    expect(p.minutos).toBe(10 + 12 + 15);
  });

  it("vídeo sem duração usa 15 min; tópico em progresso não pede teoria e vai direto às questões", () => {
    const base = {
      hoje: "2026-12-02",
      checkin: { energia: "media" as const, minutos_hoje: 25 },
    };
    const novo = montarPlano(
      entrada({
        ...base,
        topicos: [topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.3, conteudos: [{ tipo: "video" }] })],
      }),
    ).passos[0];
    expect(novo.descricao).toBe("Ver vídeo (15 min) → 5 questões");
    const visto = montarPlano(
      entrada({
        ...base,
        topicos: [
          topico({
            id: 1,
            disciplina_id: 3,
            estado: "em_progresso",
            conteudos: [{ tipo: "teoria" }, { tipo: "video" }],
          }),
        ],
      }),
    ).passos[0];
    expect(visto.descricao).toBe("5 questões");
    expect(visto.href).toBe("/praticar?topico=1&n=5");
  });

  it("estado do passo com trilha aceita resumo OU vídeo como teoria e explica quando só falta a teoria", () => {
    const base = {
      hoje: "2026-12-02",
      checkin: { energia: "media" as const, minutos_hoje: 25 },
      topicos: [
        topico({
          id: 1,
          disciplina_id: 3,
          estado: "nao_visto",
          dominio: 0.3,
          conteudos: [{ tipo: "teoria" as const }, { tipo: "video" as const, minutos: 8 }],
        }),
      ],
    };
    const ativ = (feitas: number, resumo: boolean, video: boolean) => ({
      total: feitas,
      revisao: 0,
      simulado: 0,
      porTopico: feitas ? [{ topicoId: 1, feitas }] : [],
      erradasHoje: 0,
      refeitasHoje: 0,
      conteudoHoje: resumo || video ? [{ topicoId: 1, resumo, video }] : [],
    });
    const passo = (a: ReturnType<typeof ativ>) => montarPlano(entrada({ ...base, atividadeHoje: a })).passos[0];
    expect(passo(ativ(0, false, false)).estado).toBe("a_fazer");
    const soResumo = passo(ativ(0, true, false));
    expect(soResumo.estado).toBe("em_andamento");
    expect(soResumo.href).toBe("/praticar?topico=1&n=5"); // teoria feita: vai direto às questões
    const soQuestoes = passo(ativ(5, false, false));
    expect(soQuestoes.estado).toBe("em_andamento"); // só questões: falta resumo ou vídeo
    expect(soQuestoes.detalheEstado).toBe("falta resumo ou vídeo");
    expect(passo(ativ(0, true, true)).estado).toBe("em_andamento"); // só conteúdo: faltam as questões
    // Ler resumo + fazer as questões conclui o passo sem exigir assistir ao vídeo.
    expect(passo(ativ(5, true, false)).estado).toBe("feito");
    // Assistir ao vídeo + fazer as questões também conclui sem exigir marcar o resumo.
    expect(passo(ativ(5, false, true)).estado).toBe("feito");
    expect(passo(ativ(5, true, true)).estado).toBe("feito");
    // Conteúdo estudado hoje mantém o passo no roteiro mesmo depois de o tópico deixar de ser "não visto".
    const depois = montarPlano(
      entrada({
        ...base,
        topicos: [{ ...base.topicos[0], estado: "fraco" as const }],
        atividadeHoje: ativ(5, true, false),
      }),
    ).passos[0];
    expect(depois.topicoId).toBe(1);
    expect(depois.estado).toBe("feito");
  });

  it("fechamento alinha contador, link e conclusão ao total real de erros de hoje sem encolher os passos de estudo", () => {
    const base = entrada({
      hoje: "2026-11-24",
      checkin: { energia: "media", minutos_hoje: 90 }, // meta 20; 3 passos (2 estudo + fechamento)
    });
    const semErros = montarPlano(base);
    const estudoAntes = semErros.passos.filter((p) => p.tipo === "estudo").map((p) => p.questoes);
    expect(estudoAntes).toEqual([9, 8]);

    const comErros = montarPlano({
      ...base,
      atividadeHoje: {
        total: 21,
        revisao: 0,
        simulado: 0,
        porTopico: [
          { topicoId: 3, feitas: 13 },
          { topicoId: 4, feitas: 8 },
        ],
        erradasHoje: 6,
        refeitasHoje: 4,
      },
    });
    // Os passos de estudo mantêm a mesma cota (9 e 8), não encolhem para 8 e 7.
    expect(comErros.passos.filter((p) => p.tipo === "estudo").map((p) => p.questoes)).toEqual([9, 8]);
    const fech = comErros.passos[comErros.passos.length - 1];
    expect(fech.tipo).toBe("fechamento");
    expect(fech.questoes).toBe(6);
    expect(fech.feitas).toBe(4);
    expect(fech.estado).toBe("em_andamento");
    expect(fech.href).toBe("/praticar?modo=erradas&n=6");
    expect(fech.descricao).toContain("Faltam 2 questões para refazer (6 no total)");

    const concluido = montarPlano({
      ...base,
      atividadeHoje: {
        total: 23,
        revisao: 0,
        simulado: 0,
        porTopico: [
          { topicoId: 3, feitas: 13 },
          { topicoId: 4, feitas: 10 },
        ],
        erradasHoje: 6,
        refeitasHoje: 6,
      },
    });
    const fechFim = concluido.passos[concluido.passos.length - 1];
    expect(fechFim.estado).toBe("feito");
    expect(fechFim.questoes).toBe(6);
    expect(fechFim.feitas).toBe(6);
  });

  it("banco pequeno por tópico: o que falta da meta vira o passo 'Questões mistas'", () => {
    const plano = montarPlano(
      entrada({
        topicos: [
          topico({ id: 1, disciplina_id: 3, n_questoes: 3 }),
          topico({ id: 2, disciplina_id: 2, n_questoes: 3 }),
          topico({ id: 3, disciplina_id: 1, n_questoes: 3 }),
        ],
      }),
    ); // 120 min → meta 26
    const misto = plano.passos.find((p) => p.tipo === "misto");
    expect(misto).toBeDefined();
    expect(misto!.titulo).toBe("Questões mistas");
    expect(misto!.href).toBe(`/praticar?modo=misto&n=${misto!.questoes}`);
    const soma = plano.passos.reduce((s, p) => s + p.questoes, 0);
    expect(soma).toBeGreaterThanOrEqual(plano.metaQuestoes);
    // O fechamento continua sendo o último passo.
    expect(plano.passos[plano.passos.length - 1].tipo).toBe("fechamento");
  });

  it("sem falta de questões não há passo misto; o estado do misto vem das questões fora dos outros passos", () => {
    expect(montarPlano(entrada()).passos.some((p) => p.tipo === "misto")).toBe(false);
    const topicos = [topico({ id: 1, disciplina_id: 3, n_questoes: 3 })];
    const sem = montarPlano(entrada({ topicos, checkin: { energia: "media", minutos_hoje: 50 } }));
    const q = sem.passos.find((p) => p.tipo === "misto")!.questoes;
    const com = montarPlano(
      entrada({
        topicos,
        checkin: { energia: "media", minutos_hoje: 50 },
        atividadeHoje: { total: 3 + q, revisao: 0, simulado: 0, porTopico: [{ topicoId: 1, feitas: 3 }], erradasHoje: 0, refeitasHoje: 0 },
      }),
    ).passos.find((p) => p.tipo === "misto")!;
    expect(com.feitas).toBe(q);
    expect(com.estado).toBe("feito");
  });

  it("estado do passo vem das tentativas de hoje: a fazer, em andamento, feito", () => {
    const base = {
      hoje: "2026-12-02",
      checkin: { energia: "media" as const, minutos_hoje: 25 },
      topicos: [topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.3 })],
    };
    const ativ = (feitas: number) => ({
      total: feitas,
      revisao: 0,
      simulado: 0,
      porTopico: feitas ? [{ topicoId: 1, feitas }] : [],
      erradasHoje: 0,
      refeitasHoje: 0,
    });
    expect(montarPlano(entrada({ ...base, atividadeHoje: ativ(0) })).passos[0].estado).toBe("a_fazer");
    const meio = montarPlano(entrada({ ...base, atividadeHoje: ativ(2) })).passos[0];
    expect(meio.estado).toBe("em_andamento");
    expect(meio.href).toBe("/praticar?topico=1&n=3");
    expect(montarPlano(entrada({ ...base, atividadeHoje: ativ(5) })).passos[0].estado).toBe("feito");
  });

  it("aquecimento não some depois de revisar (conta as já feitas hoje)", () => {
    const plano = montarPlano(
      entrada({
        revisoesVencidas: 0,
        atividadeHoje: { total: 8, revisao: 8, simulado: 0, porTopico: [], erradasHoje: 0, refeitasHoje: 0 },
      }),
    );
    expect(plano.passos[0].tipo).toBe("aquecimento");
    expect(plano.passos[0].estado).toBe("feito");
  });

  it("energia baixa evita tópico não visto quando há alternativa", () => {
    const plano = montarPlano(
      entrada({
        hoje: "2026-12-02",
        checkin: { energia: "baixa", minutos_hoje: 50 },
        topicos: [
          topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.3 }),
          topico({ id: 2, disciplina_id: 3, estado: "fraco", dominio: 0.3 }),
        ],
      }),
    );
    expect(plano.passos[0].topicoId).toBe(2);
  });
});

describe("simulado no domingo", () => {
  it("sugere simulado completo no domingo com >= 210 min", () => {
    const plano = montarPlano(entrada({ hoje: "2027-01-03" })); // domingo, 240 min
    expect(plano.sugestaoSimulado).not.toBeNull();
  });
  it("não sugere em dia de semana nem com energia baixa", () => {
    expect(montarPlano(entrada()).sugestaoSimulado).toBeNull();
    const baixa = montarPlano(
      entrada({ hoje: "2027-01-03", checkin: { energia: "baixa", minutos_hoje: null } }),
    );
    expect(baixa.sugestaoSimulado).toBeNull();
  });
});

describe("domínio", () => {
  const hoje = "2026-12-10";
  it("sem tentativas: não visto, usa prior", () => {
    const r = calcularDominio([], hoje, 0.3);
    expect(r.estado).toBe("nao_visto");
    expect(r.dominio).toBe(0.3);
  });
  it("tentativas recentes pesam 2x e chutei vale meio acerto", () => {
    const rec = { acertou: true, chutou: false, criada_em: "2026-12-09T10:00:00" };
    const antiga = { acertou: false, chutou: false, criada_em: "2026-11-01T10:00:00" };
    // acertos = 2, total = 3 -> (2+1)/(3+2)
    expect(calcularDominio([rec, antiga], hoje).dominio).toBeCloseTo(0.6);
    const chute = { acertou: true, chutou: true, criada_em: "2026-12-09T10:00:00" };
    // acertos = 1, total = 2 -> 2/4
    expect(calcularDominio([chute], hoje).dominio).toBeCloseTo(0.5);
  });
  it("estados: fraco, em progresso, dominado (>=0,8 com >=8 tentativas)", () => {
    const erro = { acertou: false, chutou: false, criada_em: "2026-12-09" };
    const ok = { acertou: true, chutou: false, criada_em: "2026-12-09" };
    expect(calcularDominio([erro, erro], hoje).estado).toBe("fraco");
    expect(calcularDominio([ok, erro], hoje).estado).toBe("em_progresso");
    expect(calcularDominio(Array(5).fill(ok), hoje).estado).toBe("em_progresso");
    expect(calcularDominio(Array(8).fill(ok), hoje).estado).toBe("dominado");
  });
  it("projeção de nota = domínio médio x questões x 2", () => {
    const p = projetarNota(
      disciplinas.map((d) => ({ ...d, minimo_acertos: 2 })),
      { 1: [0.5], 2: [0.5], 3: [0.5] },
    );
    expect(p.nota).toBeCloseTo(50);
    expect(p.atingeMinimos).toBe(true);
  });
});

describe("revisão SM-2 simplificada", () => {
  it("erro ou chutei volta em 1 dia", () => {
    expect(proximaRevisao(null, false, false, "2026-12-10").proxima_em).toBe("2026-12-11");
    expect(proximaRevisao(null, true, true, "2026-12-10").proxima_em).toBe("2026-12-11");
  });
  it("acertos sucessivos aumentam o intervalo", () => {
    const a = proximaRevisao(null, true, false, "2026-12-10");
    expect(a.intervalo_dias).toBe(3);
    const b = proximaRevisao(a, true, false, "2026-12-13");
    expect(b.intervalo_dias).toBeGreaterThan(a.intervalo_dias);
  });
});
