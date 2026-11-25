import { describe, expect, it } from "vitest";
import { montarCronograma, type TopicoCronogramaInput } from "./cronograma";
import type { DisciplinaPlanner } from "./planner";

const DISCIPLINAS: DisciplinaPlanner[] = [
  { id: 1, nome: "Língua Portuguesa", questoes_prova: 10 },
  { id: 2, nome: "Legislação", questoes_prova: 15 },
  { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25 },
];

function criarTopicos(n: number): TopicoCronogramaInput[] {
  return Array.from({ length: n }, (_, i) => {
    const disc = DISCIPLINAS[i % 3];
    return {
      id: i + 1,
      disciplina_id: disc.id,
      disciplina_nome: disc.nome,
      ordem: Math.floor(i / 3) + 1,
      titulo_curto: `Tópico ${i + 1}`,
      dominio: 0.2,
      estado: "nao_visto",
      n_questoes: 15,
      conteudos: [{ tipo: "teoria" }, { tipo: "video", minutos: 10 }],
    };
  });
}

describe("montarCronograma", () => {
  it("projeta semanas até a prova, distribui os 55 tópicos novos sem repetir e marca simulados no domingo", () => {
    const r = montarCronograma({
      hoje: "2026-11-23", // segunda-feira
      perfil: {
        data_prova: "2027-01-31", // domingo (69 dias depois)
        minutos_por_dia: { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 180, dom: 240 },
      },
      disciplinas: DISCIPLINAS,
      topicos: criarTopicos(55),
      revisoesVencidasHoje: 0,
      metaHoje: 26,
    });

    expect(r.diasAteProva).toBe(69);
    expect(r.faseAtual).toBe("cobertura");
    expect(r.fases).toHaveLength(3);
    expect(r.semanas[0].ehSemanaAtual).toBe(true);
    expect(r.semanas[r.semanas.length - 1].ehSemanaProva).toBe(true);

    // Todos os 55 tópicos novos entram sem duplicar na 1ª passagem
    const idsNovos = r.semanas.flatMap((s) =>
      s.dias.flatMap((d) => d.topicos.filter((t) => t.modo === "novo" || t.modo === "expresso").map((t) => t.id)),
    );
    expect(idsNovos).toHaveLength(55);
    expect(new Set(idsNovos).size).toBe(55);
    expect(r.topicosNaoCobertosAteProva).toBe(0);
    expect(r.dataConclusaoCobertura).not.toBeNull();

    // Domingos antes da prova têm simulado completo (29/11, 06/12, 13/12, 20/12, 27/12, 03/01, 10/01, 17/01, 24/01 = 9)
    expect(r.simuladosCompletosPrevistos).toBe(9);
    // Dia da prova marcado corretamente
    const diaProva = r.semanas.flatMap((s) => s.dias).find((d) => d.data === "2027-01-31");
    expect(diaProva?.tipo).toBe("prova");
  });

  it("respeita dias de folga (0 min) e sinaliza quando não dá para cobrir tudo até a prova", () => {
    const r = montarCronograma({
      hoje: "2027-01-20", // já na reta final (11 dias)
      perfil: {
        data_prova: "2027-01-31",
        minutos_por_dia: { seg: 60, ter: 0, qua: 60, qui: 0, sex: 60, sab: 0, dom: 0 },
      },
      disciplinas: DISCIPLINAS,
      topicos: criarTopicos(20),
      revisoesVencidasHoje: 0,
      metaHoje: 13,
    });

    expect(r.faseAtual).toBe("reta_final");
    const folgas = r.semanas.flatMap((s) => s.dias).filter((d) => d.tipo === "folga" && d.data > "2027-01-20" && d.data < "2027-01-31");
    expect(folgas.length).toBeGreaterThan(0);
    expect(r.topicosNaoCobertosAteProva).toBeGreaterThan(0);
    expect(r.dataConclusaoCobertura).toBeNull();
  });

  it("marca dataConclusaoCobertura como hoje quando todos os tópicos já foram vistos", () => {
    const vistos = criarTopicos(5).map((t) => ({ ...t, estado: "em_progresso" as const, dominio: 0.7 }));
    const r = montarCronograma({
      hoje: "2026-12-20",
      perfil: {
        data_prova: "2027-01-31",
        minutos_por_dia: { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 120, dom: 120 },
      },
      disciplinas: DISCIPLINAS,
      topicos: vistos,
      revisoesVencidasHoje: 0,
      metaHoje: 26,
    });

    expect(r.topicosNaoVistos).toBe(0);
    expect(r.dataConclusaoCobertura).toBe("2026-12-20");
    expect(r.topicosNaoCobertosAteProva).toBe(0);
  });
});
