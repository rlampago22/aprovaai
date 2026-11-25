import { describe, expect, it } from "vitest";
import { FACILIDADE_INICIAL, proximaRevisao } from "./revisao";

describe("reinício do SM-2 para revisões muito atrasadas", () => {
  const antigo = { intervalo_dias: 30, facilidade: 2.9 };

  it("vencida há mais de 14 dias: acerto volta como erro recente (intervalo 3, facilidade padrão)", () => {
    const r = proximaRevisao(antigo, true, false, "2027-01-20", "2027-01-05"); // 15 dias
    expect(r.intervalo_dias).toBe(3);
    expect(r.facilidade).toBeCloseTo(FACILIDADE_INICIAL + 0.05);
    expect(r.proxima_em).toBe("2027-01-23");
  });

  it("vencida há mais de 14 dias: erro parte da facilidade padrão, não da antiga", () => {
    const r = proximaRevisao(antigo, false, false, "2027-01-20", "2027-01-05");
    expect(r.intervalo_dias).toBe(1);
    expect(r.facilidade).toBeCloseTo(FACILIDADE_INICIAL - 0.2);
  });

  it("vencida há exatamente 14 dias ou menos: mantém o estado", () => {
    const r = proximaRevisao(antigo, true, false, "2027-01-20", "2027-01-06"); // 14 dias
    expect(r.intervalo_dias).toBe(Math.round(30 * 2.9));
    expect(r.facilidade).toBeCloseTo(2.95);
  });

  it("sem data de vencimento, comporta-se como antes", () => {
    expect(proximaRevisao(antigo, true, false, "2027-01-20").intervalo_dias).toBe(87);
  });
});

describe("refazer no mesmo dia em que errou/chutou", () => {
  it("acerto no mesmo dia mantém a revisão para amanhã (1 dia) sem inflar a facilidade", () => {
    const aposErro = proximaRevisao(null, false, false, "2026-11-24");
    expect(aposErro).toEqual({ intervalo_dias: 1, facilidade: 2.3, proxima_em: "2026-11-25" });

    const refeitaHoje = proximaRevisao(aposErro, true, false, "2026-11-24", aposErro.proxima_em, true);
    expect(refeitaHoje).toEqual({ intervalo_dias: 1, facilidade: 2.3, proxima_em: "2026-11-25" });

    // No dia seguinte, sem novo erro hoje, acertar aí sim avança para 3 dias.
    const noDiaSeguinte = proximaRevisao(refeitaHoje, true, false, "2026-11-25", refeitaHoje.proxima_em, false);
    expect(noDiaSeguinte.intervalo_dias).toBe(3);
    expect(noDiaSeguinte.proxima_em).toBe("2026-11-28");
    expect(noDiaSeguinte.facilidade).toBeCloseTo(2.35);
  });
});
