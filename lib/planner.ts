// Planner do dia: função pura, sem acesso a banco ou relógio.
// Gera o "roteiro" (passos tipados) cuja soma de questões acompanha a meta do dia.
import { ritmoDeCobertura, type RitmoCobertura } from "./cobertura";
import { diaDaSemana, diasEntre, type DiaSemana } from "./datas";
import type { EstadoTopico } from "./dominio";
import {
  FATOR_ENERGIA_BAIXA,
  MINUTOS_POR_QUESTAO,
  MINUTOS_RESUMO,
  MINUTOS_VIDEO_PADRAO,
  metaQuestoesDoDia,
  minutosPlanejados,
} from "./meta";

export type Energia = "baixa" | "media" | "alta";
export type Fase = "cobertura" | "consolidacao" | "reta_final";

export const MINUTOS_BLOCO = 25;
export const MINUTOS_BLOCO_ENERGIA_BAIXA = 20;
export const MINUTOS_BLOCO_MINIMO = 15;
export const MIN_REVISOES_PARA_BLOCO = 3;
export const MINUTOS_SIMULADO_COMPLETO = 210;
export const QUESTOES_SIMULADO_COMPLETO = 50;
export const MINUTOS_FECHAMENTO = 5;
/** Aquecimento: mínimo de questões e fração da meta do dia. */
export const AQUECIMENTO_MINIMO = 8;
export const AQUECIMENTO_FRACAO_META = 0.25;
/** Fila de revisão "bola de neve": vencidas acima de N vezes o aquecimento. */
export const FILA_LIMITE_DIAS = 3;
export const MINUTOS_RESUMO_EXPRESSO = 8;
export const QUESTOES_RESUMO_EXPRESSO = 5;
export { FATOR_ENERGIA_BAIXA, MINUTOS_POR_QUESTAO };

export interface DisciplinaPlanner {
  id: number;
  nome: string;
  questoes_prova: number;
}

export interface ConteudoPlanner {
  tipo: "video" | "teoria" | "fonte";
  /** Duração estimada em minutos (vídeo: duração conhecida ou fim − início). */
  minutos?: number;
}

export interface TopicoPlanner {
  id: number;
  disciplina_id: number;
  titulo_curto: string;
  dominio: number;
  estado: EstadoTopico;
  n_questoes: number;
  conteudos: ConteudoPlanner[];
}

/** O que já foi feito hoje (tentativas de hoje); usado para o estado de cada passo. */
export interface AtividadeHoje {
  total: number;
  /** Tentativas hoje com origem "revisao". */
  revisao: number;
  /** Tentativas hoje com origem "simulado". */
  simulado: number;
  /** Tópicos praticados hoje, na ordem da primeira tentativa. */
  porTopico: { topicoId: number; feitas: number }[];
  /** Questões erradas/chutadas hoje. */
  erradasHoje: number;
  /** Dessas, quantas já foram refeitas hoje. */
  refeitasHoje: number;
  /** Conteúdo marcado como lido/assistido hoje, por tópico (ordem do primeiro registro). */
  conteudoHoje?: { topicoId: number; resumo: boolean; video: boolean }[];
  /** Tópicos trabalhados hoje que não tinham nenhuma tentativa antes de hoje (1ª vez). */
  primeiraVezHoje?: number[];
}

export interface PlannerInput {
  hoje: string; // YYYY-MM-DD
  perfil: { data_prova: string; minutos_por_dia: Partial<Record<DiaSemana, number>> };
  checkin?: { energia: Energia; minutos_hoje: number | null } | null;
  disciplinas: DisciplinaPlanner[];
  topicos: TopicoPlanner[];
  /** Revisões vencidas ainda pendentes. */
  revisoesVencidas: number;
  /** Meta de questões do dia (com recálculo semanal). Se ausente, vem do tempo planejado. */
  metaQuestoes?: number;
  atividadeHoje?: AtividadeHoje;
}

export type TipoPasso = "aquecimento" | "estudo" | "misto" | "simulado" | "fechamento";
export type EstadoPasso = "a_fazer" | "em_andamento" | "feito";

export interface Passo {
  ordem: number;
  tipo: TipoPasso;
  /** Título em linguagem de gente. */
  titulo: string;
  /** Ex.: "Ler resumo → ver vídeo (8 min) → 10 questões". */
  descricao: string;
  /** Motivo em uma linha. */
  motivo: string;
  minutos: number;
  /** Questões planejadas neste passo. */
  questoes: number;
  /** Questões já feitas hoje neste passo. */
  feitas: number;
  estado: EstadoPasso;
  /** Detalhe opcional exibido junto ao selo "Em andamento" no lugar de feitas/questoes. */
  detalheEstado?: string;
  href: string;
  topicoId?: number;
  disciplinaId?: number;
}

export interface Plano {
  fase: Fase;
  diasAteProva: number;
  minutosEfetivos: number;
  energia: Energia;
  metaQuestoes: number;
  passos: Passo[];
  sugestaoSimulado: { minutos: number; texto: string; href: string } | null;
  /** Ritmo de cobertura dos tópicos ainda não vistos. */
  cobertura: RitmoCobertura;
  /** Presente quando a fila de revisão passa de 3 dias de aquecimento. */
  filaRevisao: { vencidas: number; aquecimento: number; diasParaZerar: number } | null;
}

export const NOME_FASE: Record<Fase, string> = {
  cobertura: "Cobertura",
  consolidacao: "Consolidação",
  reta_final: "Reta final",
};

export const DESCRICAO_FASE: Record<Fase, string> = {
  cobertura: "Passe por todo o edital; tópicos ainda não vistos vêm primeiro.",
  consolidacao: "Reforce o que está fraco ou em progresso.",
  reta_final: "Simulados e revisão; no máximo 1 resumo expresso de tópico novo por dia.",
};

export function faseDaProva(diasAteProva: number): Fase {
  if (diasAteProva > 45) return "cobertura";
  if (diasAteProva >= 15) return "consolidacao";
  return "reta_final";
}

export function pesoDisciplina(d: DisciplinaPlanner, todas: DisciplinaPlanner[]): number {
  const total = todas.reduce((s, x) => s + x.questoes_prova, 0) || 50;
  return d.questoes_prova / total;
}

export function fatorFase(fase: Fase, estado: EstadoTopico, energia: Energia, atrasado = false): number {
  let f = 1;
  if (fase === "cobertura") {
    if (estado === "nao_visto") f = 1.5;
  } else if (fase === "consolidacao") {
    if (estado === "nao_visto") f = atrasado ? 1.8 : 1.4;
    else if (estado === "fraco" || estado === "em_progresso") f = 1.5;
    else if (estado === "dominado") f = 0.6;
  } else {
    if (estado === "fraco") f = 1.5;
    else if (estado === "dominado") f = 0.6;
  }
  // Energia baixa: menos atrito, prefere o que já foi visto.
  // Se a cobertura está atrasada, o desconto é menor (×0,8).
  if (energia === "baixa" && estado === "nao_visto") f *= atrasado ? 0.8 : 0.5;
  return f;
}

export function prioridadeTopico(
  t: TopicoPlanner,
  disciplinas: DisciplinaPlanner[],
  fase: Fase,
  energia: Energia,
  atrasado = false,
): number {
  const d = disciplinas.find((x) => x.id === t.disciplina_id);
  const peso = d ? pesoDisciplina(d, disciplinas) : 0;
  return peso * (1 - t.dominio) * fatorFase(fase, t.estado, energia, atrasado);
}

export function minutosEfetivos(input: PlannerInput): { minutos: number; energia: Energia } {
  const energia = input.checkin?.energia ?? "media";
  const base =
    input.checkin?.minutos_hoje ?? input.perfil.minutos_por_dia[diaDaSemana(input.hoje)] ?? 0;
  return { minutos: minutosPlanejados(base, energia), energia };
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

function estadoDoPasso(feitas: number, planejadas: number): EstadoPasso {
  if (feitas <= 0) return "a_fazer";
  return feitas >= planejadas ? "feito" : "em_andamento";
}

function motivoDoTopico(t: TopicoPlanner, d: DisciplinaPlanner | undefined, todas: DisciplinaPlanner[]): string {
  const pct = d ? Math.round(pesoDisciplina(d, todas) * 100) : 0;
  const nome = d ? d.nome.replace(/^Conhecimentos /, "") : "Disciplina";
  const vale = `${nome} vale ${pct}% da prova`;
  switch (t.estado) {
    case "nao_visto":
      return `${vale} e você ainda não viu este tópico`;
    case "fraco":
      return `${vale} e este tópico está fraco`;
    case "em_progresso":
      return `${vale} e este tópico ainda está em progresso`;
    default:
      return `${vale}; manter em dia evita esquecer`;
  }
}

/** Reparte `total` entre `tetos.length` itens, respeitando o teto de cada um. */
function repartir(total: number, tetos: number[]): number[] {
  const out = tetos.map(() => 0);
  let restante = total;
  let ativos = tetos.map((_, i) => i);
  while (restante > 0 && ativos.length > 0) {
    const cota = Math.max(1, Math.floor(restante / ativos.length));
    let deu = 0;
    for (const i of ativos) {
      if (restante - deu <= 0) break;
      const d = Math.min(cota, tetos[i] - out[i], restante - deu);
      out[i] += d;
      deu += d;
    }
    restante -= deu;
    ativos = ativos.filter((i) => out[i] < tetos[i]);
    if (deu === 0) break;
  }
  return out;
}

export function montarPlano(input: PlannerInput): Plano {
  const diasAteProva = diasEntre(input.hoje, input.perfil.data_prova);
  const fase = faseDaProva(diasAteProva);
  const { minutos, energia } = minutosEfetivos(input);
  const meta = input.metaQuestoes ?? metaQuestoesDoDia(minutos);
  const cobertura = ritmoDeCobertura({
    naoVistos: input.topicos.filter((t) => t.estado === "nao_visto").length,
    dataProva: input.perfil.data_prova,
    hoje: input.hoje,
    minutosPorDia: input.perfil.minutos_por_dia,
  });
  const atrasado = cobertura.atrasado;
  let filaRevisao: Plano["filaRevisao"] = null;
  const ativ: AtividadeHoje = input.atividadeHoje ?? {
    total: 0,
    revisao: 0,
    simulado: 0,
    porTopico: [],
    erradasHoje: 0,
    refeitasHoje: 0,
  };

  let nPassos = Math.floor(minutos / MINUTOS_BLOCO);
  let minBloco = energia === "baixa" ? MINUTOS_BLOCO_ENERGIA_BAIXA : MINUTOS_BLOCO;
  if (nPassos < 1) {
    nPassos = 1;
    minBloco = MINUTOS_BLOCO_MINIMO;
  }

  const sugestaoSimulado =
    diaDaSemana(input.hoje) === "dom" && minutos >= MINUTOS_SIMULADO_COMPLETO
      ? {
          minutos: MINUTOS_SIMULADO_COMPLETO,
          texto: "Domingo com tempo de sobra: que tal um simulado completo (3h30), como na prova?",
          href: "/simulado",
        }
      : null;

  type Rascunho = Omit<Passo, "ordem" | "estado"> & { estadoForcado?: EstadoPasso };
  const passos: Passo[] = [];
  const add = ({ estadoForcado, ...p }: Rascunho) =>
    passos.push({ ...p, ordem: passos.length + 1, estado: estadoForcado ?? estadoDoPasso(p.feitas, p.questoes) });

  // Aquecimento: revisão vencida. Conta também as já revisadas hoje, para o passo não sumir ao concluir.
  const totalRevisao = input.revisoesVencidas + ativ.revisao;
  let qAquecimento = 0;
  if (totalRevisao >= MIN_REVISOES_PARA_BLOCO) {
    qAquecimento = Math.min(totalRevisao, Math.max(AQUECIMENTO_MINIMO, Math.ceil(AQUECIMENTO_FRACAO_META * meta)));
    if (totalRevisao > FILA_LIMITE_DIAS * qAquecimento) {
      filaRevisao = {
        vencidas: totalRevisao,
        aquecimento: qAquecimento,
        diasParaZerar: Math.ceil(totalRevisao / qAquecimento),
      };
    }
    add({
      tipo: "aquecimento",
      titulo: `Revisar ${plural(qAquecimento, "questão", "questões")} que você errou`,
      descricao: filaRevisao
        ? `Fila de revisão: ${plural(totalRevisao, "questão", "questões")}; no ritmo de hoje, zera em ~${plural(filaRevisao.diasParaZerar, "dia", "dias")}`
        : `${plural(qAquecimento, "questão", "questões")} de revisão, para aquecer`,
      motivo: "Revisar logo cedo fixa o que escapou; é leve e esquenta a mente",
      minutos: qAquecimento * MINUTOS_POR_QUESTAO,
      questoes: qAquecimento,
      feitas: ativ.revisao,
      href: `/praticar?modo=revisao&n=${Math.max(1, qAquecimento - ativ.revisao)}`,
    });
  }

  // Domingo com tempo: simulado completo no lugar dos passos de estudo.
  if (sugestaoSimulado) {
    add({
      tipo: "simulado",
      titulo: "Simulado completo (3h30)",
      descricao: `${QUESTOES_SIMULADO_COMPLETO} questões nas proporções da prova, sem consultar`,
      motivo: "Treina o ritmo e a resistência da prova de verdade",
      minutos: MINUTOS_SIMULADO_COMPLETO,
      questoes: QUESTOES_SIMULADO_COMPLETO,
      feitas: ativ.simulado,
      href: "/simulado",
    });
    return { fase, diasAteProva, minutosEfetivos: minutos, energia, metaQuestoes: meta, passos, sugestaoSimulado, cobertura, filaRevisao };
  }

  // Reta final: um simulado curto, se sobrar espaço
  let qSimulado = 0;
  if (fase === "reta_final" && nPassos - passos.length >= 2) {
    qSimulado = Math.max(1, Math.floor(minBloco / MINUTOS_POR_QUESTAO));
    add({
      tipo: "simulado",
      titulo: "Simulado curto",
      descricao: `${plural(qSimulado, "questão", "questões")} misturadas, sem consultar`,
      motivo: "Na reta final, treinar sob pressão rende mais que ver matéria nova",
      minutos: qSimulado * MINUTOS_POR_QUESTAO,
      questoes: qSimulado,
      feitas: ativ.simulado,
      href: "/simulado",
    });
  }

  // Fechamento (5 min): refazer o que errou hoje. Só com tempo para 3+ passos.
  const temFechamento = nPassos >= 3;
  const vagasEstudo = Math.max(0, nPassos - passos.length - (temFechamento ? 1 : 0));
  // Reserva fixa de 3 questões na meta do dia para o fechamento não encolher os passos de estudo conforme surgem erros.
  const qReservaFechamento = temFechamento ? 3 : 0;

  // Tópicos: os já trabalhados hoje (questões ou conteúdo) ficam no roteiro (estabilidade); depois, por prioridade.
  const porId = new Map(input.topicos.map((t) => [t.id, t]));
  const feitasPorTopico = new Map(ativ.porTopico.map((p) => [p.topicoId, p.feitas]));
  const conteudoHoje = new Map((ativ.conteudoHoje ?? []).map((c) => [c.topicoId, c]));
  const idsHoje = [...ativ.porTopico.map((p) => p.topicoId), ...(ativ.conteudoHoje ?? []).map((c) => c.topicoId)];
  const jaFeitos = [...new Set(idsHoje)]
    .filter((id) => porId.has(id))
    .slice(0, vagasEstudo)
    .map((id) => ({ topicoId: id, feitas: feitasPorTopico.get(id) ?? 0 }));
  const idsFeitos = new Set(jaFeitos.map((p) => p.topicoId));
  const retaFinal = fase === "reta_final";
  const primeiraVez = new Set(ativ.primeiraVezHoje ?? []);
  const ehNovoHoje = (id: number) => primeiraVez.has(id) || porId.get(id)?.estado === "nao_visto";
  // Reta final: no máximo 1 tópico novo por dia ("Resumo expresso"). Se já houve um hoje, não entra outro.
  const expressoJaHoje = retaFinal && jaFeitos.some((p) => ehNovoHoje(p.topicoId));
  let candidatos = input.topicos.filter((t) => !idsFeitos.has(t.id) && !(retaFinal && t.estado === "nao_visto"));
  const comMaterial = candidatos.filter((t) => t.n_questoes > 0 || t.conteudos.length > 0);
  if (comMaterial.length > 0) candidatos = comMaterial;
  const ordenados = [...candidatos].sort(
    (a, b) =>
      prioridadeTopico(b, input.disciplinas, fase, energia, atrasado) -
        prioridadeTopico(a, input.disciplinas, fase, energia, atrasado) || a.id - b.id,
  );
  // Resumo expresso: o tópico não visto da disciplina de maior peso (prefere os que têm material).
  let expresso: TopicoPlanner | undefined;
  if (retaFinal && !expressoJaHoje && vagasEstudo > jaFeitos.length) {
    const novos = input.topicos.filter((t) => t.estado === "nao_visto" && !idsFeitos.has(t.id));
    const comMat = novos.filter((t) => t.n_questoes > 0 || t.conteudos.length > 0);
    const pesoDe = (t: TopicoPlanner) => {
      const d = input.disciplinas.find((x) => x.id === t.disciplina_id);
      return d ? pesoDisciplina(d, input.disciplinas) : 0;
    };
    expresso = [...(comMat.length > 0 ? comMat : novos)].sort(
      (a, b) => pesoDe(b) - pesoDe(a) || a.dominio - b.dominio || a.id - b.id,
    )[0];
  }
  const idsExpresso = new Set<number>();
  if (retaFinal) {
    for (const p of jaFeitos) if (ehNovoHoje(p.topicoId)) idsExpresso.add(p.topicoId);
    if (expresso) idsExpresso.add(expresso.id);
  }
  const escolhidos: { t: TopicoPlanner; feitas: number }[] = [
    ...jaFeitos.map((p) => ({ t: porId.get(p.topicoId)!, feitas: p.feitas })),
    ...(expresso ? [{ t: expresso, feitas: 0 }] : []),
    ...ordenados
      .slice(0, Math.max(0, vagasEstudo - jaFeitos.length - (expresso ? 1 : 0)))
      .map((t) => ({ t, feitas: 0 })),
  ];

  // Questões dos passos de estudo: o que sobra da meta depois dos outros passos.
  const outras = qAquecimento + qSimulado + qReservaFechamento;
  const paraEstudo = Math.max(meta - outras, escolhidos.length);
  const tetos = escolhidos.map(({ t }) =>
    idsExpresso.has(t.id) ? Math.min(QUESTOES_RESUMO_EXPRESSO, t.n_questoes) : t.n_questoes,
  );
  const qs = repartir(paraEstudo, tetos);

  escolhidos.forEach(({ t, feitas }, i) => {
    const d = input.disciplinas.find((x) => x.id === t.disciplina_id);
    const q = qs[i];
    if (idsExpresso.has(t.id)) {
      const pct = d ? Math.round(pesoDisciplina(d, input.disciplinas) * 100) : 0;
      const temResumo = t.conteudos.some((c) => c.tipo === "teoria");
      const lido = !!conteudoHoje.get(t.id)?.resumo;
      const questoesOk = feitas >= q;
      const estadoExpresso: EstadoPasso | undefined = temResumo
        ? lido && questoesOk
          ? "feito"
          : lido || feitas > 0
            ? "em_andamento"
            : "a_fazer"
        : undefined;
      const detalheExpresso =
        estadoExpresso === "em_andamento" && temResumo && !lido && questoesOk ? "falta resumo" : undefined;
      const restantesE = Math.max(1, q - feitas);
      add({
        tipo: "estudo",
        titulo: `Resumo expresso: ${t.titulo_curto}`,
        descricao: `Ler só "Revisão em 30 segundos" e "Como a Fundatec cobra" (~${MINUTOS_RESUMO_EXPRESSO} min)${q > 0 ? ` → ${plural(q, "questão", "questões")}` : ""}`,
        motivo: `Na reta final, o básico de um tópico que vale ${pct}% da prova é melhor que nada`,
        minutos: MINUTOS_RESUMO_EXPRESSO + q * MINUTOS_POR_QUESTAO,
        questoes: q,
        feitas,
        href:
          temResumo && lido && q > 0 && feitas < q
            ? `/praticar?topico=${t.id}&n=${restantesE}`
            : `/edital/${t.id}?expresso=1${q > 0 ? `&n=${feitas > 0 ? restantesE : q}` : ""}#expresso`,
        topicoId: t.id,
        disciplinaId: t.disciplina_id,
        estadoForcado: estadoExpresso,
        detalheEstado: detalheExpresso,
      });
      return;
    }
    // Trilha do tópico: resumo → vídeo opcional → questões. Só para tópico não visto/fraco (ou já estudado hoje).
    const hojeC = conteudoHoje.get(t.id);
    const precisaTeoria = t.estado === "nao_visto" || t.estado === "fraco" || !!hojeC;
    const video = t.conteudos.find((c) => c.tipo === "video");
    const mostraResumo = precisaTeoria && t.conteudos.some((c) => c.tipo === "teoria");
    const mostraVideo = precisaTeoria && !!video;
    const minVideo = mostraVideo ? Math.max(3, video!.minutos ?? MINUTOS_VIDEO_PADRAO) : 0;
    const minTeoria = (mostraResumo ? MINUTOS_RESUMO : 0) + minVideo;
    const partes: string[] = [];
    if (mostraResumo) partes.push("Ler resumo");
    if (mostraVideo) partes.push(`${mostraResumo ? "vídeo opcional" : "Ver vídeo"} (${minVideo} min)`);
    if (q > 0) partes.push(plural(q, "questão", "questões"));
    const descricao = partes.length > 0 ? partes.join(" → ") : "Revisar o tópico no mapa do edital";

    // Resumo OU vídeo já cumpre a etapa de teoria; o outro fica como apoio opcional.
    const temTeoria = mostraResumo || mostraVideo;
    const teoriaFeita = (mostraResumo && !!hojeC?.resumo) || (mostraVideo && !!hojeC?.video);
    const questoesOk = feitas >= q;
    let estado: EstadoPasso | undefined;
    let detalheEstado: string | undefined;
    if (temTeoria) {
      estado = teoriaFeita && questoesOk ? "feito" : teoriaFeita || feitas > 0 ? "em_andamento" : "a_fazer";
      if (estado === "em_andamento" && !teoriaFeita && questoesOk) {
        detalheEstado =
          mostraResumo && mostraVideo
            ? "falta resumo ou vídeo"
            : mostraResumo
              ? "falta resumo"
              : "falta vídeo";
      }
    }
    const restantes = Math.max(1, q - feitas);
    const nTrilha = q > 0 ? `?n=${feitas > 0 ? restantes : q}` : "";
    add({
      tipo: "estudo",
      titulo: t.titulo_curto,
      descricao,
      motivo: motivoDoTopico(t, d, input.disciplinas),
      minutos: Math.max(5, minTeoria + q * MINUTOS_POR_QUESTAO),
      questoes: q,
      feitas,
      href:
        temTeoria && !teoriaFeita
          ? `/edital/${t.id}${nTrilha}`
          : `/praticar?topico=${t.id}${q > 0 ? `&n=${feitas > 0 ? restantes : q}` : ""}`,
      topicoId: t.id,
      disciplinaId: t.disciplina_id,
      estadoForcado: estado,
      detalheEstado,
    });
  });

  // Banco pequeno por tópico: o que faltar da meta vira "questões mistas" (disciplinas de maior peso primeiro).
  const somaEstudo = qs.reduce((s, x) => s + x, 0);
  const faltaMeta = meta - (outras + somaEstudo);
  if (faltaMeta > 0) {
    const feitasEmEstudo = escolhidos.reduce((s, e, i) => s + Math.min(e.feitas, qs[i]), 0);
    const feitasMisto = Math.max(
      0,
      ativ.total - ativ.revisao - ativ.simulado - feitasEmEstudo - Math.min(ativ.refeitasHoje, qReservaFechamento),
    );
    const nMisto = Math.max(1, faltaMeta - feitasMisto);
    // Fila bola-de-neve: metade das mistas vem da fila de revisão (limitada ao que sobra dela).
    const kRevisao = filaRevisao
      ? Math.min(Math.ceil(nMisto / 2), Math.max(0, filaRevisao.vencidas - qAquecimento))
      : 0;
    add({
      tipo: "misto",
      titulo: "Questões mistas",
      descricao:
        kRevisao > 0
          ? `${plural(faltaMeta, "questão", "questões")}: metade da fila de revisão, metade de várias disciplinas`
          : `${plural(faltaMeta, "questão", "questões")} de várias disciplinas`,
      motivo: "Poucas questões por tópico: completa a meta com as disciplinas de maior peso na prova",
      minutos: faltaMeta * MINUTOS_POR_QUESTAO,
      questoes: faltaMeta,
      feitas: feitasMisto,
      href: `/praticar?modo=misto&n=${nMisto}${kRevisao > 0 ? `&revisao=${kRevisao}` : ""}`,
    });
  }

  if (temFechamento) {
    const e = ativ.erradasHoje;
    const qFechamentoPasso = e > 0 ? e : qReservaFechamento;
    const faltamRefazer = Math.max(0, e - ativ.refeitasHoje);
    const descricaoFechamento =
      e <= 0
        ? "Refaça o que errar hoje, 5 min"
        : faltamRefazer === 0
          ? `${plural(e, "questão errada refeita", "questões erradas refeitas")} hoje`
          : ativ.refeitasHoje > 0
            ? `Faltam ${plural(faltamRefazer, "questão", "questões")} para refazer (${e} no total), ${MINUTOS_FECHAMENTO} min`
            : `${plural(e, "questão", "questões")} para refazer, ${MINUTOS_FECHAMENTO} min`;
    add({
      tipo: "fechamento",
      titulo: "Refazer as que errou hoje",
      descricao: descricaoFechamento,
      motivo: "Errou, refez no mesmo dia: é assim que o erro vira acerto",
      minutos: MINUTOS_FECHAMENTO,
      questoes: qFechamentoPasso,
      feitas: ativ.refeitasHoje,
      href: `/praticar?modo=erradas&n=${Math.max(1, qFechamentoPasso)}`,
    });
    // O fechamento só está "feito" quando havia erro e tudo foi refeito.
    const ultimo = passos[passos.length - 1];
    ultimo.estado =
      e > 0 && ativ.refeitasHoje >= e ? "feito" : ativ.refeitasHoje > 0 ? "em_andamento" : "a_fazer";
  }

  return { fase, diasAteProva, minutosEfetivos: minutos, energia, metaQuestoes: meta, passos, sugestaoSimulado, cobertura, filaRevisao };
}
