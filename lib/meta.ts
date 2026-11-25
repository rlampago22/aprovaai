// Meta diária de questões e recálculo semanal. Funções puras, sem banco nem relógio.
import { diaDaSemana, somarDias, type DiaSemana } from "./datas";
import type { Energia } from "./planner";

/** Fração do tempo do dia dedicada a questões (o resto é teoria/vídeo). */
export const FRACAO_TEMPO_EM_QUESTOES = 0.65;
export const MINUTOS_POR_QUESTAO = 3;
export const META_MINIMA = 5;
/** Estimativas de estudo de conteúdo (minutos): resumo lido; vídeo sem duração conhecida. */
export const MINUTOS_RESUMO = 10;
export const MINUTOS_VIDEO_PADRAO = 15;
/** Máximo de questões extras (recuperação) por dia, em relação à meta base do dia. */
export const TETO_EXTRA = 0.3;
export const FATOR_ENERGIA_BAIXA = 0.6;

/** Semana de segunda a domingo. */
export const ORDEM_SEMANA: DiaSemana[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

/** Minutos planejados do dia: energia baixa × 0,6; média e alta × 1,0 (alta não aumenta). */
export function minutosPlanejados(base: number, energia: Energia = "media"): number {
  const b = Math.max(0, base);
  return energia === "baixa" ? Math.floor(b * FATOR_ENERGIA_BAIXA) : b;
}

/** Meta de questões do dia = round(minutos × 0,65 / 3), com mínimo de 5. */
export function metaQuestoesDoDia(minutos: number): number {
  const n = Math.round((Math.max(0, minutos) * FRACAO_TEMPO_EM_QUESTOES) / MINUTOS_POR_QUESTAO);
  return Math.max(META_MINIMA, n);
}

/** Segunda-feira da semana que contém a data. */
export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -ORDEM_SEMANA.indexOf(diaDaSemana(iso)));
}

export function datasDaSemana(iso: string): string[] {
  const ini = inicioDaSemana(iso);
  return ORDEM_SEMANA.map((_, i) => somarDias(ini, i));
}

/**
 * Reparte o déficit entre os dias restantes, no máximo `TETO_EXTRA` da meta base de cada um.
 * O que não couber é perdoado. Preenche primeiro os dias de menor teto.
 */
export function distribuirDeficit(
  deficit: number,
  basesDosDias: number[],
): { extras: number[]; perdoado: number } {
  const extras = basesDosDias.map(() => 0);
  let restante = Math.max(0, Math.round(deficit));
  const ordem = basesDosDias
    .map((b, i) => ({ i, teto: Math.floor(b * TETO_EXTRA) }))
    .sort((a, b) => a.teto - b.teto || a.i - b.i);
  ordem.forEach((d, k) => {
    const faltam = ordem.length - k;
    const cota = Math.ceil(restante / faltam);
    const e = Math.min(d.teto, cota);
    extras[d.i] = e;
    restante -= e;
  });
  return { extras, perdoado: restante };
}

export type TipoSaldo = "atrasado" | "adiantado" | "em_dia" | "dia_sem_estudo";

export interface DiaDaSemana {
  data: string;
  dia: DiaSemana;
  situacao: "passado" | "hoje" | "futuro";
  /** Meta base (perfil; no dia de hoje, já com check-in). */
  metaBase: number;
  /** Meta com a recuperação do déficit (só difere da base de hoje em diante). */
  meta: number;
  feito: number;
}

export interface ResumoSemana {
  dias: DiaDaSemana[];
  /** Soma das metas base dos 7 dias, pelo perfil. */
  metaSemanaBase: number;
  feitoSemana: number;
  /** Feito − meta base dos dias passados da semana (negativo = atrás). */
  saldo: number;
  metaHoje: number;
  extraHoje: number;
  /** Déficit que passou do limite diário e foi perdoado. */
  perdoado: number;
  tipoSaldo: TipoSaldo;
  mensagem: string;
}

export interface EntradaSemana {
  hoje: string;
  /** Minutos por dia da semana do perfil. */
  minutosPerfil: Partial<Record<DiaSemana, number>>;
  /** Minutos planejados de hoje (já com check-in e energia). */
  minutosHoje: number;
  /** Questões feitas por data (YYYY-MM-DD); pode incluir outras semanas. */
  feitoPorDia: Record<string, number>;
  /**
   * Data (YYYY-MM-DD) do primeiro estudo registrado no app, ou `null` se o usuário ainda não começou.
   * Dias anteriores a essa data não entram como atraso. Se omitido (`undefined`), conta toda a semana.
   */
  primeiroDiaEstudo?: string | null;
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export function mensagemSaldo(a: {
  saldo: number;
  extraPorDia: number;
  perdoado: number;
  ontemSemEstudo: boolean;
  semDiasPassados: boolean;
  aindaNaoComecou?: boolean;
  hojeEDomingo: boolean;
}): { tipo: TipoSaldo; texto: string } {
  if (a.saldo < 0) {
    const atras = `Você está ${plural(-a.saldo, "questão", "questões")} atrás.`;
    const dist = a.hojeEDomingo
      ? `Somei +${a.extraPorDia} à meta de hoje.`
      : `Distribuí +${a.extraPorDia} por dia até domingo.`;
    const perdao = a.perdoado > 0 ? " O que passou do limite diário foi perdoado: sem culpa." : "";
    if (a.ontemSemEstudo) {
      return {
        tipo: "dia_sem_estudo",
        texto: `Dia sem estudo não apaga nada: o plano já se ajustou. ${atras} ${dist}${perdao}`,
      };
    }
    return { tipo: "atrasado", texto: `${atras} ${dist}${perdao}` };
  }
  if (a.saldo > 0) {
    const quando = a.hojeEDomingo ? "hoje" : "no domingo";
    return {
      tipo: "adiantado",
      texto: `Você está adiantado ${plural(a.saldo, "questão", "questões")} — pode pegar mais leve ${quando}.`,
    };
  }
  return {
    tipo: "em_dia",
    texto: a.aindaNaoComecou
      ? "Tudo pronto para o seu primeiro dia de estudos — sem atrasos acumulados."
      : a.semDiasPassados
        ? "Semana nova: saldo zerado. Bora começar."
        : "Você está em dia com a semana.",
  };
}

export function calcularSemana(e: EntradaSemana): ResumoSemana {
  const datas = datasDaSemana(e.hoje);
  const dias: DiaDaSemana[] = datas.map((data) => {
    const dia = diaDaSemana(data);
    const situacao = data < e.hoje ? "passado" : data === e.hoje ? "hoje" : "futuro";
    const metaPerfil = metaQuestoesDoDia(e.minutosPerfil[dia] ?? 0);
    const metaBase = situacao === "hoje" ? metaQuestoesDoDia(e.minutosHoje) : metaPerfil;
    return { data, dia, situacao, metaBase, meta: metaBase, feito: e.feitoPorDia[data] ?? 0 };
  });

  const aindaNaoComecou = e.primeiroDiaEstudo === null;
  const passados = dias.filter((d) => {
    if (d.situacao !== "passado") return false;
    if (aindaNaoComecou) return false;
    if (typeof e.primeiroDiaEstudo === "string" && d.data < e.primeiroDiaEstudo) return false;
    return true;
  });
  const restantes = dias.filter((d) => d.situacao !== "passado");
  const saldo =
    passados.reduce((s, d) => s + d.feito, 0) - passados.reduce((s, d) => s + d.metaBase, 0);

  let perdoado = 0;
  let extraPorDia = 0;
  if (saldo < 0) {
    const r = distribuirDeficit(
      -saldo,
      restantes.map((d) => d.metaBase),
    );
    restantes.forEach((d, i) => {
      d.meta = d.metaBase + r.extras[i];
    });
    perdoado = r.perdoado;
    extraPorDia = Math.max(0, ...r.extras);
  }

  const hojeInfo = dias.find((d) => d.situacao === "hoje")!;
  const ontem = passados.find((d) => d.data === somarDias(e.hoje, -1));
  const msg = mensagemSaldo({
    saldo,
    extraPorDia,
    perdoado,
    ontemSemEstudo: !!ontem && ontem.feito === 0,
    semDiasPassados: passados.length === 0,
    aindaNaoComecou,
    hojeEDomingo: diaDaSemana(e.hoje) === "dom",
  });

  return {
    dias,
    metaSemanaBase: ORDEM_SEMANA.reduce((s, d) => s + metaQuestoesDoDia(e.minutosPerfil[d] ?? 0), 0),
    feitoSemana: dias.reduce((s, d) => s + d.feito, 0),
    saldo,
    metaHoje: hojeInfo.meta,
    extraHoje: hojeInfo.meta - hojeInfo.metaBase,
    perdoado,
    tipoSaldo: msg.tipo,
    mensagem: msg.texto,
  };
}
