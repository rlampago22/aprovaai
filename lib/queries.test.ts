import { describe, expect, it } from "vitest";
import {
  adicionarConteudo,
  alternarEstudo,
  buscarQuestoes,
  contarRevisoesVencidas,
  criarSimulado,
  descartarSimulado,
  finalizarSimulado,
  getAtividadeHoje,
  getDesempenho,
  getSimulado,
  getTopicos,
  listarSimulados,
  processarImportacaoJson,
  registrarTentativa,
  removerConteudo,
  salvarCheckin,
} from "./queries";
import {
  criarEstadoInicial,
  exportarBackupJson,
  importarBackupJson,
  type CatalogoEstatico,
} from "./store";

function catalogoMini(): CatalogoEstatico {
  return {
    disciplinas: [
      { id: 1, nome: "Língua Portuguesa", questoes_prova: 10, minimo_acertos: 2, ordem: 1 },
      { id: 2, nome: "Legislação", questoes_prova: 15, minimo_acertos: 2, ordem: 2 },
      { id: 3, nome: "Conhecimentos Específicos", questoes_prova: 25, minimo_acertos: 5, ordem: 3 },
    ],
    topicos: [
      { id: 1, disciplina_id: 1, ordem: 1, texto: "Interpretação", titulo_curto: "Interpretação" },
      { id: 2, disciplina_id: 2, ordem: 1, texto: "CF/88", titulo_curto: "CF/88" },
      { id: 3, disciplina_id: 3, ordem: 1, texto: "Atos", titulo_curto: "Atos" },
    ],
    questoes: [
      {
        id: 10,
        topico_id: 1,
        enunciado: "Pergunta PT",
        texto_base: null,
        alternativas: [
          { letra: "A", texto: "A1", explicacao: "E1" },
          { letra: "B", texto: "B1", explicacao: "E2" },
          { letra: "C", texto: "C1", explicacao: "E3" },
          { letra: "D", texto: "D1", explicacao: "E4" },
        ],
        correta: "A",
        fonte: "Teste",
        origem: "manual",
        dificuldade: 2,
        revisada: true,
      },
      {
        id: 20,
        topico_id: 2,
        enunciado: "Pergunta LEG",
        texto_base: null,
        alternativas: [
          { letra: "A", texto: "A2", explicacao: "E1" },
          { letra: "B", texto: "B2", explicacao: "E2" },
          { letra: "C", texto: "C2", explicacao: "E3" },
          { letra: "D", texto: "D2", explicacao: "E4" },
        ],
        correta: "B",
        fonte: "Teste",
        origem: "prova_oficial",
        dificuldade: 2,
        revisada: true,
      },
      {
        id: 30,
        topico_id: 3,
        enunciado: "Pergunta ESP",
        texto_base: null,
        alternativas: [
          { letra: "A", texto: "A3", explicacao: "E1" },
          { letra: "B", texto: "B3", explicacao: "E2" },
          { letra: "C", texto: "C3", explicacao: "E3" },
          { letra: "D", texto: "D3", explicacao: "E4" },
        ],
        correta: "C",
        fonte: "Teste",
        origem: "gerada_ia",
        dificuldade: 2,
        revisada: true,
      },
    ],
    conteudos: [
      {
        id: 1,
        topico_id: 1,
        tipo: "teoria",
        titulo: "Resumo PT",
        url: null,
        inicio_s: null,
        fim_s: null,
        markdown: "# Resumo",
        canal: null,
        minutos: null,
        chave: "arquivo:pt.md",
      },
    ],
  };
}

describe("queries no navegador (sem SQLite)", () => {
  it("registra tentativa, mantém revisão para amanhã após erro no mesmo dia e filtra com dificuldade", () => {
    const cat = catalogoMini();
    let st = criarEstadoInicial();
    const hoje = "2026-11-24";

    // Erra questão 10 hoje
    const r1 = registrarTentativa(cat, st, {
      questaoId: 10,
      resposta: "B",
      chutou: false,
      tempoMs: 30000,
      origem: "pratica",
      hoje,
      criadaEm: `${hoje} 10:00:00`,
    });
    expect(r1.acertou).toBe(false);
    expect(r1.estado.revisoes[10]?.proxima_em).toBe("2026-11-25");
    st = r1.estado;

    // Refaz e acerta no mesmo dia: revisão continua protegida para amanhã
    const r2 = registrarTentativa(cat, st, {
      questaoId: 10,
      resposta: "A",
      chutou: false,
      tempoMs: 20000,
      origem: "pratica",
      hoje,
      criadaEm: `${hoje} 10:05:00`,
    });
    expect(r2.acertou).toBe(true);
    expect(r2.estado.revisoes[10]?.proxima_em).toBe("2026-11-25");
    st = r2.estado;

    expect(contarRevisoesVencidas(st, "2026-11-24")).toBe(0);
    expect(contarRevisoesVencidas(st, "2026-11-25")).toBe(1);

    // Modo erradas (última foi acerto): vazio; modo dificuldade: traz a questão 10 com dificuldades=1
    expect(buscarQuestoes(cat, st, { modo: "erradas" }, hoje)).toHaveLength(0);
    const dif = buscarQuestoes(cat, st, { modo: "dificuldade" }, hoje);
    expect(dif).toHaveLength(1);
    expect(dif[0].id).toBe(10);
    expect(dif[0].dificuldades).toBe(1);

    const atv = getAtividadeHoje(cat, st, hoje);
    expect(atv.total).toBe(1);
    expect(atv.respostasHoje).toBe(2);
    expect(atv.refeitasMesmoDia).toBe(1);
    expect(atv.erradasHoje).toBe(1);
    expect(atv.refeitasHoje).toBe(1);
  });

  it("cria, finaliza e lista simulados e atualiza desempenho", () => {
    const cat = catalogoMini();
    let st = criarEstadoInicial();
    const hoje = "2026-11-24";

    const criado = criarSimulado(cat, st, { tipo: "completo" }, hoje);
    expect(criado).not.toBeNull();
    st = criado!.estado;
    expect(criado!.totalQuestoes).toBe(3);

    const detalhe = getSimulado(cat, st, criado!.id);
    expect(detalhe?.questoes).toHaveLength(3);
    expect(detalhe?.finalizado_em).toBeNull();

    const fin = finalizarSimulado(cat, st, {
      simuladoId: criado!.id,
      respostas: [
        { questaoId: 10, resposta: "A", chutou: false, tempoMs: 60000 },
        { questaoId: 20, resposta: "B", chutou: false, tempoMs: 60000 },
        { questaoId: 30, resposta: "A", chutou: false, tempoMs: 60000 },
      ],
      hoje,
    });
    st = fin.estado;
    expect(fin.nota).toBeGreaterThan(0);

    const lista = listarSimulados(st);
    expect(lista).toHaveLength(1);
    expect(lista[0].acertos).toBe(2);
    expect(lista[0].respondidas).toBe(3);

    const des = getDesempenho(cat, st, hoje);
    expect(des.resumo.totalTentativas).toBe(3);
    expect(des.resumo.totalAcertos).toBe(2);

    // Simulado finalizado não é descartado
    expect(descartarSimulado(st, criado!.id).simulados).toHaveLength(1);
  });

  it("alterna estudo de resumo, gerencia conteúdo customizado, importa JSON e faz backup/restore", () => {
    const cat = catalogoMini();
    let st = criarEstadoInicial();
    const hoje = "2026-11-24";

    st = salvarCheckin(st, hoje, "alta", 90);
    const est1 = alternarEstudo(cat, st, 1, 14, `${hoje} 09:00:00`);
    expect(est1.marcado).toBe(true);
    st = est1.estado;
    expect(getAtividadeHoje(cat, st, hoje).minutosEstudados).toBe(14);

    st = adicionarConteudo(st, {
      topico_id: 1,
      tipo: "teoria",
      titulo: "Minha nota",
      url: null,
      inicio_s: null,
      fim_s: null,
      markdown: "Anotação importante",
    });
    expect(st.conteudosCustom).toHaveLength(1);
    st = removerConteudo(st, st.conteudosCustom[0].id);
    expect(st.conteudosCustom).toHaveLength(0);

    const novoJson = JSON.stringify([
      {
        disciplina: "Legislação",
        topico_ordem: 1,
        enunciado: "Nova questão custom",
        texto_base: null,
        alternativas: [
          { letra: "A", texto: "Sim", explicacao: "Ok" },
          { letra: "B", texto: "Não", explicacao: "Err" },
          { letra: "C", texto: "Talvez", explicacao: "Err" },
          { letra: "D", texto: "Nunca", explicacao: "Err" },
        ],
        correta: "A",
        fonte: "Manual",
        origem: "manual",
        revisada: true,
      },
    ]);
    const imp = processarImportacaoJson(cat, st, novoJson, false);
    expect(imp.resultado.ok).toBe(true);
    if (imp.resultado.ok) {
      expect(imp.resultado.novas).toBe(1);
      expect(imp.resultado.totalBanco).toBe(4);
    }
    st = imp.estado;
    expect(getTopicos(cat, st, hoje).find((t) => t.id === 2)?.n_questoes).toBe(2);

    const backup = exportarBackupJson(st);
    const rest = importarBackupJson(backup);
    expect(rest.ok).toBe(true);
    if (rest.ok) {
      expect(rest.estado.questoesCustom).toHaveLength(1);
      expect(rest.estado.checkins[hoje]?.minutos_hoje).toBe(90);
    }
  });
});
