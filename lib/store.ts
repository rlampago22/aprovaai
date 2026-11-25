// Estado do usuário salvo localmente no navegador (localStorage) + tipos do catálogo estático.
import type { DiaSemana } from "./datas";
import type { Energia } from "./planner";
import type { ConfigSimulado, TipoSimulado } from "./simulado";

export const CHAVE_STORAGE = "aprovaai-web-v1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface Perfil {
  data_prova: string;
  nota_alvo: number;
  minutos_por_dia: Record<DiaSemana, number>;
  periodo: "manha" | "tarde" | "noite";
  nivel_inicial: Record<string, number>;
}

export interface Disciplina {
  id: number;
  nome: string;
  questoes_prova: number;
  minimo_acertos: number;
  ordem: number;
}

export interface TopicoBase {
  id: number;
  disciplina_id: number;
  ordem: number;
  texto: string;
  titulo_curto: string;
}

export interface Alternativa {
  letra: string;
  texto: string;
  explicacao: string;
}

export interface QuestaoBase {
  id: number;
  topico_id: number;
  enunciado: string;
  texto_base: string | null;
  alternativas: Alternativa[];
  correta: string;
  fonte: string;
  origem: "prova_oficial" | "adaptada" | "gerada_ia" | "manual";
  dificuldade: number;
  revisada: boolean;
}

export interface Conteudo {
  id: number;
  topico_id: number;
  tipo: "video" | "teoria" | "fonte";
  titulo: string;
  url: string | null;
  inicio_s: number | null;
  fim_s: number | null;
  markdown: string | null;
  canal: string | null;
  minutos: number | null;
  chave: string | null;
}

export interface CatalogoEstatico {
  disciplinas: Disciplina[];
  topicos: TopicoBase[];
  questoes: QuestaoBase[];
  conteudos: Conteudo[];
}

export interface CheckinRow {
  data: string;
  energia: Energia;
  minutos_hoje: number | null;
  nota: string | null;
}

export interface TentativaRow {
  id: number;
  questao_id: number;
  resposta: string;
  acertou: boolean;
  chutou: boolean;
  tempo_ms: number | null;
  origem: "pratica" | "revisao" | "simulado";
  simulado_id: number | null;
  criada_em: string;
}

export interface RevisaoRow {
  questao_id: number;
  proxima_em: string;
  intervalo_dias: number;
  facilidade: number;
}

export interface EstudoConteudoRow {
  id: number;
  conteudo_id: number;
  feito_em: string;
  minutos: number;
}

export interface SimuladoRow {
  id: number;
  tipo: TipoSimulado;
  config: ConfigSimulado;
  iniciado_em: string;
  finalizado_em: string | null;
  nota: number | null;
}

export interface EstadoUsuario {
  versao: 1;
  perfil: Perfil;
  checkins: Record<string, CheckinRow>;
  tentativas: TentativaRow[];
  revisoes: Record<number, RevisaoRow>;
  estudos: EstudoConteudoRow[];
  simulados: SimuladoRow[];
  conteudosCustom: Conteudo[];
  questoesCustom: QuestaoBase[];
  nextIds: {
    tentativa: number;
    estudo: number;
    simulado: number;
    conteudo: number;
    questao: number;
  };
}

export const PERFIL_PADRAO: Perfil = {
  data_prova: "2027-01-31",
  nota_alvo: 80,
  minutos_por_dia: { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 180, dom: 240 },
  periodo: "noite",
  nivel_inicial: { "1": 3, "2": 3, "3": 3 },
};

export function criarEstadoInicial(): EstadoUsuario {
  return {
    versao: 1,
    perfil: {
      ...PERFIL_PADRAO,
      minutos_por_dia: { ...PERFIL_PADRAO.minutos_por_dia },
      nivel_inicial: { ...PERFIL_PADRAO.nivel_inicial },
    },
    checkins: {},
    tentativas: [],
    revisoes: {},
    estudos: [],
    simulados: [],
    conteudosCustom: [],
    questoesCustom: [],
    nextIds: {
      tentativa: 1,
      estudo: 1,
      simulado: 1,
      conteudo: 100000,
      questao: 100000,
    },
  };
}

export function agoraLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${dia} ${hh}:${mm}:${ss}`;
}

export function normalizarEstado(raw: unknown): EstadoUsuario {
  const base = criarEstadoInicial();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<EstadoUsuario>;

  const perfilBruto = obj.perfil && typeof obj.perfil === "object" ? obj.perfil : undefined;
  const perfil: Perfil = {
    data_prova:
      typeof perfilBruto?.data_prova === "string" && /^\d{4}-\d{2}-\d{2}$/.test(perfilBruto.data_prova)
        ? perfilBruto.data_prova
        : base.perfil.data_prova,
    nota_alvo:
      typeof perfilBruto?.nota_alvo === "number" && Number.isFinite(perfilBruto.nota_alvo)
        ? Math.min(100, Math.max(0, Math.round(perfilBruto.nota_alvo)))
        : base.perfil.nota_alvo,
    periodo:
      perfilBruto?.periodo === "manha" || perfilBruto?.periodo === "tarde" || perfilBruto?.periodo === "noite"
        ? perfilBruto.periodo
        : base.perfil.periodo,
    minutos_por_dia: {
      ...base.perfil.minutos_por_dia,
      ...(perfilBruto?.minutos_por_dia && typeof perfilBruto.minutos_por_dia === "object"
        ? perfilBruto.minutos_por_dia
        : {}),
    },
    nivel_inicial: {
      ...base.perfil.nivel_inicial,
      ...(perfilBruto?.nivel_inicial && typeof perfilBruto.nivel_inicial === "object"
        ? perfilBruto.nivel_inicial
        : {}),
    },
  };

  const tentativas = Array.isArray(obj.tentativas) ? obj.tentativas : [];
  const estudos = Array.isArray(obj.estudos) ? obj.estudos : [];
  const simulados = Array.isArray(obj.simulados) ? obj.simulados : [];
  const conteudosCustom = Array.isArray(obj.conteudosCustom) ? obj.conteudosCustom : [];
  const questoesCustom = Array.isArray(obj.questoesCustom) ? obj.questoesCustom : [];
  const checkins = obj.checkins && typeof obj.checkins === "object" ? obj.checkins : {};
  const revisoes = obj.revisoes && typeof obj.revisoes === "object" ? obj.revisoes : {};

  const maxId = (arr: { id: number }[], floor: number) =>
    arr.reduce((m, x) => (typeof x.id === "number" && x.id >= m ? x.id + 1 : m), floor);

  return {
    versao: 1,
    perfil,
    checkins,
    tentativas,
    revisoes,
    estudos,
    simulados,
    conteudosCustom,
    questoesCustom,
    nextIds: {
      tentativa: Math.max(obj.nextIds?.tentativa ?? 1, maxId(tentativas, 1)),
      estudo: Math.max(obj.nextIds?.estudo ?? 1, maxId(estudos, 1)),
      simulado: Math.max(obj.nextIds?.simulado ?? 1, maxId(simulados, 1)),
      conteudo: Math.max(obj.nextIds?.conteudo ?? 100000, maxId(conteudosCustom, 100000)),
      questao: Math.max(obj.nextIds?.questao ?? 100000, maxId(questoesCustom, 100000)),
    },
  };
}

export function lerEstadoLocal(): EstadoUsuario {
  if (typeof window === "undefined") return criarEstadoInicial();
  try {
    const bruto = localStorage.getItem(CHAVE_STORAGE);
    if (!bruto) return criarEstadoInicial();
    return normalizarEstado(JSON.parse(bruto));
  } catch {
    return criarEstadoInicial();
  }
}

export function salvarEstadoLocal(estado: EstadoUsuario): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  } catch {
    // ignora se o armazenamento do navegador estiver cheio ou bloqueado
  }
}

export function exportarBackupJson(estado: EstadoUsuario): string {
  return JSON.stringify(estado, null, 2);
}

export function importarBackupJson(texto: string): { ok: true; estado: EstadoUsuario } | { ok: false; erro: string } {
  try {
    const parsed = JSON.parse(texto);
    if (!parsed || typeof parsed !== "object" || (parsed as { versao?: number }).versao !== 1) {
      return { ok: false, erro: "Arquivo de backup inválido (esperado um backup do AprovaAI)." };
    }
    return { ok: true, estado: normalizarEstado(parsed) };
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo JSON de backup." };
  }
}
