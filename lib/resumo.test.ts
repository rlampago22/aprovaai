import { describe, expect, it } from "vitest";
import { extrairSecoes, parsearItensVF } from "./resumo";

const md = `# Título

## Conceitos
texto longo

## Como a Fundatec cobra (treine agora)
1. item

---

## Revisão em 30 segundos
- ponto A
- ponto B

---
`;

describe("extrairSecoes", () => {
  it("devolve as seções pedidas, na ordem dos prefixos", () => {
    const s = extrairSecoes(md, ["Revisão em 30 segundos", "Como a Fundatec cobra"]);
    expect(s.map((x) => x.titulo)).toEqual(["Revisão em 30 segundos", "Como a Fundatec cobra (treine agora)"]);
    expect(s[0].markdown).toBe("- ponto A\n- ponto B");
    expect(s[1].markdown).toBe("1. item");
  });
  it("ignora seções ausentes", () => {
    expect(extrairSecoes("## Outra\nx", ["Revisão em 30 segundos"])).toEqual([]);
  });
});

describe("parsearItensVF", () => {
  it("extrai introdução, enunciado sem aspas externas, gabarito V/F e explicação", () => {
    const res = parsearItensVF([
      "Julgue cada afirmação como Verdadeira ou Falsa:",
      '1. "A posse ocorre em até 30 dias." → **V** (art. 13, §1º).',
      '2. "Convite ainda existe na Lei 14.133." -> **F**. Foi extinto pela nova lei.',
    ]);
    expect(res).not.toBeNull();
    expect(res!.introducao).toBe("Julgue cada afirmação como Verdadeira ou Falsa:");
    expect(res!.itens).toEqual([
      { enunciado: "A posse ocorre em até 30 dias.", gabarito: "V", explicacao: "(art. 13, §1º)." },
      {
        enunciado: "Convite ainda existe na Lei 14.133.",
        gabarito: "F",
        explicacao: "Foi extinto pela nova lei.",
      },
    ]);
  });

  it("retorna null quando não há pelo menos 2 itens no formato V/F", () => {
    expect(parsearItensVF(["1. Apenas um item sem seta"])).toBeNull();
  });
});
