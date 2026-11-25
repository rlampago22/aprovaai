// Projeção do cronograma completo (de hoje até o dia da prova).
// Função pura: simula dia a dia usando as mesmas regras de fase e prioridade do planner.ts.
import {
  diaDaSemana,
  diasEntre,
  formatarDataCurta,
  somarDias,
  type DiaSemana,
} from "./datas";
import { inicioDaSemana, metaQuestoesDoDia, ORDEM_SEMANA } from "./meta";
import {
  faseDaProva,
  MINUTOS_BLOCO,
  MINUTOS_SIMULADO_COMPLETO,
  montarPlano,
  prioridadeTopico,
  QUESTOES_SIMULADO_COMPLETO,
  type AtividadeHoje,
  type DisciplinaPlanner,
  type Energia,
  type Fase,
  type TopicoPlanner,
} from "./planner";

export type TipoDiaCronograma =
  | "passado"
  | "estudo"
  | "simulado"
  | "reta_final"
  | "folga"
  | "prova";

export interface TopicoPrevistoDia {
  id: number;
  disciplina_id: number;
  disciplina_nome: string;
  ordem: number;
  titulo_curto: string;
  modo: "novo" | "expresso" | "revisao_topico";
}

export interface DiaCronograma {
  data: string;
  dia: DiaSemana;
  rotuloCurto: string; // "23/11"
  ehHoje: boolean;
  fase: Fase;
  tipo: TipoDiaCronograma;
  minutosPlanejados: number;
  metaQuestoes: number;
  feitoQuestoes: number;
  temAquecimento: boolean;
  topicos: TopicoPrevistoDia[];
  resumo: string;
}

export interface SemanaCronograma {
  numero: number; // 1-based a partir da semana atual
  inicio: string;
  fim: string;
  periodo: string; // "23/11 a 29/11"
  ehSemanaAtual: boolean;
  ehSemanaProva: boolean;
  fasePredominante: Fase;
  questoesPrevistas: number;
  minutosPrevistos: number;
  topicosNovosPrevistos: number;
  temSimuladoCompleto: boolean;
  dias: DiaCronograma[];
}

export interface BlocoFaseCronograma {
  fase: Fase;
  inicio: string;
  fim: string;
  dias: number;
  ativa: boolean;
  passada: boolean;
}

export interface ResumoCronograma {
  hoje: string;
  dataProva: string;
  diasAteProva: number;
  faseAtual: Fase;
  fases: BlocoFaseCronograma[];
  totalTopicos: number;
  topicosJaVistos: number;
  topicosNaoVistos: number;
  /** Data prevista para ver o último tópico pela 1ª vez (null se já viu todos ou não couber até a prova). */
  dataConclusaoCobertura: string | null;
  concluiNaCobertura: boolean;
  topicosNaoCobertosAteProva: number;
  simuladosCompletosPrevistos: number;
  minutosSemanaisPerfil: number;
  questoesSemanaisPerfil: number;
  semanas: SemanaCronograma[];
}

export interface TopicoCronogramaInput extends TopicoPlanner {
  ordem: number;
  disciplina_nome: string;
}

export interface EntradaCronograma {
  hoje: string;
  perfil: {
    data_prova: string;
    minutos_por_dia: Partial<Record<DiaSemana, number>>;
  };
  checkinHoje?: { energia: Energia; minutos_hoje: number | null } | null;
  disciplinas: DisciplinaPlanner[];
  topicos: TopicoCronogramaInput[];
  revisoesVencidasHoje: number;
  metaHoje: number;
  atividadeHoje?: AtividadeHoje;
  feitoNaSemanaAtual?: Record<string, number>;
}

/** Limite de segurança para não gerar cronogramas gigantes caso a data da prova esteja anos à frente. */
const MAX_DIAS_PROJETADOS = 365;

function montarBlocosDeFase(hoje: string, dataProva: string): BlocoFaseCronograma[] {
  const diasAteProva = diasEntre(hoje, dataProva);
  const fimCobertura = somarDias(dataProva, -46);
  const iniConsolidacao = somarDias(dataProva, -45);
  const fimConsolidacao = somarDias(dataProva, -15);
  const iniRetaFinal = somarDias(dataProva, -14);
  const vespera = somarDias(dataProva, -1);

  const blocos: BlocoFaseCronograma[] = [];
  const faseAtual = faseDaProva(diasAteProva);

  // Cobertura: vai até prova - 46
  if (hoje <= fimCobertura) {
    blocos.push({
      fase: "cobertura",
      inicio: hoje,
      fim: fimCobertura,
      dias: Math.max(1, diasEntre(hoje, fimCobertura) + 1),
      ativa: faseAtual === "cobertura",
      passada: false,
    });
  } else {
    blocos.push({
      fase: "cobertura",
      inicio: fimCobertura,
      fim: fimCobertura,
      dias: 0,
      ativa: false,
      passada: true,
    });
  }

  // Consolidação: prova - 45 até prova - 15
  if (hoje <= fimConsolidacao) {
    const ini = hoje > iniConsolidacao ? hoje : iniConsolidacao;
    blocos.push({
      fase: "consolidacao",
      inicio: ini,
      fim: fimConsolidacao,
      dias: Math.max(1, diasEntre(ini, fimConsolidacao) + 1),
      ativa: faseAtual === "consolidacao",
      passada: false,
    });
  } else {
    blocos.push({
      fase: "consolidacao",
      inicio: iniConsolidacao,
      fim: fimConsolidacao,
      dias: 0,
      ativa: false,
      passada: true,
    });
  }

  // Reta final: prova - 14 até véspera
  if (hoje <= vespera) {
    const ini = hoje > iniRetaFinal ? hoje : iniRetaFinal;
    blocos.push({
      fase: "reta_final",
      inicio: ini,
      fim: vespera,
      dias: Math.max(1, diasEntre(ini, vespera) + 1),
      ativa: faseAtual === "reta_final",
      passada: false,
    });
  } else {
    blocos.push({
      fase: "reta_final",
      inicio: iniRetaFinal,
      fim: vespera,
      dias: 0,
      ativa: false,
      passada: true,
    });
  }

  return blocos;
}

/** Projeta o cronograma dia a dia e semana a semana de hoje até a prova. */
export function montarCronograma(entrada: EntradaCronograma): ResumoCronograma {
  const {
    hoje,
    perfil,
    checkinHoje = null,
    disciplinas,
    topicos,
    revisoesVencidasHoje,
    metaHoje,
    atividadeHoje,
    feitoNaSemanaAtual = {},
  } = entrada;

  const dataProva = perfil.data_prova;
  const diasAteProva = diasEntre(hoje, dataProva);
  const faseAtual = faseDaProva(diasAteProva);
  const totalTopicos = topicos.length;
  const topicosNaoVistosInicial = topicos.filter((t) => t.estado === "nao_visto").length;
  const topicosJaVistos = totalTopicos - topicosNaoVistosInicial;

  const minutosSemanaisPerfil = ORDEM_SEMANA.reduce(
    (s, d) => s + Math.max(0, perfil.minutos_por_dia[d] ?? 0),
    0,
  );
  const questoesSemanaisPerfil = ORDEM_SEMANA.reduce((s, d) => {
    const m = perfil.minutos_por_dia[d] ?? 0;
    return s + (m > 0 ? metaQuestoesDoDia(m) : 0);
  }, 0);

  const porId = new Map(topicos.map((t) => [t.id, t]));
  const discPorId = new Map(disciplinas.map((d) => [d.id, d]));

  // Cópia mutável apenas para simular a 1ª passagem pelos tópicos ao longo dos dias futuros
  const simulados = topicos.map((t) => ({ ...t }));
  const simPorId = new Map(simulados.map((t) => [t.id, t]));

  // Plano real de hoje (para que "hoje" no cronograma bata 100% com a tela Hoje)
  const planoHoje = montarPlano({
    hoje,
    perfil,
    checkin: checkinHoje,
    disciplinas,
    topicos,
    revisoesVencidas: revisoesVencidasHoje,
    metaQuestoes: metaHoje,
    atividadeHoje,
  });

  const inicioSemanaAtual = inicioDaSemana(hoje);
  const dataLimite =
    diasAteProva > MAX_DIAS_PROJETADOS
      ? somarDias(hoje, MAX_DIAS_PROJETADOS)
      : dataProva >= hoje
        ? dataProva
        : hoje;
  const fimUltimaSemana = somarDias(inicioDaSemana(dataLimite), 6);

  let jaTeveEstudo = topicosJaVistos > 0 || (atividadeHoje?.total ?? 0) > 0;
  let dataConclusaoCobertura: string | null = topicosNaoVistosInicial === 0 ? hoje : null;
  let simuladosCompletosPrevistos = 0;

  const todosDias: DiaCronograma[] = [];
  let cursor = inicioSemanaAtual;

  while (cursor <= fimUltimaSemana) {
    const dia = diaDaSemana(cursor);
    const diasRestantes = diasEntre(cursor, dataProva);
    const fase = faseDaProva(diasRestantes);
    const rotuloCurto = formatarDataCurta(cursor);

    if (cursor < hoje) {
      const minPerfil = Math.max(0, perfil.minutos_por_dia[dia] ?? 0);
      const feito = feitoNaSemanaAtual[cursor] ?? 0;
      const metaBase = minPerfil > 0 ? metaQuestoesDoDia(minPerfil) : 0;
      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: false,
        fase,
        tipo: "passado",
        minutosPlanejados: minPerfil,
        metaQuestoes: metaBase,
        feitoQuestoes: feito,
        temAquecimento: false,
        topicos: [],
        resumo: feito > 0 ? `${feito} ${feito === 1 ? "questão feita" : "questões feitas"}` : "Sem registro",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    if (cursor === dataProva) {
      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: cursor === hoje,
        fase: "reta_final",
        tipo: "prova",
        minutosPlanejados: MINUTOS_SIMULADO_COMPLETO,
        metaQuestoes: QUESTOES_SIMULADO_COMPLETO,
        feitoQuestoes: 0,
        temAquecimento: false,
        topicos: [],
        resumo: "Dia da prova objetiva · 50 questões · 3h30",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    if (cursor > dataProva) {
      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: false,
        fase: "reta_final",
        tipo: "folga",
        minutosPlanejados: 0,
        metaQuestoes: 0,
        feitoQuestoes: 0,
        temAquecimento: false,
        topicos: [],
        resumo: "Pós-prova",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    // Dia de hoje: espelha exatamente os passos do planner de hoje
    if (cursor === hoje) {
      const topicosDia: TopicoPrevistoDia[] = [];
      const ehSimuladoHoje = planoHoje.passos.some((p) => p.tipo === "simulado" && p.minutos >= MINUTOS_SIMULADO_COMPLETO);
      const temAquec = planoHoje.passos.some((p) => p.tipo === "aquecimento");

      if (ehSimuladoHoje) {
        simuladosCompletosPrevistos++;
      } else {
        for (const passo of planoHoje.passos) {
          if (passo.tipo !== "estudo" || !passo.topicoId) continue;
          const orig = porId.get(passo.topicoId);
          if (!orig) continue;
          const ehExpresso = passo.titulo.startsWith("Resumo expresso:");
          const modo: TopicoPrevistoDia["modo"] = ehExpresso
            ? "expresso"
            : orig.estado === "nao_visto"
              ? "novo"
              : "revisao_topico";
          topicosDia.push({
            id: orig.id,
            disciplina_id: orig.disciplina_id,
            disciplina_nome: orig.disciplina_nome,
            ordem: orig.ordem,
            titulo_curto: orig.titulo_curto,
            modo,
          });
          // Marca como visto na simulação para os próximos dias avançarem na fila
          const s = simPorId.get(orig.id);
          if (s && s.estado === "nao_visto") {
            s.estado = "em_progresso";
            s.dominio = 0.6;
          }
        }
      }

      jaTeveEstudo = true;
      if (dataConclusaoCobertura === null && simulados.every((t) => t.estado !== "nao_visto")) {
        dataConclusaoCobertura = cursor;
      }

      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: true,
        fase,
        tipo: ehSimuladoHoje ? "simulado" : fase === "reta_final" ? "reta_final" : "estudo",
        minutosPlanejados: planoHoje.minutosEfetivos,
        metaQuestoes: planoHoje.metaQuestoes,
        feitoQuestoes: atividadeHoje?.total ?? 0,
        temAquecimento: temAquec,
        topicos: topicosDia,
        resumo: ehSimuladoHoje
          ? "Simulado completo (50 questões · 3h30)"
          : topicosDia.length > 0
            ? `${topicosDia.length} ${topicosDia.length === 1 ? "tópico" : "tópicos"} no roteiro de hoje`
            : "Revisão e prática livre",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    // Dias futuros (hoje < cursor < dataProva)
    const minutosDia = Math.max(0, perfil.minutos_por_dia[dia] ?? 0);
    if (minutosDia <= 0) {
      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: false,
        fase,
        tipo: "folga",
        minutosPlanejados: 0,
        metaQuestoes: 0,
        feitoQuestoes: 0,
        temAquecimento: false,
        topicos: [],
        resumo: "Dia de descanso (0 min no perfil)",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    const metaDia = metaQuestoesDoDia(minutosDia);

    // Domingo com >= 3h30 -> Simulado completo (igual ao planner.ts)
    if (dia === "dom" && minutosDia >= MINUTOS_SIMULADO_COMPLETO) {
      simuladosCompletosPrevistos++;
      jaTeveEstudo = true;
      todosDias.push({
        data: cursor,
        dia,
        rotuloCurto,
        ehHoje: false,
        fase,
        tipo: "simulado",
        minutosPlanejados: MINUTOS_SIMULADO_COMPLETO,
        metaQuestoes: QUESTOES_SIMULADO_COMPLETO,
        feitoQuestoes: 0,
        temAquecimento: false,
        topicos: [],
        resumo: "Simulado completo (50 questões · 3h30)",
      });
      cursor = somarDias(cursor, 1);
      continue;
    }

    const nPassos = Math.max(1, Math.floor(minutosDia / MINUTOS_BLOCO));
    const temFechamento = nPassos >= 3;
    const temAquecimento = jaTeveEstudo && nPassos >= 2;
    const temSimuladoCurto = fase === "reta_final" && nPassos - (temAquecimento ? 1 : 0) >= 2;
    const vagasEstudo = Math.max(
      0,
      nPassos - (temAquecimento ? 1 : 0) - (temSimuladoCurto ? 1 : 0) - (temFechamento ? 1 : 0),
    );

    const naoVistosAgora = simulados.filter((t) => t.estado === "nao_visto");
    const topicosDia: TopicoPrevistoDia[] = [];

    if (fase === "reta_final") {
      // Na reta final: no máximo 1 tópico novo por dia em "Resumo expresso" (maior peso da disciplina)
      if (naoVistosAgora.length > 0 && vagasEstudo > 0) {
        const pesoDe = (t: TopicoCronogramaInput) => discPorId.get(t.disciplina_id)?.questoes_prova ?? 0;
        const escolhido = [...naoVistosAgora].sort(
          (a, b) => pesoDe(b) - pesoDe(a) || a.dominio - b.dominio || a.id - b.id,
        )[0];
        if (escolhido) {
          topicosDia.push({
            id: escolhido.id,
            disciplina_id: escolhido.disciplina_id,
            disciplina_nome: escolhido.disciplina_nome,
            ordem: escolhido.ordem,
            titulo_curto: escolhido.titulo_curto,
            modo: "expresso",
          });
          escolhido.estado = "em_progresso";
          escolhido.dominio = 0.6;
        }
      }
    } else if (naoVistosAgora.length > 0 && vagasEstudo > 0) {
      // Cobertura / Consolidação com tópicos ainda não vistos: avança na fila real de prioridade
      const atrasado = fase === "consolidacao";
      const ordenados = [...naoVistosAgora].sort(
        (a, b) =>
          prioridadeTopico(b, disciplinas, fase, "media", atrasado) -
            prioridadeTopico(a, disciplinas, fase, "media", atrasado) || a.id - b.id,
      );
      const pegos = ordenados.slice(0, vagasEstudo);
      for (const t of pegos) {
        topicosDia.push({
          id: t.id,
          disciplina_id: t.disciplina_id,
          disciplina_nome: t.disciplina_nome,
          ordem: t.ordem,
          titulo_curto: t.titulo_curto,
          modo: "novo",
        });
        t.estado = "em_progresso";
        t.dominio = 0.6;
      }
    }

    jaTeveEstudo = true;
    if (dataConclusaoCobertura === null && simulados.every((t) => t.estado !== "nao_visto")) {
      dataConclusaoCobertura = cursor;
    }

    let resumoDia: string;
    if (fase === "reta_final") {
      resumoDia =
        topicosDia.length > 0
          ? "Simulado curto + revisão + 1 resumo expresso"
          : "Simulado curto + revisão dos erros";
    } else if (topicosDia.length > 0) {
      const sobrouVaga = vagasEstudo - topicosDia.length;
      resumoDia =
        sobrouVaga > 0
          ? `${topicosDia.length} ${topicosDia.length === 1 ? "tópico novo" : "tópicos novos"} + reforço e revisão`
          : `${topicosDia.length} ${topicosDia.length === 1 ? "tópico novo" : "tópicos novos"} (resumo, vídeo e questões)`;
    } else {
      resumoDia = "Reforço nos tópicos fracos e em progresso + revisão";
    }

    todosDias.push({
      data: cursor,
      dia,
      rotuloCurto,
      ehHoje: false,
      fase,
      tipo: fase === "reta_final" ? "reta_final" : "estudo",
      minutosPlanejados: minutosDia,
      metaQuestoes: metaDia,
      feitoQuestoes: 0,
      temAquecimento,
      topicos: topicosDia,
      resumo: resumoDia,
    });

    cursor = somarDias(cursor, 1);
  }

  // Agrupa os dias em semanas (blocos de 7 dias, seg a dom)
  const semanas: SemanaCronograma[] = [];
  for (let i = 0; i < todosDias.length; i += 7) {
    const slice = todosDias.slice(i, i + 7);
    if (slice.length === 0) continue;
    const inicio = slice[0].data;
    const fim = slice[slice.length - 1].data;
    const ativos = slice.filter((d) => d.tipo !== "passado" && d.tipo !== "prova" && d.data <= dataProva);
    const contagemFase: Record<Fase, number> = { cobertura: 0, consolidacao: 0, reta_final: 0 };
    for (const d of ativos.length > 0 ? ativos : slice) contagemFase[d.fase]++;
    const fasePredominante: Fase =
      contagemFase.reta_final >= contagemFase.consolidacao && contagemFase.reta_final >= contagemFase.cobertura
        ? "reta_final"
        : contagemFase.consolidacao >= contagemFase.cobertura
          ? "consolidacao"
          : "cobertura";

    semanas.push({
      numero: semanas.length + 1,
      inicio,
      fim,
      periodo: `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`,
      ehSemanaAtual: slice.some((d) => d.ehHoje),
      ehSemanaProva: slice.some((d) => d.tipo === "prova"),
      fasePredominante,
      questoesPrevistas: slice
        .filter((d) => d.tipo !== "passado" && d.tipo !== "prova")
        .reduce((s, d) => s + d.metaQuestoes, 0),
      minutosPrevistos: slice
        .filter((d) => d.tipo !== "passado" && d.tipo !== "prova")
        .reduce((s, d) => s + d.minutosPlanejados, 0),
      topicosNovosPrevistos: slice.reduce(
        (s, d) => s + d.topicos.filter((t) => t.modo === "novo" || t.modo === "expresso").length,
        0,
      ),
      temSimuladoCompleto: slice.some((d) => d.tipo === "simulado"),
      dias: slice,
    });
  }

  const topicosNaoCobertosAteProva = simulados.filter((t) => t.estado === "nao_visto").length;
  const fimCobertura = somarDias(dataProva, -46);
  const concluiNaCobertura =
    dataConclusaoCobertura !== null && dataConclusaoCobertura <= fimCobertura;

  return {
    hoje,
    dataProva,
    diasAteProva,
    faseAtual,
    fases: montarBlocosDeFase(hoje, dataProva),
    totalTopicos,
    topicosJaVistos,
    topicosNaoVistos: topicosNaoVistosInicial,
    dataConclusaoCobertura,
    concluiNaCobertura,
    topicosNaoCobertosAteProva,
    simuladosCompletosPrevistos,
    minutosSemanaisPerfil,
    questoesSemanaisPerfil,
    semanas,
  };
}
