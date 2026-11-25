"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { CircleAlert, Layers, RotateCcw, Shuffle, SquareX } from "lucide-react";
import Player from "@/components/Player";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { getContextoHoje } from "@/lib/hoje";
import { buscarQuestoes, getDisciplinas, getTopicos } from "@/lib/queries";

function num(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function PraticarInterno() {
  const sp = useSearchParams();
  const { pronto, erro, catalogo, estado } = useStore();

  const topico = num(sp.get("topico"));
  const disciplina = num(sp.get("disciplina"));
  const n = num(sp.get("n"));
  const revisao = num(sp.get("revisao"));
  const modoBruto = sp.get("modo");
  const modo =
    modoBruto === "revisao" || modoBruto === "erradas" || modoBruto === "dificuldade" || modoBruto === "misto"
      ? modoBruto
      : undefined;

  const chave = `${topico ?? ""}-${disciplina ?? ""}-${modo ?? ""}-${n ?? ""}-${revisao ?? ""}`;

  // Congela a lista de questões por filtro para não embaralhar durante a sessão ao responder.
  const questoes = useMemo(() => {
    if (!pronto || !catalogo) return [];
    return buscarQuestoes(catalogo, estado, {
      topico,
      disciplina,
      modo,
      n: n ?? (topico || disciplina || modo ? undefined : 10),
      revisao: modo === "misto" ? revisao : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- busca nova lista apenas ao mudar de filtro ou concluir carga inicial
  }, [pronto, chave]);

  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const disciplinas = getDisciplinas(catalogo);
  const { semana, atividade } = getContextoHoje(catalogo, estado);

  let descricao = "Questões variadas";
  if (modo === "revisao") descricao = "Revisão das questões vencidas";
  else if (modo === "erradas") descricao = "Questões ainda pendentes (última resposta foi erro ou chute)";
  else if (modo === "dificuldade")
    descricao = "Questões que já te deram dificuldade (erradas ou chutadas antes), mais difíceis primeiro";
  else if (modo === "misto")
    descricao = revisao
      ? `Questões mistas: ${revisao} da fila de revisão e o resto de todas as disciplinas`
      : "Questões mistas: todas as disciplinas, as de maior peso primeiro";
  else if (topico) descricao = `Tópico: ${getTopicos(catalogo, estado).find((t) => t.id === topico)?.titulo_curto ?? topico}`;
  else if (disciplina) descricao = `Disciplina: ${disciplinas.find((d) => d.id === disciplina)?.nome ?? disciplina}`;

  const filtros = [
    { href: "/praticar", rotulo: "Variadas", icone: Layers, classe: "" },
    { href: "/praticar?modo=revisao", rotulo: "Revisão do dia", icone: RotateCcw, classe: "" },
    { href: "/praticar?modo=misto&n=10", rotulo: "Mistas", icone: Shuffle, classe: "" },
    { href: "/praticar?modo=erradas", rotulo: "Erradas", icone: SquareX, classe: "" },
    { href: "/praticar?modo=dificuldade", rotulo: "Com dificuldade", icone: CircleAlert, classe: "" },
    ...disciplinas.map((d) => ({
      href: `/praticar?disciplina=${d.id}`,
      rotulo: nomeCurtoDisciplina(d.nome),
      icone: null,
      classe: classeDisciplina(d.nome),
    })),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Praticar</h1>
        <p className="text-muted">{descricao}</p>
      </div>
      <nav aria-label="Filtros de prática">
        <ul className="flex flex-wrap gap-2">
          {filtros.map((f) => {
            const Icone = f.icone;
            return (
              <li key={f.href}>
                <Link href={f.href} className={`btn text-sm ${f.classe}`}>
                  {Icone ? (
                    <Icone aria-hidden="true" className="size-4" />
                  ) : (
                    <span aria-hidden="true" className="size-2.5 rounded-full bg-d" />
                  )}
                  {f.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Player
        key={chave}
        questoes={questoes}
        origem={modo === "revisao" ? "revisao" : "pratica"}
        metaHoje={semana.metaHoje}
        feitasHoje={atividade.total}
      />
    </div>
  );
}

export default function PraticarPage() {
  return (
    <Suspense fallback={<CarregandoApp />}>
      <PraticarInterno />
    </Suspense>
  );
}
