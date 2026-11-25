import { describe, expect, it } from "vitest";
import {
  calcularSemana,
  datasDaSemana,
  distribuirDeficit,
  inicioDaSemana,
  metaQuestoesDoDia,
  minutosPlanejados,
} from "./meta";

// Semana de 2027-01-04 (segunda) a 2027-01-10 (domingo)
const perfil = { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 120, dom: 120 }; // meta base 26/dia
const SEG = "2027-01-04";
const QUA = "2027-01-06";
const DOM = "2027-01-10";

describe("meta do dia", () => {
  it("round(min × 0,65 / 3), mínimo 5", () => {
    expect(metaQuestoesDoDia(120)).toBe(26);
    expect(metaQuestoesDoDia(60)).toBe(13);
    expect(metaQuestoesDoDia(10)).toBe(5);
    expect(metaQuestoesDoDia(0)).toBe(5);
  });
  it("energia baixa × 0,6; alta não aumenta", () => {
    expect(minutosPlanejados(120, "baixa")).toBe(72);
    expect(minutosPlanejados(120, "alta")).toBe(120);
    expect(minutosPlanejados(120, "media")).toBe(120);
    expect(metaQuestoesDoDia(minutosPlanejados(120, "baixa"))).toBe(16);
  });
  it("semana começa na segunda", () => {
    expect(inicioDaSemana(DOM)).toBe(SEG);
    expect(inicioDaSemana(SEG)).toBe(SEG);
    expect(datasDaSemana(QUA)).toHaveLength(7);
  });
});

describe("distribuição do déficit", () => {
  it("reparte igualmente quando cabe", () => {
    const r = distribuirDeficit(10, [26, 26, 26, 26, 26]);
    expect(r.extras).toEqual([2, 2, 2, 2, 2]);
    expect(r.perdoado).toBe(0);
  });
  it("limita a +30% da meta base e perdoa o resto", () => {
    const r = distribuirDeficit(100, [26, 26]);
    expect(r.extras).toEqual([7, 7]); // floor(26 × 0,3) = 7
    expect(r.perdoado).toBe(86);
  });
});

describe("semana", () => {
  it("em dia: sem recálculo", () => {
    const r = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: { [SEG]: 26, "2027-01-05": 26 },
    });
    expect(r.saldo).toBe(0);
    expect(r.metaHoje).toBe(26);
    expect(r.extraHoje).toBe(0);
    expect(r.tipoSaldo).toBe("em_dia");
    expect(r.metaSemanaBase).toBe(26 * 7);
  });

  it("1 dia zerado redistribui pelos dias restantes (hoje incluso)", () => {
    const r = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: { [SEG]: 26, "2027-01-05": 0 },
    });
    expect(r.saldo).toBe(-26);
    // 5 dias restantes (qua–dom): ceil(26/5) = 6 no primeiro; o resto se ajusta
    expect(r.extraHoje).toBe(6);
    const extras = r.dias.filter((d) => d.situacao !== "passado").map((d) => d.meta - d.metaBase);
    expect(extras.reduce((a, b) => a + b, 0)).toBe(26);
    expect(r.perdoado).toBe(0);
    expect(r.tipoSaldo).toBe("dia_sem_estudo");
    expect(r.mensagem).toContain("Dia sem estudo não apaga nada");
    expect(r.mensagem).toContain("26 questões atrás");
  });

  it("déficit grande é limitado a +30% por dia e o excedente é perdoado", () => {
    const r = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: {},
    });
    expect(r.saldo).toBe(-52);
    // 5 dias × teto de 7 = 35 recuperados; 17 perdoados
    expect(r.extraHoje).toBe(7);
    expect(r.perdoado).toBe(17);
    expect(r.metaHoje).toBe(33);
    expect(r.mensagem).toContain("perdoado");
  });

  it("adiantado não aumenta a meta", () => {
    const r = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: { [SEG]: 40, "2027-01-05": 38 },
    });
    expect(r.saldo).toBe(26);
    expect(r.metaHoje).toBe(26);
    expect(r.dias.every((d) => d.meta === d.metaBase)).toBe(true);
    expect(r.tipoSaldo).toBe("adiantado");
    expect(r.mensagem).toContain("adiantado 26 questões");
  });

  it("energia baixa reduz a meta de hoje e o teto da recuperação", () => {
    const r = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: minutosPlanejados(120, "baixa"), // 72 min → 16
      feitoPorDia: {},
    });
    const hoje = r.dias.find((d) => d.situacao === "hoje")!;
    expect(hoje.metaBase).toBe(16);
    expect(r.extraHoje).toBeLessThanOrEqual(Math.floor(16 * 0.3)); // 4
    expect(r.metaHoje).toBeLessThanOrEqual(20);
  });

  it("segunda-feira zera o saldo, mesmo com a semana anterior atrasada", () => {
    const r = calcularSemana({
      hoje: SEG,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: { "2027-01-03": 0, "2027-01-02": 0 },
    });
    expect(r.saldo).toBe(0);
    expect(r.metaHoje).toBe(26);
    expect(r.extraHoje).toBe(0);
    expect(r.tipoSaldo).toBe("em_dia");
  });

  it("no domingo, o déficit vai todo para hoje (até o teto)", () => {
    const r = calcularSemana({
      hoje: DOM,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: {
        [SEG]: 26,
        "2027-01-05": 26,
        "2027-01-06": 26,
        "2027-01-07": 26,
        "2027-01-08": 20,
        "2027-01-09": 26,
      },
    });
    expect(r.saldo).toBe(-6);
    expect(r.extraHoje).toBe(6);
    expect(r.mensagem).toContain("hoje");
  });

  it("não cobra atraso antes do primeiro dia de estudos (nem nos dias anteriores da 1ª semana)", () => {
    // Ainda não começou (terça/quarta com 0 tentativas no banco)
    const antes = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: {},
      primeiroDiaEstudo: null,
    });
    expect(antes.saldo).toBe(0);
    expect(antes.extraHoje).toBe(0);
    expect(antes.metaHoje).toBe(26);
    expect(antes.tipoSaldo).toBe("em_dia");
    expect(antes.mensagem).toContain("primeiro dia");

    // Começou na terça (2027-01-05) e cumpriu terça: na quarta, segunda não conta como dívida
    const comecouTerca = calcularSemana({
      hoje: QUA,
      minutosPerfil: perfil,
      minutosHoje: 120,
      feitoPorDia: { "2027-01-05": 26 },
      primeiroDiaEstudo: "2027-01-05",
    });
    expect(comecouTerca.saldo).toBe(0);
    expect(comecouTerca.extraHoje).toBe(0);
    expect(comecouTerca.metaHoje).toBe(26);
    expect(comecouTerca.tipoSaldo).toBe("em_dia");
  });
});
