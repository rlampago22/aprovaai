// Consultas e gravações puras sobre (CatalogoEstatico, EstadoUsuario) para execução 100% no navegador.
import { ritmoDeCobertura, type RitmoCobertura } from "./cobertura";
import { diasEntre, hojeISO, somarDias } from "./datas";
import {
  calcularDesempenho,
  type ResumoDesempenho,
  type TentativaDesempenho,
} from "./desempenho";
import {
  calcularDominio,
  priorDoNivel,
  type EstadoTopico,
  type TentativaDominio,
} from "./dominio";
import { MINUTOS_RESUMO, MINUTOS_VIDEO_PADRAO } from "./meta";
import { selecionarMisto } from "./misto";
import type { AtividadeHoje, Energia, TopicoPlanner } from "./planner";
import { proximaRevisao, type EstadoRevisao } from "./revisao";
import {
  avaliarSimulado,
  calcularTempoSugeridoMin,
  espalharPorTopico,
  type ConfigSimulado,
  type RespostaAvaliacao,
  type ResultadoSimulado,
  type TipoSimulado,
} from "./simulado";
import {
  agoraLocalISO,
  type Alternativa,
  type CatalogoEstatico,
  type CheckinRow,
  type Conteudo,
  type Disciplina,
  type EstadoUsuario,
  type Perfil,
  type QuestaoBase,
} from "./store";

export type { Alternativa, Conteudo, Disciplina, Perfil };

export interface Questao {
  id: number;
  topico_id: number;
  topico_titulo: string;
  disciplina_nome: string;
  enunciado: string;
  texto_base: string | null;
  alternativas: Alternativa[];
  correta: string;
  fonte: string;
  origem: string;
  dificuldade: number;
  revisada: boolean;
  dificuldades?: number;
}

export interface TopicoInfo extends TopicoPlanner {
  ordem: number;
  texto: string;
  disciplina_nome: string;
  tentativas: number;
}

export interface QuestaoJson {
  disciplina: string;
  topico_ordem: number;
  enunciado: string;
  texto_base?: string | null;
  alternativas: { letra: string; texto: string; explicacao: string }[];
  correta: string;
  dificuldade?: number;
  fonte: string;
  origem: "prova_oficial" | "adaptada" | "gerada_ia" | "manual";
  revisada?: boolean;
}

export function todasQuestoes(catalogo: CatalogoEstatico, estado: EstadoUsuario): QuestaoBase[] {
  return estado.questoesCustom.length > 0
    ? [...catalogo.questoes, ...estado.questoesCustom]
    : catalogo.questoes;
}

export function todosConteudos(catalogo: CatalogoEstatico, estado: EstadoUsuario): Conteudo[] {
  return estado.conteudosCustom.length > 0
    ? [...catalogo.conteudos, ...estado.conteudosCustom]
    : catalogo.conteudos;
}

export function getPerfil(estado: EstadoUsuario): Perfil {
  return estado.perfil;
}

export function salvarPerfil(estado: EstadoUsuario, p: Perfil): EstadoUsuario {
  return {
    ...estado,
    perfil: {
      ...p,
      minutos_por_dia: { ...p.minutos_por_dia },
      nivel_inicial: { ...p.nivel_inicial },
    },
  };
}

export function getDisciplinas(catalogo: CatalogoEstatico): Disciplina[] {
  return catalogo.disciplinas;
}

export function getCheckin(estado: EstadoUsuario, data: string): CheckinRow | undefined {
  return estado.checkins[data];
}

export function salvarCheckin(
  estado: EstadoUsuario,
  data: string,
  energia: Energia,
  minutos: number | null,
): EstadoUsuario {
  return {
    ...estado,
    checkins: {
      ...estado.checkins,
      [data]: {
        data,
        energia,
        minutos_hoje: minutos,
        nota: estado.checkins[data]?.nota ?? null,
      },
    },
  };
}

export function minutosDoConteudo(c: Conteudo): number | undefined {
  if (c.tipo === "video" && c.minutos != null && c.minutos > 0) return c.minutos;
  if (c.tipo === "video" && c.inicio_s != null && c.fim_s != null && c.fim_s > c.inicio_s) {
    return Math.max(1, Math.round((c.fim_s - c.inicio_s) / 60));
  }
  return undefined;
}

export function minutosEstimados(c: Conteudo): number {
  if (c.tipo === "teoria") return MINUTOS_RESUMO;
  if (c.tipo === "video") return minutosDoConteudo(c) ?? MINUTOS_VIDEO_PADRAO;
  return 0;
}

export function getConteudos(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  topicoId?: number,
): Conteudo[] {
  const todos = todosConteudos(catalogo, estado);
  return topicoId ? todos.filter((c) => c.topico_id === topicoId) : todos;
}

export function getTopicos(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  hoje: string = hojeISO(),
): TopicoInfo[] {
  const perfil = estado.perfil;
  const discPorId = new Map(catalogo.disciplinas.map((d) => [d.id, d]));
  const qs = todasQuestoes(catalogo, estado);

  const nQuestoesPorTopico = new Map<number, number>();
  const topicoPorQuestao = new Map<number, number>();
  for (const q of qs) {
    nQuestoesPorTopico.set(q.topico_id, (nQuestoesPorTopico.get(q.topico_id) ?? 0) + 1);
    topicoPorQuestao.set(q.id, q.topico_id);
  }

  const porTopico = new Map<number, TentativaDominio[]>();
  for (const t of estado.tentativas) {
    const tid = topicoPorQuestao.get(t.questao_id);
    if (tid == null) continue;
    let l = porTopico.get(tid);
    if (!l) {
      l = [];
      porTopico.set(tid, l);
    }
    l.push({ acertou: t.acertou, chutou: t.chutou, criada_em: t.criada_em });
  }

  const conteudos = todosConteudos(catalogo, estado);
  const conteudosPorTopico = new Map<number, { tipo: Conteudo["tipo"]; minutos?: number }[]>();
  for (const c of conteudos) {
    let l = conteudosPorTopico.get(c.topico_id);
    if (!l) {
      l = [];
      conteudosPorTopico.set(c.topico_id, l);
    }
    l.push({ tipo: c.tipo, minutos: minutosDoConteudo(c) });
  }

  return catalogo.topicos.map((t) => {
    const prior = priorDoNivel(perfil.nivel_inicial[String(t.disciplina_id)]);
    const r = calcularDominio(porTopico.get(t.id) ?? [], hoje, prior);
    return {
      id: t.id,
      disciplina_id: t.disciplina_id,
      ordem: t.ordem,
      texto: t.texto,
      titulo_curto: t.titulo_curto,
      disciplina_nome: discPorId.get(t.disciplina_id)?.nome ?? "",
      n_questoes: nQuestoesPorTopico.get(t.id) ?? 0,
      dominio: r.dominio,
      estado: r.estado as EstadoTopico,
      tentativas: r.tentativas,
      conteudos: conteudosPorTopico.get(t.id) ?? [],
    };
  });
}

export function contarRevisoesVencidas(estado: EstadoUsuario, hoje: string): number {
  let n = 0;
  for (const r of Object.values(estado.revisoes)) {
    if (r.proxima_em <= hoje) n++;
  }
  return n;
}

export function getConstancia(
  estado: EstadoUsuario,
  hoje: string,
): { dias: number; ontemEmBranco: boolean; jaEstudou: boolean } {
  const set = new Set(estado.tentativas.map((t) => t.criada_em.slice(0, 10)));
  let dias = 0;
  for (let i = 0; i < 7; i++) if (set.has(somarDias(hoje, -i))) dias++;
  const ontem = somarDias(hoje, -1);
  return { dias, ontemEmBranco: !set.has(ontem), jaEstudou: set.size > 0 };
}

export interface FiltroQuestoes {
  topico?: number;
  disciplina?: number;
  modo?: "revisao" | "erradas" | "dificuldade" | "misto";
  n?: number;
  revisao?: number;
}

function embaralhar<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buscarQuestoes(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  f: FiltroQuestoes,
  hoje: string = hojeISO(),
): Questao[] {
  const topicoPorId = new Map(catalogo.topicos.map((t) => [t.id, t]));
  const discPorId = new Map(catalogo.disciplinas.map((d) => [d.id, d]));

  const vistasPorQ = new Map<number, number>();
  const difPorQ = new Map<number, number>();
  const ultimaPorQ = new Map<number, { acertou: boolean; chutou: boolean }>();

  for (const t of estado.tentativas) {
    vistasPorQ.set(t.questao_id, (vistasPorQ.get(t.questao_id) ?? 0) + 1);
    if (!t.acertou || t.chutou) {
      difPorQ.set(t.questao_id, (difPorQ.get(t.questao_id) ?? 0) + 1);
    }
    ultimaPorQ.set(t.questao_id, { acertou: t.acertou, chutou: t.chutou });
  }

  const enriquecer = (q: QuestaoBase): Questao & { disciplina_id: number; peso: number } => {
    const top = topicoPorId.get(q.topico_id);
    const disc = top ? discPorId.get(top.disciplina_id) : undefined;
    return {
      ...q,
      topico_titulo: top?.titulo_curto ?? "",
      disciplina_nome: disc?.nome ?? "",
      disciplina_id: top?.disciplina_id ?? 0,
      peso: disc?.questoes_prova ?? 1,
      dificuldades: difPorQ.get(q.id) ?? 0,
    };
  };

  const limpar = (r: Questao & { disciplina_id: number; peso: number }): Questao => {
    const { disciplina_id, peso, ...resto } = r;
    void disciplina_id;
    void peso;
    return resto;
  };

  const todas = todasQuestoes(catalogo, estado).map(enriquecer);

  if (f.modo === "misto") {
    const embaralhadas = embaralhar(todas).sort(
      (a, b) => (vistasPorQ.get(a.id) ?? 0) - (vistasPorQ.get(b.id) ?? 0),
    );
    const grupos = new Map<string, { peso: number; itens: typeof embaralhadas }>();
    for (const r of embaralhadas) {
      let g = grupos.get(r.disciplina_nome);
      if (!g) {
        g = { peso: r.peso, itens: [] };
        grupos.set(r.disciplina_nome, g);
      }
      g.itens.push(r);
    }
    const total = f.n && f.n > 0 ? Math.floor(f.n) : 10;
    const k = Math.min(total, Math.max(0, Math.floor(f.revisao ?? 0)));
    const doRevisao: typeof embaralhadas = [];
    if (k > 0) {
      const vencidas = embaralhar(
        Object.values(estado.revisoes).filter((r) => r.proxima_em <= hoje),
      ).sort((a, b) => a.proxima_em.localeCompare(b.proxima_em));
      const porQuestao = new Map(embaralhadas.map((r) => [r.id, r]));
      for (const v of vencidas) {
        const r = porQuestao.get(v.questao_id);
        if (r) doRevisao.push(r);
        if (doRevisao.length >= k) break;
      }
    }
    const idsRevisao = new Set(doRevisao.map((r) => r.id));
    if (idsRevisao.size > 0) {
      for (const g of grupos.values()) g.itens = g.itens.filter((r) => !idsRevisao.has(r.id));
    }
    const escolhidas = [
      ...doRevisao,
      ...selecionarMisto([...grupos.values()], total - doRevisao.length),
    ];
    return embaralhar(escolhidas).map(limpar);
  }

  let lista = todas;
  if (f.topico) lista = lista.filter((q) => q.topico_id === f.topico);
  if (f.disciplina) lista = lista.filter((q) => q.disciplina_id === f.disciplina);

  if (f.modo === "revisao") {
    lista = lista.filter((q) => {
      const rev = estado.revisoes[q.id];
      return rev && rev.proxima_em <= hoje;
    });
    lista = embaralhar(lista).sort((a, b) =>
      (estado.revisoes[a.id]?.proxima_em ?? "").localeCompare(estado.revisoes[b.id]?.proxima_em ?? ""),
    );
  } else if (f.modo === "erradas") {
    lista = embaralhar(
      lista.filter((q) => {
        const u = ultimaPorQ.get(q.id);
        return u != null && (!u.acertou || u.chutou);
      }),
    );
  } else if (f.modo === "dificuldade") {
    lista = embaralhar(lista.filter((q) => (difPorQ.get(q.id) ?? 0) > 0)).sort(
      (a, b) => (difPorQ.get(b.id) ?? 0) - (difPorQ.get(a.id) ?? 0),
    );
  } else {
    lista = embaralhar(lista).sort((a, b) => (vistasPorQ.get(a.id) ?? 0) - (vistasPorQ.get(b.id) ?? 0));
  }

  if (f.n && f.n > 0) lista = lista.slice(0, Math.floor(f.n));
  return lista.map(limpar);
}

export function registrarTentativa(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  args: {
    questaoId: number;
    resposta: string;
    chutou: boolean;
    tempoMs: number | null;
    origem: "pratica" | "revisao";
    hoje?: string;
    criadaEm?: string;
  },
): { estado: EstadoUsuario; acertou: boolean; correta: string } {
  const q = todasQuestoes(catalogo, estado).find((x) => x.id === args.questaoId);
  if (!q) throw new Error("Questão não encontrada");
  const acertou = q.correta === args.resposta;
  const hoje = args.hoje ?? hojeISO();
  const criada_em = args.criadaEm ?? agoraLocalISO();

  const errouHoje = estado.tentativas.some(
    (t) =>
      t.questao_id === args.questaoId &&
      t.criada_em.slice(0, 10) === hoje &&
      (!t.acertou || t.chutou),
  );

  const novaTentativa = {
    id: estado.nextIds.tentativa,
    questao_id: args.questaoId,
    resposta: args.resposta,
    acertou,
    chutou: args.chutou,
    tempo_ms: args.tempoMs,
    origem: args.origem,
    simulado_id: null,
    criada_em,
  };

  const ant = estado.revisoes[args.questaoId];
  const antEstado: EstadoRevisao | null = ant
    ? { intervalo_dias: ant.intervalo_dias, facilidade: ant.facilidade }
    : null;
  const novaRev = proximaRevisao(antEstado, acertou, args.chutou, hoje, ant?.proxima_em, errouHoje);

  const novoEstado: EstadoUsuario = {
    ...estado,
    tentativas: [...estado.tentativas, novaTentativa],
    revisoes: {
      ...estado.revisoes,
      [args.questaoId]: {
        questao_id: args.questaoId,
        proxima_em: novaRev.proxima_em,
        intervalo_dias: novaRev.intervalo_dias,
        facilidade: novaRev.facilidade,
      },
    },
    nextIds: {
      ...estado.nextIds,
      tentativa: estado.nextIds.tentativa + 1,
    },
  };

  return { estado: novoEstado, acertou, correta: q.correta };
}

export function adicionarConteudo(
  estado: EstadoUsuario,
  c: Omit<Conteudo, "id" | "canal" | "minutos" | "chave">,
): EstadoUsuario {
  const novo: Conteudo = {
    ...c,
    id: estado.nextIds.conteudo,
    canal: null,
    minutos: null,
    chave: null,
  };
  return {
    ...estado,
    conteudosCustom: [...estado.conteudosCustom, novo],
    nextIds: {
      ...estado.nextIds,
      conteudo: estado.nextIds.conteudo + 1,
    },
  };
}

export function removerConteudo(estado: EstadoUsuario, id: number): EstadoUsuario {
  return {
    ...estado,
    conteudosCustom: estado.conteudosCustom.filter((c) => c.id !== id),
    estudos: estado.estudos.filter((e) => e.conteudo_id !== id),
  };
}

export function getEstudos(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  topicoId: number,
): Record<number, { feitoEm: string; minutos: number }> {
  const idsTopico = new Set(
    todosConteudos(catalogo, estado)
      .filter((c) => c.topico_id === topicoId)
      .map((c) => c.id),
  );
  const res: Record<number, { feitoEm: string; minutos: number }> = {};
  for (const e of estado.estudos) {
    if (!idsTopico.has(e.conteudo_id)) continue;
    res[e.conteudo_id] = { feitoEm: e.feito_em, minutos: e.minutos };
  }
  return res;
}

export function alternarEstudo(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  conteudoId: number,
  minutosReais?: number | null,
  feitoEm?: string,
): { estado: EstadoUsuario; marcado: boolean } {
  const c = todosConteudos(catalogo, estado).find((x) => x.id === conteudoId);
  if (!c || c.tipo === "fonte") throw new Error("Conteúdo não encontrado");

  const ja = estado.estudos.some((e) => e.conteudo_id === conteudoId);
  if (ja) {
    return {
      estado: {
        ...estado,
        estudos: estado.estudos.filter((e) => e.conteudo_id !== conteudoId),
      },
      marcado: false,
    };
  }

  const minutos =
    minutosReais != null && Number.isFinite(minutosReais) && minutosReais > 0
      ? Math.min(180, Math.max(1, Math.round(minutosReais)))
      : minutosEstimados(c);

  return {
    estado: {
      ...estado,
      estudos: [
        ...estado.estudos,
        {
          id: estado.nextIds.estudo,
          conteudo_id: conteudoId,
          feito_em: feitoEm ?? agoraLocalISO(),
          minutos,
        },
      ],
      nextIds: {
        ...estado.nextIds,
        estudo: estado.nextIds.estudo + 1,
      },
    },
    marcado: true,
  };
}

export function getPrimeiroDiaEstudo(estado: EstadoUsuario): string | null {
  let min: string | null = null;
  for (const t of estado.tentativas) {
    const d = t.criada_em.slice(0, 10);
    if (!min || d < min) min = d;
  }
  for (const e of estado.estudos) {
    const d = e.feito_em.slice(0, 10);
    if (!min || d < min) min = d;
  }
  return min;
}

export function getFeitoPorDia(estado: EstadoUsuario, de: string, ate: string): Record<string, number> {
  const res: Record<string, number> = {};
  for (const t of estado.tentativas) {
    const d = t.criada_em.slice(0, 10);
    if (d >= de && d <= ate) res[d] = (res[d] ?? 0) + 1;
  }
  return res;
}

export function getAtividadeHoje(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  hoje: string,
): AtividadeHoje & { minutosEstudados: number } {
  const topicoPorQ = new Map(todasQuestoes(catalogo, estado).map((q) => [q.id, q.topico_id]));
  const conteudoPorId = new Map(todosConteudos(catalogo, estado).map((c) => [c.id, c]));

  let total = 0;
  let revisao = 0;
  let simulado = 0;
  let ms = 0;

  const porTopicoMap = new Map<number, number>();
  const ordemTopicos: number[] = [];
  const erradasSet = new Set<number>();
  const refeitasSet = new Set<number>();
  const topicosAntesHoje = new Set<number>();

  for (const t of estado.tentativas) {
    const d = t.criada_em.slice(0, 10);
    const tid = topicoPorQ.get(t.questao_id);
    if (d < hoje) {
      if (tid != null) topicosAntesHoje.add(tid);
      continue;
    }
    if (d !== hoje) continue;

    total++;
    if (t.origem === "revisao") revisao++;
    if (t.origem === "simulado") simulado++;
    if (t.tempo_ms != null) ms += t.tempo_ms;

    if (tid != null) {
      if (!porTopicoMap.has(tid)) ordemTopicos.push(tid);
      porTopicoMap.set(tid, (porTopicoMap.get(tid) ?? 0) + 1);
    }

    if (erradasSet.has(t.questao_id)) {
      refeitasSet.add(t.questao_id);
    }
    if (!t.acertou || t.chutou) {
      erradasSet.add(t.questao_id);
    }
  }

  const porTopico = ordemTopicos.map((topicoId) => ({
    topicoId,
    feitas: porTopicoMap.get(topicoId) ?? 0,
  }));

  const conteudoHoje: { topicoId: number; resumo: boolean; video: boolean }[] = [];
  let minutosConteudo = 0;
  for (const e of estado.estudos) {
    if (e.feito_em.slice(0, 10) !== hoje) continue;
    const c = conteudoPorId.get(e.conteudo_id);
    if (!c) continue;
    minutosConteudo += e.minutos;
    let r = conteudoHoje.find((x) => x.topicoId === c.topico_id);
    if (!r) {
      r = { topicoId: c.topico_id, resumo: false, video: false };
      conteudoHoje.push(r);
    }
    if (c.tipo === "teoria") r.resumo = true;
    else if (c.tipo === "video") r.video = true;
  }

  const idsHoje = [...new Set([...ordemTopicos, ...conteudoHoje.map((c) => c.topicoId)])];
  const primeiraVezHoje = idsHoje.filter((id) => !topicosAntesHoje.has(id));

  return {
    total,
    primeiraVezHoje,
    revisao,
    simulado,
    porTopico,
    erradasHoje: erradasSet.size,
    refeitasHoje: refeitasSet.size,
    conteudoHoje,
    minutosEstudados: Math.round(ms / 60000) + minutosConteudo,
  };
}

export interface DadosDesempenho extends ResumoDesempenho {
  hoje: string;
  perfil: Perfil;
  cobertura: RitmoCobertura;
  revisoesVencidasTotal: number;
}

export function getDesempenho(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  hoje: string = hojeISO(),
): DadosDesempenho {
  const perfil = estado.perfil;
  const disciplinas = catalogo.disciplinas;
  const topicos = getTopicos(catalogo, estado, hoje);
  const constancia = getConstancia(estado, hoje);

  const topicoPorId = new Map(catalogo.topicos.map((t) => [t.id, t]));
  const topicoPorQ = new Map(todasQuestoes(catalogo, estado).map((q) => [q.id, q.topico_id]));

  const tentativas: TentativaDesempenho[] = [];
  for (const t of estado.tentativas) {
    const tid = topicoPorQ.get(t.questao_id);
    if (tid == null) continue;
    const top = topicoPorId.get(tid);
    if (!top) continue;
    tentativas.push({
      topico_id: tid,
      disciplina_id: top.disciplina_id,
      acertou: t.acertou,
      chutou: t.chutou,
      tempo_ms: t.tempo_ms,
      criada_em: t.criada_em,
    });
  }

  const minutosConteudoTotal = estado.estudos.reduce((s, e) => s + e.minutos, 0);
  const datasEstudoConteudo = [...new Set(estado.estudos.map((e) => e.feito_em.slice(0, 10)))];

  const revisoesVencidasPorTopico: Record<number, number> = {};
  let revisoesVencidasTotal = 0;
  for (const r of Object.values(estado.revisoes)) {
    if (r.proxima_em > hoje) continue;
    const tid = topicoPorQ.get(r.questao_id);
    if (tid == null) continue;
    revisoesVencidasPorTopico[tid] = (revisoesVencidasPorTopico[tid] ?? 0) + 1;
    revisoesVencidasTotal++;
  }

  const naoVistos = topicos.filter((t) => t.estado === "nao_visto").length;
  const cobertura = ritmoDeCobertura({
    naoVistos,
    dataProva: perfil.data_prova,
    hoje,
    minutosPorDia: perfil.minutos_por_dia,
  });

  const desempenho = calcularDesempenho({
    hoje,
    disciplinas,
    topicos,
    tentativas,
    notaAlvo: perfil.nota_alvo,
    minutosConteudoTotal,
    diasEstudados7: constancia.dias,
    datasEstudoConteudo,
    revisoesVencidasPorTopico,
  });

  return {
    hoje,
    perfil,
    cobertura,
    revisoesVencidasTotal,
    ...desempenho,
  };
}

export interface QuestaoSimulado extends Questao {
  disciplina_id: number;
}

export interface SimuladoResumoLista {
  id: number;
  tipo: TipoSimulado;
  titulo: string;
  totalQuestoes: number;
  tempoLimiteMin: number;
  iniciado_em: string;
  finalizado_em: string | null;
  nota: number | null;
  acertos: number;
  respondidas: number;
}

export interface SimuladoDetalhe {
  id: number;
  tipo: TipoSimulado;
  config: ConfigSimulado;
  iniciado_em: string;
  finalizado_em: string | null;
  nota: number | null;
  questoes: QuestaoSimulado[];
  respostas: Record<number, { resposta: string; acertou: boolean; chutou: boolean; tempo_ms: number | null }>;
  resultado: ResultadoSimulado | null;
}

export type CriarSimuladoInput =
  | { tipo: "completo" }
  | { tipo: "disciplina"; disciplinaId: number; n?: number }
  | { tipo: "topicos"; topicoIds: number[]; n?: number }
  | { tipo: "periodo"; dias: number; n?: number };

export function contarErradasNoPeriodo(
  estado: EstadoUsuario,
  dias: number,
  hoje: string = hojeISO(),
): number {
  const desde = somarDias(hoje, -(Math.max(1, Math.floor(dias)) - 1));
  const ids = new Set<number>();
  for (const t of estado.tentativas) {
    if ((!t.acertou || t.chutou) && t.criada_em.slice(0, 10) >= desde) {
      ids.add(t.questao_id);
    }
  }
  return ids.size;
}

export function criarSimulado(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  input: CriarSimuladoInput,
  hoje: string = hojeISO(),
): { estado: EstadoUsuario; id: number; totalQuestoes: number } | null {
  const disciplinas = catalogo.disciplinas;
  const topicoPorId = new Map(catalogo.topicos.map((t) => [t.id, t]));
  const qs = todasQuestoes(catalogo, estado);

  const vistasPorQ = new Map<number, number>();
  for (const t of estado.tentativas) {
    vistasPorQ.set(t.questao_id, (vistasPorQ.get(t.questao_id) ?? 0) + 1);
  }

  const ordenarMenosVistas = (lista: QuestaoBase[]) =>
    embaralhar(lista)
      .sort((a, b) => (vistasPorQ.get(a.id) ?? 0) - (vistasPorQ.get(b.id) ?? 0))
      .map((q) => ({ id: q.id, topico_id: q.topico_id }));

  let questaoIds: number[] = [];
  let titulo = "";
  let extra: Partial<ConfigSimulado> = {};

  if (input.tipo === "completo") {
    for (const d of disciplinas) {
      const cand = ordenarMenosVistas(qs.filter((q) => topicoPorId.get(q.topico_id)?.disciplina_id === d.id));
      questaoIds.push(...espalharPorTopico(cand, d.questoes_prova));
    }
    titulo = `Simulado completo (${questaoIds.length} questões)`;
  } else if (input.tipo === "disciplina") {
    const disc = disciplinas.find((d) => d.id === input.disciplinaId);
    if (!disc) return null;
    const limite = Math.min(50, Math.max(5, Math.floor(input.n ?? 15)));
    const cand = ordenarMenosVistas(qs.filter((q) => topicoPorId.get(q.topico_id)?.disciplina_id === disc.id));
    questaoIds = espalharPorTopico(cand, limite);
    titulo = `${disc.nome} (${questaoIds.length} questões)`;
    extra = { disciplinaId: disc.id };
  } else if (input.tipo === "topicos") {
    const ids = [...new Set(input.topicoIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (ids.length === 0) return null;
    const idSet = new Set(ids);
    const limite = Math.min(50, Math.max(5, Math.floor(input.n ?? 15)));
    const cand = ordenarMenosVistas(qs.filter((q) => idSet.has(q.topico_id)));
    questaoIds = espalharPorTopico(cand, limite);
    titulo =
      ids.length === 1
        ? `1 tópico escolhido (${questaoIds.length} questões)`
        : `${ids.length} tópicos escolhidos (${questaoIds.length} questões)`;
    extra = { topicoIds: ids };
  } else {
    const dias = Math.min(90, Math.max(1, Math.floor(input.dias || 7)));
    const limite = Math.min(50, Math.max(5, Math.floor(input.n ?? 20)));
    const desde = somarDias(hoje, -(dias - 1));
    const ultimoErroPorQ = new Map<number, number>();
    for (const t of estado.tentativas) {
      if ((!t.acertou || t.chutou) && t.criada_em.slice(0, 10) >= desde) {
        const ant = ultimoErroPorQ.get(t.questao_id) ?? 0;
        if (t.id > ant) ultimoErroPorQ.set(t.questao_id, t.id);
      }
    }
    const qSet = new Set(qs.map((q) => q.id));
    questaoIds = embaralhar([...ultimoErroPorQ.entries()].filter(([qid]) => qSet.has(qid)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([qid]) => qid);
    titulo = `Erros dos últimos ${dias} dias (${questaoIds.length} ${questaoIds.length === 1 ? "questão" : "questões"})`;
    extra = { diasErros: dias };
  }

  if (questaoIds.length === 0) return null;

  const config: ConfigSimulado = {
    titulo,
    questaoIds,
    tempoLimiteMin: calcularTempoSugeridoMin(input.tipo, questaoIds.length),
    ...extra,
  };
  const id = estado.nextIds.simulado;
  const novoSimulado = {
    id,
    tipo: input.tipo,
    config,
    iniciado_em: agoraLocalISO(),
    finalizado_em: null,
    nota: null,
  };

  return {
    estado: {
      ...estado,
      simulados: [...estado.simulados, novoSimulado],
      nextIds: {
        ...estado.nextIds,
        simulado: id + 1,
      },
    },
    id,
    totalQuestoes: questaoIds.length,
  };
}

export function getSimulado(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  id: number,
): SimuladoDetalhe | null {
  const row = estado.simulados.find((s) => s.id === id);
  if (!row) return null;

  const topicoPorId = new Map(catalogo.topicos.map((t) => [t.id, t]));
  const discPorId = new Map(catalogo.disciplinas.map((d) => [d.id, d]));
  const qPorId = new Map(todasQuestoes(catalogo, estado).map((q) => [q.id, q]));

  const questoes: QuestaoSimulado[] = [];
  for (const qid of row.config.questaoIds ?? []) {
    const q = qPorId.get(qid);
    if (!q) continue;
    const top = topicoPorId.get(q.topico_id);
    const disc = top ? discPorId.get(top.disciplina_id) : undefined;
    questoes.push({
      ...q,
      disciplina_id: top?.disciplina_id ?? 0,
      topico_titulo: top?.titulo_curto ?? "",
      disciplina_nome: disc?.nome ?? "",
    });
  }

  const respostas: SimuladoDetalhe["respostas"] = {};
  const respostasAval: Record<number, RespostaAvaliacao> = {};
  for (const t of estado.tentativas) {
    if (t.simulado_id !== id) continue;
    respostas[t.questao_id] = {
      resposta: t.resposta,
      acertou: t.acertou,
      chutou: t.chutou,
      tempo_ms: t.tempo_ms,
    };
    respostasAval[t.questao_id] = { resposta: t.resposta, chutou: t.chutou };
  }

  const resultado = row.finalizado_em
    ? avaliarSimulado({
        tipo: row.tipo,
        disciplinas: catalogo.disciplinas,
        questoes,
        respostas: respostasAval,
        notaAlvo: estado.perfil.nota_alvo,
      })
    : null;

  return {
    id: row.id,
    tipo: row.tipo,
    config: row.config,
    iniciado_em: row.iniciado_em,
    finalizado_em: row.finalizado_em,
    nota: row.nota,
    questoes,
    respostas,
    resultado,
  };
}

export function finalizarSimulado(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  args: {
    simuladoId: number;
    respostas: { questaoId: number; resposta: string | null; chutou: boolean; tempoMs: number | null }[];
    hoje?: string;
  },
): { estado: EstadoUsuario; nota: number } {
  const sim = getSimulado(catalogo, estado, args.simuladoId);
  if (!sim) throw new Error("Simulado não encontrado");
  if (sim.finalizado_em) return { estado, nota: sim.nota ?? 0 };

  const hoje = args.hoje ?? hojeISO();
  const agora = agoraLocalISO();
  const porQuestao = new Map(sim.questoes.map((q) => [q.id, q]));
  const respAval: Record<number, RespostaAvaliacao> = {};
  const validas = new Set(["A", "B", "C", "D"]);

  for (const r of args.respostas) {
    if (!porQuestao.has(r.questaoId)) continue;
    const letra = r.resposta && validas.has(r.resposta) ? r.resposta : null;
    respAval[r.questaoId] = { resposta: letra, chutou: !!r.chutou && letra != null };
  }

  const resultado = avaliarSimulado({
    tipo: sim.tipo,
    disciplinas: catalogo.disciplinas,
    questoes: sim.questoes,
    respostas: respAval,
    notaAlvo: estado.perfil.nota_alvo,
  });

  const novasTentativas = [...estado.tentativas];
  const novasRevisoes = { ...estado.revisoes };
  let proxTentId = estado.nextIds.tentativa;

  for (const r of args.respostas) {
    const q = porQuestao.get(r.questaoId);
    if (!q || !r.resposta || !validas.has(r.resposta)) continue;
    const acertou = q.correta === r.resposta;
    const chutou = !!r.chutou;
    const errouHoje = novasTentativas.some(
      (t) =>
        t.questao_id === q.id &&
        t.criada_em.slice(0, 10) === hoje &&
        (!t.acertou || t.chutou),
    );
    novasTentativas.push({
      id: proxTentId++,
      questao_id: q.id,
      resposta: r.resposta,
      acertou,
      chutou,
      tempo_ms: r.tempoMs,
      origem: "simulado",
      simulado_id: sim.id,
      criada_em: agora,
    });
    const ant = novasRevisoes[q.id];
    const antEstado: EstadoRevisao | null = ant
      ? { intervalo_dias: ant.intervalo_dias, facilidade: ant.facilidade }
      : null;
    const nova = proximaRevisao(antEstado, acertou, chutou, hoje, ant?.proxima_em, errouHoje);
    novasRevisoes[q.id] = {
      questao_id: q.id,
      proxima_em: nova.proxima_em,
      intervalo_dias: nova.intervalo_dias,
      facilidade: nova.facilidade,
    };
  }

  const novosSimulados = estado.simulados.map((s) =>
    s.id === sim.id ? { ...s, finalizado_em: agora, nota: resultado.nota } : s,
  );

  return {
    estado: {
      ...estado,
      tentativas: novasTentativas,
      revisoes: novasRevisoes,
      simulados: novosSimulados,
      nextIds: {
        ...estado.nextIds,
        tentativa: proxTentId,
      },
    },
    nota: resultado.nota,
  };
}

export function descartarSimulado(estado: EstadoUsuario, id: number): EstadoUsuario {
  const temTentativas = estado.tentativas.some((t) => t.simulado_id === id);
  if (temTentativas) return estado;
  return {
    ...estado,
    simulados: estado.simulados.filter((s) => !(s.id === id && s.finalizado_em == null)),
  };
}

export function listarSimulados(estado: EstadoUsuario, limite: number = 20): SimuladoResumoLista[] {
  const stats = new Map<number, { respondidas: number; acertos: number }>();
  for (const t of estado.tentativas) {
    if (t.simulado_id == null) continue;
    const cur = stats.get(t.simulado_id) ?? { respondidas: 0, acertos: 0 };
    cur.respondidas++;
    if (t.acertou) cur.acertos++;
    stats.set(t.simulado_id, cur);
  }

  return [...estado.simulados]
    .sort((a, b) => b.id - a.id)
    .slice(0, limite)
    .map((r) => {
      const st = stats.get(r.id) ?? { respondidas: 0, acertos: 0 };
      return {
        id: r.id,
        tipo: r.tipo,
        titulo: r.config.titulo ?? `Simulado #${r.id}`,
        totalQuestoes: r.config.questaoIds?.length ?? 0,
        tempoLimiteMin: r.config.tempoLimiteMin ?? 0,
        iniciado_em: r.iniciado_em,
        finalizado_em: r.finalizado_em,
        nota: r.nota,
        acertos: st.acertos,
        respondidas: st.respondidas,
      };
    });
}

export type ResultadoImportacaoJson =
  | { ok: false; erros: string[] }
  | {
      ok: true;
      modo: "previa" | "importado";
      totalArquivo: number;
      novas: number;
      duplicadas: number;
      totalBanco: number;
      porDisciplina: { disciplina: string; quantidade: number }[];
    };

function assinaturaAlternativas(alts: { letra?: string; texto?: string }[]): string {
  return alts.map((a) => `${a?.letra ?? ""}:${(a?.texto ?? "").trim()}`).join("\n");
}

function chaveQuestao(
  topicoId: number,
  enunciado: string,
  textoBase: string | null | undefined,
  alts: { letra?: string; texto?: string }[],
): string {
  return `${topicoId}|${enunciado}|${textoBase ?? ""}|${assinaturaAlternativas(alts)}`;
}

export function processarImportacaoJson(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  textoJson: string,
  somenteValidar: boolean,
): { resultado: ResultadoImportacaoJson; estado: EstadoUsuario } {
  const limpo = textoJson.trim();
  if (!limpo) {
    return {
      resultado: { ok: false, erros: ["Cole o conteúdo JSON ou envie um arquivo .json."] },
      estado,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(limpo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro de sintaxe";
    return { resultado: { ok: false, erros: [`JSON inválido: ${msg}`] }, estado };
  }

  if (!Array.isArray(parsed)) {
    return {
      resultado: { ok: false, erros: ["O JSON deve ser uma lista (array) de questões."] },
      estado,
    };
  }

  const discPorNome = new Map(catalogo.disciplinas.map((d) => [d.nome, d.id]));
  const topicoPorChave = new Map(catalogo.topicos.map((t) => [`${t.disciplina_id}|${t.ordem}`, t.id]));
  const acharTopicoId = (discNome: string, ordem: number): number | undefined => {
    const did = discPorNome.get(discNome);
    if (did == null) return undefined;
    return topicoPorChave.get(`${did}|${ordem}`);
  };

  const erros: string[] = [];
  const origens = ["prova_oficial", "adaptada", "gerada_ia", "manual"];
  const letras = ["A", "B", "C", "D"];
  const vistos = new Set<string>();

  parsed.forEach((item, i) => {
    const q = item as Partial<QuestaoJson> | null;
    const rot = `Questão #${i + 1}`;
    const erro = (msg: string) => erros.push(`${rot}: ${msg}`);
    if (!q || typeof q !== "object") return erro("não é um objeto.");
    const texto = (v: unknown) => typeof v === "string" && v.trim() !== "";
    if (!texto(q.disciplina)) erro("disciplina ausente.");
    if (!Number.isInteger(q.topico_ordem) || (q.topico_ordem as number) < 1) erro("topico_ordem inválido.");
    if (texto(q.disciplina) && Number.isInteger(q.topico_ordem) && !acharTopicoId(q.disciplina as string, q.topico_ordem as number)) {
      erro(`tópico não encontrado (${q.disciplina} #${q.topico_ordem}).`);
    }
    if (!texto(q.enunciado)) erro("enunciado ausente.");
    if (q.texto_base != null && typeof q.texto_base !== "string") erro("texto_base deve ser texto ou null.");
    const alts = q.alternativas;
    if (!Array.isArray(alts) || alts.length !== 4) {
      erro("são necessárias exatamente 4 alternativas.");
    } else {
      alts.forEach((a, j) => {
        if (a?.letra !== letras[j]) erro(`alternativa ${j + 1} deve ter letra ${letras[j]}.`);
        if (!texto(a?.texto)) erro(`alternativa ${letras[j]} sem texto.`);
        if (!texto(a?.explicacao)) erro(`alternativa ${letras[j]} sem explicação.`);
      });
    }
    if (!letras.includes(q.correta as string)) erro("correta deve ser A, B, C ou D.");
    if (q.dificuldade != null && ![1, 2, 3].includes(q.dificuldade)) erro("dificuldade deve ser 1, 2 ou 3.");
    if (!texto(q.fonte)) erro("fonte ausente.");
    if (!origens.includes(q.origem as string)) erro("origem inválida.");
    if (texto(q.disciplina) && texto(q.enunciado)) {
      const sigAlts = Array.isArray(alts) ? assinaturaAlternativas(alts) : "";
      const chave = `${q.disciplina}|${q.topico_ordem}|${q.enunciado}|${q.texto_base ?? ""}|${sigAlts}`;
      if (vistos.has(chave)) erro("questão repetida no mesmo tópico dentro do arquivo.");
      vistos.add(chave);
    }
  });

  if (erros.length > 0) return { resultado: { ok: false, erros }, estado };

  const lista = parsed as QuestaoJson[];
  const contagemDisc = new Map<string, number>();
  for (const q of lista) contagemDisc.set(q.disciplina, (contagemDisc.get(q.disciplina) ?? 0) + 1);
  const porDisciplina = [...contagemDisc.entries()].map(([disciplina, quantidade]) => ({
    disciplina,
    quantidade,
  }));

  const atuais = todasQuestoes(catalogo, estado);
  const chavesAtuais = new Set(atuais.map((q) => chaveQuestao(q.topico_id, q.enunciado, q.texto_base, q.alternativas)));

  let novas = 0;
  let duplicadas = 0;
  const adicionadas: QuestaoBase[] = [];
  let proxId = estado.nextIds.questao;

  for (const q of lista) {
    const tid = acharTopicoId(q.disciplina, q.topico_ordem)!;
    const ch = chaveQuestao(tid, q.enunciado, q.texto_base, q.alternativas);
    if (chavesAtuais.has(ch)) {
      duplicadas++;
    } else {
      novas++;
      chavesAtuais.add(ch);
      if (!somenteValidar) {
        adicionadas.push({
          id: proxId++,
          topico_id: tid,
          enunciado: q.enunciado,
          texto_base: q.texto_base ?? null,
          alternativas: q.alternativas,
          correta: q.correta,
          fonte: q.fonte,
          origem: q.origem,
          dificuldade: q.dificuldade ?? 2,
          revisada: !!q.revisada,
        });
      }
    }
  }

  if (somenteValidar) {
    return {
      resultado: {
        ok: true,
        modo: "previa",
        totalArquivo: lista.length,
        novas,
        duplicadas,
        totalBanco: atuais.length,
        porDisciplina,
      },
      estado,
    };
  }

  const novoEstado: EstadoUsuario =
    adicionadas.length > 0
      ? {
          ...estado,
          questoesCustom: [...estado.questoesCustom, ...adicionadas],
          nextIds: {
            ...estado.nextIds,
            questao: proxId,
          },
        }
      : estado;

  return {
    resultado: {
      ok: true,
      modo: "importado",
      totalArquivo: lista.length,
      novas: adicionadas.length,
      duplicadas,
      totalBanco: atuais.length + adicionadas.length,
      porDisciplina,
    },
    estado: novoEstado,
  };
}

export { diasEntre };
