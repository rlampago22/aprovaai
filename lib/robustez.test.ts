import { describe, expect, it } from "vitest";
import { faseAlvoDaCobertura, ritmoDeCobertura } from "./cobertura";
import { fatorFase, montarPlano, prioridadeTopico, type PlannerInput, type TopicoPlanner } from "./planner";

const disciplinas = [
  { id: 1, nome: "Língua Portuguesa", questoes_prova: 10 },
  { id: 2, nome: "Legislação", questoes_prova: 15 },
  { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25 },
];

function topico(p: Partial<TopicoPlanner> & { id: number; disciplina_id: number }): TopicoPlanner {
  return { titulo_curto: `Tópico ${p.id}`, dominio: 0.5, estado: "em_progresso", n_questoes: 10, conteudos: [], ...p };
}

const PERFIL = {
  data_prova: "2027-01-31",
  minutos_por_dia: { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 120, dom: 120 },
};

function entrada(p: Partial<PlannerInput> = {}): PlannerInput {
  return {
    hoje: "2027-01-06",
    perfil: PERFIL,
    checkin: null,
    disciplinas,
    topicos: [topico({ id: 1, disciplina_id: 1 }), topico({ id: 2, disciplina_id: 2 }), topico({ id: 3, disciplina_id: 3 })],
    revisoesVencidas: 0,
    ...p,
  };
}

describe("ritmo de cobertura", () => {
  // 120 min/dia → 4 blocos → 3 passos de estudo por dia.
  it("em dia: poucos tópicos para muitos dias", () => {
    const r = ritmoDeCobertura({ naoVistos: 20, dataProva: "2027-01-31", hoje: "2026-11-23", minutosPorDia: PERFIL.minutos_por_dia });
    expect(r.faseAlvo).toBe("cobertura");
    expect(r.diasRestantesNaFase).toBe(24); // prova − 45 = 17/12/2026
    expect(r.ritmoNecessario).toBeCloseTo(20 / 24);
    expect(r.ritmoPlanejado).toBe(3);
    expect(r.atrasado).toBe(false);
  });

  it("atrasado: ritmo necessário maior que o planejado", () => {
    const r = ritmoDeCobertura({ naoVistos: 55, dataProva: "2027-01-31", hoje: "2027-01-01", minutosPorDia: PERFIL.minutos_por_dia });
    expect(r.faseAlvo).toBe("consolidacao");
    expect(r.diasRestantesNaFase).toBe(15); // até prova − 15
    expect(r.ritmoNecessario).toBeCloseTo(55 / 15);
    expect(r.atrasado).toBe(true);
  });

  it("só conta dias com tempo no perfil", () => {
    const r = ritmoDeCobertura({
      naoVistos: 10,
      dataProva: "2027-01-31",
      hoje: "2027-01-01",
      minutosPorDia: { seg: 60, qua: 60 },
    });
    expect(r.diasRestantesNaFase).toBe(4); // segundas e quartas entre 01/01 e 15/01: 04, 06, 11, 13
  });

  it("a fase alvo troca conforme a data: cobertura → consolidação → reta final", () => {
    expect(faseAlvoDaCobertura(60)).toEqual({ faseAlvo: "cobertura", diasAteFim: 15 });
    expect(faseAlvoDaCobertura(45)).toEqual({ faseAlvo: "consolidacao", diasAteFim: 30 });
    expect(faseAlvoDaCobertura(14)).toEqual({ faseAlvo: "reta_final", diasAteFim: 14 });
  });

  it("sem tópicos não vistos nunca está atrasado", () => {
    const r = ritmoDeCobertura({ naoVistos: 0, dataProva: "2027-01-31", hoje: "2027-01-20", minutosPorDia: PERFIL.minutos_por_dia });
    expect(r.atrasado).toBe(false);
    expect(r.ritmoNecessario).toBe(0);
  });

  it("o plano expõe o ritmo", () => {
    const plano = montarPlano(entrada({ topicos: [topico({ id: 1, disciplina_id: 1, estado: "nao_visto" })] }));
    expect(plano.cobertura.naoVistos).toBe(1);
  });
});

describe("fatores de fase", () => {
  it("consolidação: não visto 1,4 (1,8 se atrasado)", () => {
    expect(fatorFase("consolidacao", "nao_visto", "media")).toBe(1.4);
    expect(fatorFase("consolidacao", "nao_visto", "media", true)).toBe(1.8);
  });

  it("energia baixa: não visto ×0,5, ou ×0,8 se atrasado", () => {
    expect(fatorFase("cobertura", "nao_visto", "baixa")).toBeCloseTo(1.5 * 0.5);
    expect(fatorFase("cobertura", "nao_visto", "baixa", true)).toBeCloseTo(1.5 * 0.8);
    expect(fatorFase("consolidacao", "nao_visto", "baixa", true)).toBeCloseTo(1.8 * 0.8);
  });

  it("consolidação prioriza o tópico não visto (com atraso) sobre um em progresso", () => {
    const novo = topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.5 });
    const prog = topico({ id: 2, disciplina_id: 3, estado: "em_progresso", dominio: 0.5 });
    expect(prioridadeTopico(novo, disciplinas, "consolidacao", "media")).toBeLessThan(
      prioridadeTopico(prog, disciplinas, "consolidacao", "media"),
    ); // 1,4 < 1,5 sem atraso
    expect(prioridadeTopico(novo, disciplinas, "consolidacao", "media", true)).toBeGreaterThan(
      prioridadeTopico(prog, disciplinas, "consolidacao", "media", true),
    ); // 1,8 > 1,5 com atraso
    const plano = montarPlano(
      entrada({
        hoje: "2027-01-01",
        topicos: [
          topico({ id: 2, disciplina_id: 3, estado: "em_progresso", dominio: 0.4 }),
          topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.4 }),
          ...Array.from({ length: 50 }, (_, i) => topico({ id: 10 + i, disciplina_id: 1, estado: "nao_visto", dominio: 0.4 })),
        ],
      }),
    );
    expect(plano.cobertura.atrasado).toBe(true);
    const estudo = plano.passos.filter((p) => p.tipo === "estudo");
    expect(estudo[0].topicoId).toBe(1);
  });

  it("energia baixa + atrasado: o não visto perde menos prioridade (×0,8 em vez de ×0,5)", () => {
    const topicos = [
      topico({ id: 2, disciplina_id: 3, estado: "em_progresso", dominio: 0.4 }),
      topico({ id: 1, disciplina_id: 3, estado: "nao_visto", dominio: 0.4 }),
      ...Array.from({ length: 50 }, (_, i) => topico({ id: 10 + i, disciplina_id: 1, estado: "nao_visto", dominio: 0.4 })),
    ];
    const plano = montarPlano(entrada({ hoje: "2027-01-01", topicos, checkin: { energia: "baixa", minutos_hoje: 100 } }));
    expect(plano.cobertura.atrasado).toBe(true);
    expect(fatorFase("consolidacao", "nao_visto", "baixa", true)).toBeCloseTo(1.44);
    expect(fatorFase("consolidacao", "nao_visto", "baixa", false)).toBeCloseTo(0.7);
    // Com atraso, o não visto de Específicos (1,44) quase empata com o em progresso (1,5) e ainda entra no roteiro.
    expect(plano.passos.some((p) => p.topicoId === 1)).toBe(true);
  });
});

describe("reta final: resumo expresso", () => {
  const retaFinal = (topicos: TopicoPlanner[], extra: Partial<PlannerInput> = {}) =>
    montarPlano(entrada({ hoje: "2027-01-21", topicos, ...extra }));

  it("inclui no máximo 1 resumo expresso, do não visto da disciplina de maior peso", () => {
    const plano = retaFinal([
      topico({ id: 1, disciplina_id: 1, estado: "nao_visto", dominio: 0.2 }),
      topico({ id: 2, disciplina_id: 2, estado: "nao_visto", dominio: 0.2 }),
      topico({ id: 3, disciplina_id: 3, estado: "nao_visto", dominio: 0.2 }),
      topico({ id: 4, disciplina_id: 3, estado: "nao_visto", dominio: 0.2 }),
      topico({ id: 5, disciplina_id: 1, estado: "fraco", dominio: 0.3 }),
      topico({ id: 6, disciplina_id: 2, estado: "fraco", dominio: 0.3 }),
    ]);
    const expressos = plano.passos.filter((p) => p.titulo.startsWith("Resumo expresso"));
    expect(expressos).toHaveLength(1);
    expect(expressos[0].disciplinaId).toBe(3);
    expect(expressos[0].topicoId).toBe(3);
    expect(expressos[0].questoes).toBe(5);
    expect(expressos[0].href).toContain("/edital/3?expresso=1");
    expect(expressos[0].motivo).toContain("vale 50% da prova");
    expect(expressos[0].descricao).toContain("Revisão em 30 segundos");
    const ids = plano.passos.map((p) => p.topicoId);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(4);
  });

  it("sem tópico não visto, não há resumo expresso", () => {
    const plano = retaFinal([topico({ id: 1, disciplina_id: 3, estado: "fraco" })]);
    expect(plano.passos.some((p) => p.titulo.startsWith("Resumo expresso"))).toBe(false);
  });

  it("depois de estudar o tópico novo hoje, outro não entra no lugar", () => {
    const topicos = [
      topico({ id: 3, disciplina_id: 3, estado: "fraco", dominio: 0.4 }), // era não visto, já respondido hoje
      topico({ id: 4, disciplina_id: 3, estado: "nao_visto", dominio: 0.2 }),
      topico({ id: 5, disciplina_id: 1, estado: "fraco", dominio: 0.3 }),
    ];
    const plano = retaFinal(topicos, {
      atividadeHoje: {
        total: 5,
        revisao: 0,
        simulado: 0,
        porTopico: [{ topicoId: 3, feitas: 5 }],
        erradasHoje: 0,
        refeitasHoje: 0,
        primeiraVezHoje: [3],
      },
    });
    const expressos = plano.passos.filter((p) => p.titulo.startsWith("Resumo expresso"));
    expect(expressos).toHaveLength(1);
    expect(expressos[0].topicoId).toBe(3);
    expect(plano.passos.some((p) => p.topicoId === 4)).toBe(false);
  });
});

describe("fila de revisão", () => {
  const aquecimento = (p: ReturnType<typeof montarPlano>) => p.passos.find((x) => x.tipo === "aquecimento");

  it("aquecimento escala com a meta: meta 40 → 10 questões", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 30, metaQuestoes: 40 }));
    expect(aquecimento(plano)!.questoes).toBe(10);
  });

  it("mínimo de 8 e nunca mais que as vencidas", () => {
    expect(aquecimento(montarPlano(entrada({ revisoesVencidas: 30, metaQuestoes: 20 })))!.questoes).toBe(8);
    expect(aquecimento(montarPlano(entrada({ revisoesVencidas: 5, metaQuestoes: 40 })))!.questoes).toBe(5);
  });

  it("aviso quando vencidas > 3 × aquecimento; zera em ~D dias", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 50, metaQuestoes: 26 })); // aquecimento 8; 50 > 24
    expect(plano.filaRevisao).toEqual({ vencidas: 50, aquecimento: 8, diasParaZerar: 7 });
    expect(aquecimento(plano)!.descricao).toBe("Fila de revisão: 50 questões; no ritmo de hoje, zera em ~7 dias");
  });

  it("sem bola de neve não há aviso (vencidas ≤ 3 × aquecimento)", () => {
    const plano = montarPlano(entrada({ revisoesVencidas: 24, metaQuestoes: 26 }));
    expect(plano.filaRevisao).toBeNull();
    expect(aquecimento(plano)!.descricao).not.toContain("Fila de revisão");
  });

  it("com fila grande, as questões mistas puxam metade da revisão", () => {
    const topicos = [1, 2, 3].map((id) => topico({ id, disciplina_id: id, n_questoes: 2 }));
    const plano = montarPlano(entrada({ topicos, revisoesVencidas: 60, metaQuestoes: 30 }));
    const misto = plano.passos.find((p) => p.tipo === "misto")!;
    expect(misto).toBeDefined();
    const n = Number(/n=(\d+)/.exec(misto.href)![1]);
    const k = Number(/revisao=(\d+)/.exec(misto.href)![1]);
    expect(k).toBe(Math.ceil(n / 2));
    expect(misto.descricao).toContain("fila de revisão");
  });

  it("sem fila grande, as mistas não puxam revisão", () => {
    const topicos = [1, 2, 3].map((id) => topico({ id, disciplina_id: id, n_questoes: 2 }));
    const plano = montarPlano(entrada({ topicos, revisoesVencidas: 4, metaQuestoes: 30 }));
    expect(plano.passos.find((p) => p.tipo === "misto")!.href).not.toContain("revisao=");
  });
});

describe("buscarQuestoes misto com revisão", () => {
  it("revisao=K traz as K questões vencidas há mais tempo", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const q = await import("./queries");
    const { criarEstadoInicial } = await import("./store");
    const catalogo = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "public/dados/catalogo.json"), "utf8"),
    );
    const estado = criarEstadoInicial();
    const ids = q.buscarQuestoes(catalogo, estado, { n: 6 }).map((x) => x.id);
    ids.forEach((id, i) => {
      estado.revisoes[id] = {
        questao_id: id,
        proxima_em: `2027-01-0${i + 1}`,
        intervalo_dias: 1,
        facilidade: 2.5,
      };
    });
    const doDia = q
      .buscarQuestoes(catalogo, estado, { modo: "misto", n: 10, revisao: 3 }, "2027-02-01")
      .map((x) => x.id);
    expect(doDia).toHaveLength(10);
    expect(new Set(doDia).size).toBe(10);
    for (const id of ids.slice(0, 3)) expect(doDia).toContain(id);
  });
});
