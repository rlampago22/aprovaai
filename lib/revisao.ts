// Repetição espaçada: SM-2 simplificado (função pura).
import { diasEntre, somarDias } from "./datas";

export interface EstadoRevisao {
  intervalo_dias: number;
  facilidade: number;
}

export interface NovaRevisao extends EstadoRevisao {
  proxima_em: string;
}

export const FACILIDADE_INICIAL = 2.5;
/** Revisão vencida há mais que isso é "dívida antiga": o estado SM-2 é reiniciado. */
export const DIAS_PARA_REINICIAR = 14;

/**
 * Errou ou "chutei": volta em 1 dia. Acertou: 3 dias na primeira vez, depois intervalo × facilidade.
 * Se `errouHoje` é verdadeiro (refez e acertou no mesmo dia em que errou/chutou), mantém a revisão
 * para amanhã (1 dia), porque acerto imediato não substitui a revisão no dia seguinte.
 * Se `jaAcertouHoje` é verdadeiro (já teve acerto firme hoje sem erro hoje), mantém o agendamento
 * atual para que repetir a questão no mesmo dia não empurre o intervalo para longe.
 * Se `vencidaEm` (a `proxima_em` anterior) está a mais de 14 dias de `hoje`, o estado volta a
 * intervalo 1 e facilidade padrão, como se fosse um erro recente.
 */
export function proximaRevisao(
  anterior: EstadoRevisao | null,
  acertou: boolean,
  chutou: boolean,
  hoje: string,
  vencidaEm?: string | null,
  errouHoje = false,
  jaAcertouHoje = false,
): NovaRevisao {
  const antiga = !!anterior && !!vencidaEm && diasEntre(vencidaEm, hoje) > DIAS_PARA_REINICIAR;
  const base: EstadoRevisao | null = antiga ? { intervalo_dias: 1, facilidade: FACILIDADE_INICIAL } : anterior;
  const fac0 = base?.facilidade ?? FACILIDADE_INICIAL;
  const int0 = base?.intervalo_dias ?? 0;
  if (!acertou || chutou) {
    // Não penaliza a facilidade duas vezes no mesmo dia se já houve erro/chute hoje.
    const facilidade = errouHoje ? fac0 : Math.max(1.3, fac0 - 0.2);
    return { intervalo_dias: 1, facilidade, proxima_em: somarDias(hoje, 1) };
  }
  if (errouHoje) {
    return { intervalo_dias: 1, facilidade: fac0, proxima_em: somarDias(hoje, 1) };
  }
  if (jaAcertouHoje && anterior && vencidaEm) {
    return { intervalo_dias: anterior.intervalo_dias, facilidade: anterior.facilidade, proxima_em: vencidaEm };
  }
  const intervalo = int0 <= 1 ? 3 : Math.round(int0 * fac0);
  const facilidade = Math.min(3, fac0 + 0.05);
  return { intervalo_dias: intervalo, facilidade, proxima_em: somarDias(hoje, intervalo) };
}
