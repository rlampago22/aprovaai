import { describe, expect, it } from "vitest";
import { extrairIdYoutube, parseTempo, urlEmbedYoutube } from "./youtube";

describe("youtube", () => {
  const id = "dQw4w9WgXcQ";
  it("extrai o ID de watch, youtu.be e shorts", () => {
    expect(extrairIdYoutube(`https://www.youtube.com/watch?v=${id}&t=10s`)).toBe(id);
    expect(extrairIdYoutube(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(extrairIdYoutube(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(extrairIdYoutube(`youtube.com/watch?v=${id}`)).toBe(id);
  });
  it("rejeita URLs inválidas", () => {
    expect(extrairIdYoutube("https://exemplo.com/watch?v=" + id)).toBeNull();
    expect(extrairIdYoutube("texto qualquer")).toBeNull();
    expect(extrairIdYoutube("")).toBeNull();
  });
  it("monta a URL nocookie com início e fim", () => {
    expect(urlEmbedYoutube(id, 30, 90)).toBe(
      `https://www.youtube-nocookie.com/embed/${id}?start=30&end=90`,
    );
    expect(urlEmbedYoutube(id)).toBe(`https://www.youtube-nocookie.com/embed/${id}`);
  });
  it("interpreta tempos", () => {
    expect(parseTempo("90")).toBe(90);
    expect(parseTempo("1:30")).toBe(90);
    expect(parseTempo("1:02:03")).toBe(3723);
    expect(parseTempo("")).toBeNull();
    expect(parseTempo("abc")).toBeNull();
  });
});
