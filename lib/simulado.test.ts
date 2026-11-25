import { describe, expect, it } from "vitest";
import {
  avaliarSimulado,
  calcularTempoSugeridoMin,
  espalharPorTopico,
  TEMPO_SIMULADO_COMPLETO_MIN,
  type QuestaoAvaliacao,
  type RespostaAvaliacao,
} from "./simulado";
import type { DisciplinaNota } from "./dominio";

const DISCIPLINAS: DisciplinaNota[] = [
  { id: 1, nome: "Língua Portuguesa", questoes_prova: 10, minimo_acertos: 2 },
  { id: 2, nome: "Legislação", questoes_prova: 15, minimo_acertos: 2 },
  { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25, minimo_acertos: 5 },
];

function gerarQuestoesCompletas(): QuestaoAvaliacao[] {
  const out: QuestaoAvaliacao[] = [];
  let id = 1;
  for (const d of DISCIPLINAS) {
    for (let i = 0; i < d.questoes_prova; i++) {
      out.push({
        id,
        disciplina_id: d.id,
        disciplina_nome: d.nome,
        topico_id: d.id * 100 + (i % 5),
        topico_titulo: `Tópico ${d.id}.${(i % 5) + 1}`,
        correta: "A",
      });
      id++;
    }
  }
  return out;
}

describe("calcularTempoSugeridoMin", () => {
  it("usa 210 min (3h30) no completo e 4,2 min/questão nos recortes", () => {
    expect(calcularTempoSugeridoMin("completo", 50)).toBe(TEMPO_SIMULADO_COMPLETO_MIN);
    expect(calcularTempoSugeridoMin("disciplina", 15)).toBe(63);
    expect(calcularTempoSugeridoMin("periodo", 2)).toBe(10); // piso de 10 min
  });
});

describe("espalharPorTopico", () => {
  it("distribui em rodadas entre tópicos preservando a prioridade dentro de cada um", () => {
    const candidatas = [
      { id: 1, topico_id: 10 },
      { id: 2, topico_id: 10 },
      { id: 3, topico_id: 10 },
      { id: 4, topico_id: 20 },
      { id: 5, topico_id: 20 },
      { id: 6, topico_id: 30 },
    ];
    expect(espalharPorTopico(candidatas, 5)).toEqual([1, 4, 6, 2, 5]);
    expect(espalharPorTopico(candidatas, 10)).toEqual([1, 4, 6, 2, 5, 3]);
  });
});

describe("avaliarSimulado", () => {
  it("aprova simulado completo quando nota >= 50 e todos os mínimos por disciplina batem", () => {
    const qs = gerarQuestoesCompletas();
    const respostas: Record<number, RespostaAvaliacao> = {};
    // Acerta 8 em Pt, 12 em Leg, 20 em Esp = 40 acertos = 80/100
    qs.forEach((q) => {
      const idxNaDisc =
        q.disciplina_id === 1 ? q.id - 1 : q.disciplina_id === 2 ? q.id - 11 : q.id - 26;
      const limite = q.disciplina_id === 1 ? 8 : q.disciplina_id === 2 ? 12 : 20;
      respostas[q.id] = { resposta: idxNaDisc < limite ? "A" : "B", chutou: idxNaDisc === 0 };
    });

    const r = avaliarSimulado({
      tipo: "completo",
      disciplinas: DISCIPLINAS,
      questoes: qs,
      respostas,
      notaAlvo: 80,
    });

    expect(r.regrasOficiaisAplicaveis).toBe(true);
    expect(r.acertos).toBe(40);
    expect(r.nota).toBe(80);
    expect(r.aprovado).toBe(true);
    expect(r.atingeMeta).toBe(true);
    expect(r.motivosEliminacao).toEqual([]);
    expect(r.chutes).toBe(3);
    expect(r.acertosNoChute).toBe(3);
    expect(r.topicosReforcar.length).toBeGreaterThan(0);
  });

  it("elimina simulado completo com nota >= 50 mas abaixo do mínimo em Português", () => {
    const qs = gerarQuestoesCompletas();
    const respostas: Record<number, RespostaAvaliacao> = {};
    // Acerta só 1/10 em Pt (mínimo 2!), 15/15 em Leg, 20/25 em Esp = 36 acertos = 72/100
    qs.forEach((q) => {
      if (q.disciplina_id === 1) {
        respostas[q.id] = { resposta: q.id === 1 ? "A" : "C", chutou: false };
      } else if (q.disciplina_id === 2) {
        respostas[q.id] = { resposta: "A", chutou: false };
      } else {
        respostas[q.id] = { resposta: q.id <= 45 ? "A" : null, chutou: false };
      }
    });

    const r = avaliarSimulado({
      tipo: "completo",
      disciplinas: DISCIPLINAS,
      questoes: qs,
      respostas,
      notaAlvo: 80,
    });

    expect(r.nota).toBe(72);
    expect(r.emBranco).toBe(5);
    expect(r.aprovado).toBe(false);
    expect(r.motivosEliminacao).toHaveLength(1);
    expect(r.motivosEliminacao[0]).toContain("Língua Portuguesa");
  });

  it("calcula nota proporcional em simulado por disciplina sem aplicar eliminação do edital", () => {
    const qs = gerarQuestoesCompletas().filter((q) => q.disciplina_id === 2).slice(0, 10);
    const respostas: Record<number, RespostaAvaliacao> = {};
    qs.forEach((q, i) => {
      respostas[q.id] = { resposta: i < 7 ? "A" : "D", chutou: false };
    });

    const r = avaliarSimulado({
      tipo: "disciplina",
      disciplinas: DISCIPLINAS,
      questoes: qs,
      respostas,
      notaAlvo: 80,
    });

    expect(r.regrasOficiaisAplicaveis).toBe(false);
    expect(r.nota).toBe(70);
    expect(r.porDisciplina).toHaveLength(1);
    expect(r.porDisciplina[0].minimoAplicavel).toBe(false);
    expect(r.aprovado).toBe(true);
    expect(r.atingeMeta).toBe(false);
  });
});
