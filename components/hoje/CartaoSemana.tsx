import { CalendarRange, HeartHandshake, PartyPopper, Rocket, Smile } from "lucide-react";
import type { ResumoSemana, TipoSaldo } from "@/lib/meta";

const NOME_DIA: Record<string, [string, string]> = {
  seg: ["Seg", "Segunda"],
  ter: ["Ter", "Terça"],
  qua: ["Qua", "Quarta"],
  qui: ["Qui", "Quinta"],
  sex: ["Sex", "Sexta"],
  sab: ["Sáb", "Sábado"],
  dom: ["Dom", "Domingo"],
};

const ICONE_SALDO: Record<TipoSaldo, typeof Smile> = {
  atrasado: Rocket,
  dia_sem_estudo: HeartHandshake,
  adiantado: PartyPopper,
  em_dia: Smile,
};

const ALTURA = 112; // px da área das barras

/** Semana (seg a dom): meta x feito por dia, hoje destacado, e a frase do saldo. */
export default function CartaoSemana({ semana, diasEstudados }: { semana: ResumoSemana; diasEstudados: number }) {
  const maximo = Math.max(1, ...semana.dias.map((d) => Math.max(d.meta, d.feito)));
  const Icone = ICONE_SALDO[semana.tipoSaldo];
  return (
    <section aria-labelledby="h-semana" className="cartao">
      <div className="flex items-start justify-between gap-3">
        <h2 id="h-semana" className="rotulo-secao flex items-center gap-2">
          <CalendarRange aria-hidden="true" className="size-4" />
          Semana
        </h2>
        <p className="text-right text-sm text-muted">
          <strong className="numero-grande text-xl text-fg">{semana.feitoSemana}</strong> de {semana.metaSemanaBase}{" "}
          questões
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-3">
        {semana.dias.map((d) => {
          const hoje = d.situacao === "hoje";
          const h = Math.max(6, Math.round((d.meta / maximo) * ALTURA));
          const pct = d.meta > 0 ? Math.min(1, d.feito / d.meta) : 0;
          const [curto, longo] = NOME_DIA[d.dia];
          const passouMeta = d.feito > d.meta;
          return (
            <li
              key={d.data}
              aria-label={`${longo}${hoje ? " (hoje)" : ""}: ${d.feito} de ${d.meta} questões`}
              className={`flex flex-col items-center rounded-xl px-0.5 pb-1.5 pt-1.5 ${hoje ? "bg-accent-suave ring-2 ring-accent" : ""}`}
            >
              <span className="mb-1 text-[0.7rem] font-bold tabular-nums text-fg sm:text-xs">
                {d.feito}
                <span className="font-normal text-muted">/{d.meta}</span>
              </span>
              <div className="flex items-end" style={{ height: ALTURA }}>
                <div
                  className="relative w-5 overflow-hidden rounded-md border border-borda-forte bg-surface sm:w-8"
                  style={{ height: h }}
                >
                  <div
                    className={`absolute inset-x-0 bottom-0 ${passouMeta ? "bg-ok" : "bg-accent"}`}
                    style={{ height: `${pct * 100}%` }}
                  />
                </div>
              </div>
              <span className={`mt-1 text-xs ${hoje ? "font-extrabold text-accent-texto" : "font-semibold text-muted"}`}>
                {curto}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Barra vazia = meta do dia; preenchida = feito.</p>

      <p
        className={`mt-4 flex items-start gap-3 rounded-xl p-3 ${
          semana.tipoSaldo === "adiantado" || semana.tipoSaldo === "em_dia" ? "bg-ok-bg text-ok" : "bg-ambar-bg text-ambar-texto"
        }`}
      >
        <Icone aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span className="font-semibold">{semana.mensagem}</span>
      </p>
      <p className="mt-2 text-sm text-muted">Dias estudados nos últimos 7: {diasEstudados}.</p>
    </section>
  );
}
