"use client";

import Link from "next/link";
import { CircleCheck, CircleHelp, GraduationCap, ListChecks, TrendingUp } from "lucide-react";
import AnelProgresso from "@/components/hoje/AnelProgresso";
import CartaoSemana from "@/components/hoje/CartaoSemana";
import Checkin from "@/components/hoje/Checkin";
import LinhaFases from "@/components/hoje/LinhaFases";
import Roteiro from "@/components/hoje/Roteiro";
import RumoProva from "@/components/hoje/RumoProva";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { formatarDuracao } from "@/lib/datas";
import { projetarNota } from "@/lib/dominio";
import { getContextoHoje } from "@/lib/hoje";
import { montarPlano } from "@/lib/planner";
import {
  contarRevisoesVencidas,
  getConstancia,
  getDisciplinas,
  getTopicos,
} from "@/lib/queries";

const CHANCE_CHUTE = 0.25;

function saudacao(hora: number) {
  if (hora < 5) return "Boa madrugada";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Hoje() {
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const { hoje, perfil, checkin, energia, minutosPerfilHoje, semana, atividade } = getContextoHoje(
    catalogo,
    estado,
  );
  const disciplinas = getDisciplinas(catalogo);
  const topicos = getTopicos(catalogo, estado, hoje);
  const constancia = getConstancia(estado, hoje);

  const plano = montarPlano({
    hoje,
    perfil,
    checkin: checkin ? { energia: checkin.energia, minutos_hoje: checkin.minutos_hoje } : null,
    disciplinas,
    topicos,
    revisoesVencidas: contarRevisoesVencidas(estado, hoje),
    metaQuestoes: semana.metaHoje,
    atividadeHoje: atividade,
  });

  const dominios: Record<number, number[]> = {};
  const tentativasPorDisciplina: Record<number, number> = {};
  for (const t of topicos) {
    (dominios[t.disciplina_id] ??= []).push(t.tentativas > 0 ? t.dominio : CHANCE_CHUTE);
    tentativasPorDisciplina[t.disciplina_id] = (tentativasPorDisciplina[t.disciplina_id] ?? 0) + t.tentativas;
  }
  const projecao = projetarNota(disciplinas, dominios);
  const questoesPorDisciplina = Object.fromEntries(disciplinas.map((d) => [d.id, d.questoes_prova]));

  const dias = plano.diasAteProva;
  const faltam = semana.metaHoje - atividade.total;
  const metaBatida = faltam <= 0;
  const todosFeitos = plano.passos.every((p) => p.estado === "feito");

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted">{saudacao(new Date().getHours())}!</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            {dias > 1 && (
              <>
                Faltam <span className="text-accent-texto">{dias} dias</span> para a prova
              </>
            )}
            {dias === 1 && <>A prova é <span className="text-accent-texto">amanhã</span></>}
            {dias === 0 && <>A prova é <span className="text-accent-texto">hoje</span></>}
            {dias < 0 && <>A data da prova já passou</>}
          </h1>
        </div>
        <LinhaFases fase={plano.fase} hoje={hoje} dataProva={perfil.data_prova} />
      </header>

      {!constancia.jaEstudou && (
        <Link href="/como-estudar" className="cartao flex items-center gap-3 text-fg no-underline hover:bg-surface-2">
          <GraduationCap aria-hidden="true" className="size-6 shrink-0 text-accent-texto" />
          <span>
            <strong>Primeira vez em concurso?</strong>{" "}
            <span className="text-muted">Leia o guia de 2 minutos: como estudar com o AprovaAI.</span>
          </span>
        </Link>
      )}

      <Checkin energia={energia} minutosCheckin={checkin?.minutos_hoje ?? null} minutosPerfil={minutosPerfilHoje} />

      <section aria-labelledby="h-meta" className="cartao cartao-destaque">
        <h2 id="h-meta" className="rotulo-secao">
          Meta de hoje
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
          <AnelProgresso feitas={atividade.total} meta={semana.metaHoje} />
          <div className="min-w-0 flex-1 space-y-2">
            {metaBatida ? (
              <p className="flex items-center gap-2 text-xl font-extrabold text-ok">
                <CircleCheck aria-hidden="true" className="size-6" />
                Meta batida. Bom trabalho!
              </p>
            ) : (
              <p className="titulo text-xl font-bold">
                Faltam <span className="text-accent-texto">{faltam}</span> {faltam === 1 ? "questão" : "questões"} hoje
              </p>
            )}
            <p className="text-muted">
              <strong className="numero-grande text-2xl text-fg">{formatarDuracao(atividade.minutosEstudados)}</strong>
              <span className="text-lg font-bold"> / {formatarDuracao(plano.minutosEfetivos)}</span> estudados hoje
              {plano.energia === "baixa" && " (ajustado para energia baixa)"}
            </p>
            {semana.extraHoje > 0 && (
              <p className="inline-flex items-center gap-2 rounded-xl bg-ambar-bg px-3 py-1.5 text-sm font-semibold text-ambar-texto">
                <TrendingUp aria-hidden="true" className="size-4" />+{semana.extraHoje}{" "}
                {semana.extraHoje === 1 ? "questão" : "questões"} para recuperar a semana
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="h-roteiro" className="cartao">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-roteiro" className="rotulo-secao flex items-center gap-2">
            <ListChecks aria-hidden="true" className="size-4" />
            Roteiro de hoje
          </h2>
          <Link href="/cronograma" className="text-sm font-semibold text-accent-texto underline">
            Ver cronograma até a prova →
          </Link>
        </div>
        <p className="mb-4 mt-1 text-sm text-muted">
          {plano.passos.length} {plano.passos.length === 1 ? "passo" : "passos"} para chegar nas {semana.metaHoje}{" "}
          questões. Siga na ordem.
        </p>
        <Roteiro
          passos={plano.passos}
          nomeDisciplina={(id) => (id == null ? undefined : disciplinas.find((d) => d.id === id)?.nome)}
        />
        {todosFeitos && !metaBatida && (
          <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
            Roteiro concluído. Faltam {faltam} {faltam === 1 ? "questão" : "questões"} para a meta: dá para fechar em{" "}
            <Link href="/praticar" className="font-semibold text-accent-texto underline">
              Praticar
            </Link>
            .
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <CartaoSemana semana={semana} diasEstudados={constancia.dias} />
        <RumoProva
          projecao={projecao}
          questoesPorDisciplina={questoesPorDisciplina}
          notaAlvo={perfil.nota_alvo}
          cobertura={plano.cobertura}
          tentativasPorDisciplina={tentativasPorDisciplina}
        />
      </div>

      <details className="cartao group">
        <summary className="flex cursor-pointer items-center gap-2 font-bold">
          <CircleHelp aria-hidden="true" className="size-5 text-accent-texto" />
          Como o plano é montado?
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-muted">
          <li>
            <strong className="text-fg">Tempo e energia:</strong> usamos o tempo do seu perfil (ou o do check-in).
            Energia baixa reduz o tempo em 40%; energia alta não aumenta a carga.
          </li>
          <li>
            <strong className="text-fg">Meta de questões:</strong> 65% do tempo vai para questões, a ~3 minutos cada.
            O resto é teoria ou vídeo.
          </li>
          <li>
            <strong className="text-fg">Recálculo:</strong> se a semana (seg a dom) ficou para trás, o déficit é
            dividido pelos dias que restam, com no máximo +30% por dia. O que não couber é perdoado. Adiantado não
            aumenta nada, e segunda-feira zera o saldo.
          </li>
          <li>
            <strong className="text-fg">Quais tópicos:</strong> pesam o valor da disciplina na prova e o quanto você
            domina o tópico. Cobertura prioriza o que não viu; Consolidação, o que está fraco; Reta final, simulados e
            revisão. Na reta final, no máximo 1 tópico novo por dia, em &ldquo;Resumo expresso&rdquo;.
          </li>
          <li>
            <strong className="text-fg">Dias perdidos:</strong> a cobertura garante que nenhum tópico fique sem ser
            visto (se o ritmo atrasa, tópicos novos ganham prioridade). A fila de revisão é limitada por dia, e
            revisões vencidas há mais de 14 dias recomeçam do zero.
          </li>
        </ul>
      </details>

      <p className="text-center text-sm">
        <Link href="/como-estudar" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent-texto underline">
          <GraduationCap aria-hidden="true" className="size-4" />
          Primeira vez em concurso? Veja como estudar
        </Link>
      </p>
    </div>
  );
}
