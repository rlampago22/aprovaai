// Ritmo de cobertura: garante que nenhum tópico fique sem ser visto, mesmo com dias perdidos.
// Função pura, sem banco nem relógio.
import { diaDaSemana, diasEntre, somarDias, type DiaSemana } from "./datas";
/** Mesmo valor de MINUTOS_BLOCO do planner (duplicado para evitar import circular). */
const MINUTOS_BLOCO = 25;

export type FaseAlvo = "cobertura" | "consolidacao" | "reta_final";

export interface RitmoCobertura {
  naoVistos: number;
  /** Fase cujo fim é o prazo para ver tudo pela 1ª vez. */
  faseAlvo: FaseAlvo;
  /** Dias úteis de estudo (minutos > 0 no perfil) até o fim da fase alvo, contando hoje. */
  diasRestantesNaFase: number;
  /** Tópicos novos por dia necessários para ver todos até o fim da fase alvo. */
  ritmoNecessario: number;
  /** Passos de estudo por dia no perfil médio. */
  ritmoPlanejado: number;
  atrasado: boolean;
}

/** Fim da fase alvo: prova − 45 (cobertura); se já passou, prova − 15; se já passou, a prova. */
export function faseAlvoDaCobertura(diasAteProva: number): { faseAlvo: FaseAlvo; diasAteFim: number } {
  if (diasAteProva > 45) return { faseAlvo: "cobertura", diasAteFim: diasAteProva - 45 };
  if (diasAteProva >= 15) return { faseAlvo: "consolidacao", diasAteFim: diasAteProva - 15 };
  return { faseAlvo: "reta_final", diasAteFim: Math.max(0, diasAteProva) };
}

/** Passos de estudo de um dia com `min` minutos (blocos de 25; 1 vaga vai para o fechamento a partir de 3 passos). */
export function passosDeEstudoDoDia(min: number): number {
  if (min <= 0) return 0;
  const n = Math.max(1, Math.floor(min / MINUTOS_BLOCO));
  const vagas = n - (n >= 3 ? 1 : 0);
  return Math.max(1, vagas);
}

export function ritmoDeCobertura(args: {
  naoVistos: number;
  dataProva: string;
  hoje: string;
  minutosPorDia: Partial<Record<DiaSemana, number>>;
}): RitmoCobertura {
  const { naoVistos, dataProva, hoje, minutosPorDia } = args;
  const { faseAlvo, diasAteFim } = faseAlvoDaCobertura(diasEntre(hoje, dataProva));

  let diasUteis = 0;
  for (let i = 0; i < diasAteFim; i++) {
    if ((minutosPorDia[diaDaSemana(somarDias(hoje, i))] ?? 0) > 0) diasUteis++;
  }
  // Pelo menos hoje conta, para o ritmo nunca dividir por zero.
  const diasRestantesNaFase = Math.max(1, diasUteis);

  const dias = Object.values(minutosPorDia).filter((m): m is number => typeof m === "number" && m > 0);
  const media = dias.length ? dias.reduce((s, m) => s + passosDeEstudoDoDia(m), 0) / dias.length : 0;
  // Na reta final só 1 tópico novo por dia é permitido (resumo expresso).
  const ritmoPlanejado = faseAlvo === "reta_final" ? Math.min(1, media) : media;

  const ritmoNecessario = naoVistos / diasRestantesNaFase;
  return {
    naoVistos,
    faseAlvo,
    diasRestantesNaFase,
    ritmoNecessario,
    ritmoPlanejado,
    atrasado: naoVistos > 0 && ritmoNecessario > ritmoPlanejado,
  };
}
