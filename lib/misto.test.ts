import { describe, expect, it } from "vitest";
import { selecionarMisto } from "./misto";

const lista = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);

describe("selecionarMisto", () => {
  const grupos = [
    { peso: 10, itens: lista("P", 20) },
    { peso: 15, itens: lista("L", 20) },
    { peso: 25, itens: lista("E", 20) },
  ];
  it("reparte pelo peso e dá as sobras às disciplinas de maior peso", () => {
    const r = selecionarMisto(grupos, 10);
    expect(r).toHaveLength(10);
    const c = (p: string) => r.filter((x) => x.startsWith(p)).length;
    expect(c("E")).toBe(5);
    expect(c("L")).toBe(3);
    expect(c("P")).toBe(2);
  });
  it("respeita a ordem de preferência dentro da disciplina", () => {
    expect(selecionarMisto(grupos, 5).filter((x) => x.startsWith("E"))).toEqual(["E1", "E2", "E3"]);
  });
  it("redistribui quando uma disciplina tem poucas questões e nunca passa do disponível", () => {
    const r = selecionarMisto(
      [
        { peso: 25, itens: ["E1"] },
        { peso: 10, itens: lista("P", 3) },
      ],
      6,
    );
    expect(r).toHaveLength(4);
    expect(selecionarMisto([], 5)).toEqual([]);
    expect(selecionarMisto(grupos, 0)).toEqual([]);
  });
});
