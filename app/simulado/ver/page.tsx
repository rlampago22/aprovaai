"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ExecucaoSimulado from "@/components/simulado/ExecucaoSimulado";
import ResultadoSimuladoView from "@/components/simulado/ResultadoSimuladoView";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { getPerfil, getSimulado } from "@/lib/queries";

function SimuladoVerInterno() {
  const sp = useSearchParams();
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const id = Number(sp.get("id"));
  const simulado = Number.isInteger(id) && id > 0 ? getSimulado(catalogo, estado, id) : null;

  if (!simulado) {
    return (
      <div className="cartao space-y-3">
        <h1 className="text-xl font-extrabold">Simulado não encontrado</h1>
        <p className="text-sm text-muted">
          Este simulado pode ter sido descartado ou criado em outro navegador.
        </p>
        <p>
          <Link href="/simulado" className="btn btn-primario">
            Voltar para Simulado
          </Link>
        </p>
      </div>
    );
  }

  if (simulado.finalizado_em && simulado.resultado) {
    const perfil = getPerfil(estado);
    return (
      <ResultadoSimuladoView
        titulo={simulado.config.titulo}
        finalizadoEm={simulado.finalizado_em}
        notaAlvo={perfil.nota_alvo}
        questoes={simulado.questoes}
        respostas={simulado.respostas}
        resultado={simulado.resultado}
      />
    );
  }

  return (
    <ExecucaoSimulado
      simuladoId={simulado.id}
      titulo={simulado.config.titulo}
      tempoLimiteMin={simulado.config.tempoLimiteMin}
      questoes={simulado.questoes}
    />
  );
}

export default function SimuladoVerPage() {
  return (
    <Suspense fallback={<CarregandoApp />}>
      <SimuladoVerInterno />
    </Suspense>
  );
}
