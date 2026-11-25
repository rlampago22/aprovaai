import { MapPin } from "lucide-react";
import { formatarDataCurta, somarDias } from "@/lib/datas";
import { NOME_FASE, type Fase } from "@/lib/planner";

const ORDEM: Fase[] = ["cobertura", "consolidacao", "reta_final"];

/** Linha das fases com "você está aqui" e as datas de troca de fase. */
export default function LinhaFases({ fase, hoje, dataProva }: { fase: Fase; hoje: string; dataProva: string }) {
  const inicioConsolidacao = somarDias(dataProva, -45);
  const inicioReta = somarDias(dataProva, -14);
  const faixas: Record<Fase, string> = {
    cobertura: `até ${formatarDataCurta(somarDias(inicioConsolidacao, -1))}`,
    consolidacao: `${formatarDataCurta(inicioConsolidacao)} a ${formatarDataCurta(somarDias(inicioReta, -1))}`,
    reta_final: `${formatarDataCurta(inicioReta)} a ${formatarDataCurta(dataProva)}`,
  };
  const atual = ORDEM.indexOf(fase);
  return (
    <ol aria-label="Fases até a prova" className="grid grid-cols-3 gap-2">
      {ORDEM.map((f, i) => {
        const aqui = i === atual;
        return (
          <li key={f} aria-current={aqui ? "step" : undefined}>
            <p className={`mb-1 flex h-6 items-center gap-1 text-xs font-bold ${aqui ? "text-accent-texto" : "invisible"}`}>
              <MapPin aria-hidden="true" className="size-3.5" />
              Você está aqui
            </p>
            <div
              className={`h-2 rounded-full ${
                aqui ? "bg-accent" : i < atual ? "bg-accent opacity-40" : "bg-surface-2 border border-borda"
              }`}
            />
            <p className={`mt-1.5 text-sm leading-tight ${aqui ? "font-extrabold text-fg" : "font-semibold text-muted"}`}>
              {NOME_FASE[f]}
            </p>
            <p className="text-xs text-muted">{faixas[f]}</p>
          </li>
        );
      })}
      <li className="sr-only">Hoje é {formatarDataCurta(hoje)}.</li>
    </ol>
  );
}
