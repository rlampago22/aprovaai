import { describe, expect, it } from "vitest";
import { extrairSecoes } from "./resumo";

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
