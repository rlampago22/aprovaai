// Monta o contexto de "hoje" e o cronograma completo a partir do catálogo estático + estado no navegador.
import { montarCronograma, type ResumoCronograma } from "./cronograma";
import { diaDaSemana, hojeISO } from "./datas";
import { calcularSemana, datasDaSemana, minutosPlanejados, type ResumoSemana } from "./meta";
import type { Energia } from "./planner";
import {
  contarRevisoesVencidas,
  getAtividadeHoje,
  getCheckin,
  getDisciplinas,
  getFeitoPorDia,
  getPerfil,
  getPrimeiroDiaEstudo,
  getTopicos,
  type Perfil,
} from "./queries";
import type { CatalogoEstatico, EstadoUsuario } from "./store";

export interface ContextoHoje {
  hoje: string;
  perfil: Perfil;
  checkin: ReturnType<typeof getCheckin>;
  energia: Energia;
  minutosPerfilHoje: number;
  minutosHoje: number;
  semana: ResumoSemana;
  atividade: ReturnType<typeof getAtividadeHoje>;
}

export function getContextoHoje(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  hoje: string = hojeISO(),
): ContextoHoje {
  const perfil = getPerfil(estado);
  const checkin = getCheckin(estado, hoje);
  const energia: Energia = checkin?.energia ?? "media";
  const minutosPerfilHoje = perfil.minutos_por_dia[diaDaSemana(hoje)] ?? 0;
  const minutosHoje = minutosPlanejados(checkin?.minutos_hoje ?? minutosPerfilHoje, energia);
  const datas = datasDaSemana(hoje);
  const semana = calcularSemana({
    hoje,
    minutosPerfil: perfil.minutos_por_dia,
    minutosHoje,
    feitoPorDia: getFeitoPorDia(estado, datas[0], datas[6]),
    primeiroDiaEstudo: getPrimeiroDiaEstudo(estado),
  });
  return {
    hoje,
    perfil,
    checkin,
    energia,
    minutosPerfilHoje,
    minutosHoje,
    semana,
    atividade: getAtividadeHoje(catalogo, estado, hoje),
  };
}

export function getCronograma(
  catalogo: CatalogoEstatico,
  estado: EstadoUsuario,
  hoje: string = hojeISO(),
): ResumoCronograma {
  const { perfil, checkin, semana, atividade } = getContextoHoje(catalogo, estado, hoje);
  const disciplinas = getDisciplinas(catalogo);
  const topicos = getTopicos(catalogo, estado, hoje);
  const revisoesVencidasHoje = contarRevisoesVencidas(estado, hoje);
  const feitoNaSemanaAtual = Object.fromEntries(semana.dias.map((d) => [d.data, d.feito]));

  return montarCronograma({
    hoje,
    perfil,
    checkinHoje: checkin ? { energia: checkin.energia, minutos_hoje: checkin.minutos_hoje } : null,
    disciplinas,
    topicos,
    revisoesVencidasHoje,
    metaHoje: semana.metaHoje,
    atividadeHoje: atividade,
    feitoNaSemanaAtual,
  });
}
