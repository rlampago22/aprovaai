import { Flag, Layers, TriangleAlert, Trophy } from "lucide-react";
import type { RitmoCobertura } from "@/lib/cobertura";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { NOTA_MINIMA_GERAL, type ProjecaoNota } from "@/lib/dominio";

interface Props {
  projecao: ProjecaoNota;
  questoesPorDisciplina: Record<number, number>;
  notaAlvo: number;
  cobertura: RitmoCobertura;
  /** Questões já respondidas por disciplina (para saber se a projeção tem base). */
  tentativasPorDisciplina: Record<number, number>;
}

/** Abaixo disso, a projeção geral seria só um chute: mostramos "sem dados" em vez de um número. */
const MIN_QUESTOES_PROJECAO = 20;
/** Mínimo por disciplina para a barra e o alerta de "abaixo do mínimo" valerem. */
const MIN_QUESTOES_DISCIPLINA = 5;

const decimal = (n: number) => (Math.round(n * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const PRAZO: Record<RitmoCobertura["faseAlvo"], string> = {
  cobertura: "até o fim da Cobertura",
  consolidacao: "até o fim da Consolidação",
  reta_final: "até a prova",
};

/** Ritmo de cobertura: quantos tópicos faltam ver pela 1ª vez e se o ritmo atual dá conta. */
function CoberturaResumo({ cobertura: c }: { cobertura: RitmoCobertura }) {
  return (
    <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Layers aria-hidden="true" className="size-4 text-accent-texto" />
        Ritmo de cobertura
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            c.atrasado ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok"
          }`}
        >
          {c.atrasado ? "atrasado" : "em dia"}
        </span>
      </p>
      {c.naoVistos === 0 ? (
        <p className="mt-1 text-muted">Todos os tópicos já foram vistos pela 1ª vez.</p>
      ) : (
        <p className="mt-1 text-muted">
          {c.naoVistos === 1 ? "Falta 1 tópico" : `Faltam ${c.naoVistos} tópicos`} para ver pela 1ª vez; ritmo
          necessário: {decimal(c.ritmoNecessario)} por dia ({c.diasRestantesNaFase}{" "}
          {c.diasRestantesNaFase === 1 ? "dia" : "dias"} de estudo {PRAZO[c.faseAlvo]}).
        </p>
      )}
    </div>
  );
}

/** Projeção de nota com barras por disciplina: mínimo (linha tracejada) e meta (marcador). */
export default function RumoProva({ projecao, questoesPorDisciplina, notaAlvo, cobertura, tentativasPorDisciplina }: Props) {
  const totalFeitas = Object.values(tentativasPorDisciplina).reduce((a, b) => a + b, 0);
  const temBase = totalFeitas >= MIN_QUESTOES_PROJECAO;
  const comDados = (id: number) => temBase && (tentativasPorDisciplina[id] ?? 0) >= MIN_QUESTOES_DISCIPLINA;
  const abaixo = projecao.porDisciplina.filter((d) => comDados(d.disciplina_id) && !d.atingeMinimo);
  const totalQuestoesProva = Object.values(questoesPorDisciplina).reduce((a, b) => a + b, 0) || 50;
  const acertosEsperadosTotal = projecao.porDisciplina.reduce((s, d) => s + d.acertosEsperados, 0);
  const minimoAcertosTotal = (NOTA_MINIMA_GERAL / 100) * totalQuestoesProva;
  const metaAcertosTotal = (notaAlvo / 100) * totalQuestoesProva;
  return (
    <section aria-labelledby="h-rumo" className="cartao">
      <h2 id="h-rumo" className="rotulo-secao flex items-center gap-2">
        <Trophy aria-hidden="true" className="size-4" />
        Rumo à prova
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span className="numero-grande text-5xl">{temBase ? Math.round(projecao.nota) : "—"}</span>
          <span className="text-lg font-bold text-muted">/ 100 pts</span>
        </p>
        <p className="inline-flex items-baseline gap-1.5 rounded-xl bg-surface-2 px-3 py-1">
          <span className="numero-grande text-2xl text-fg">
            {temBase ? `~${decimal(acertosEsperadosTotal)}` : "—"}
          </span>
          <span className="text-sm font-semibold text-muted">/ {totalQuestoesProva} questões</span>
        </p>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted tabular-nums">
        <span>
          Mínimo: {NOTA_MINIMA_GERAL} pts ({decimal(minimoAcertosTotal)}/{totalQuestoesProva})
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-ambar-texto">
          Meta: {notaAlvo} pts ({decimal(metaAcertosTotal)}/{totalQuestoesProva})
        </span>
      </p>
      <p className="mt-2 text-sm text-muted">
        {temBase
          ? "Projeção se a prova fosse hoje (cada questão vale 2 pontos). Tópico ainda não praticado conta como chute (25%) — a nota sobe conforme você avança no edital."
          : `A projeção aparece depois das suas primeiras ${MIN_QUESTOES_PROJECAO} questões (você fez ${totalFeitas}). Antes disso, seria só um palpite.`}
      </p>

      <CoberturaResumo cobertura={cobertura} />

      <ul className="mt-4 space-y-4">
        {projecao.porDisciplina.map((d) => {
          const total = questoesPorDisciplina[d.disciplina_id] ?? 1;
          const meta = (notaAlvo / 100) * total;
          const pct = (v: number) => `${Math.min(100, Math.max(0, (v / total) * 100))}%`;
          const dados = comDados(d.disciplina_id);
          const feitas = tentativasPorDisciplina[d.disciplina_id] ?? 0;
          return (
            <li key={d.disciplina_id} className={classeDisciplina(d.nome)}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="chip">{nomeCurtoDisciplina(d.nome)}</span>
                <span className="text-sm text-muted">
                  {dados
                    ? `~${d.acertosEsperados.toFixed(1).replace(".", ",")} de ${total} acertos`
                    : `sem dados ainda (${feitas} ${feitas === 1 ? "questão feita" : "questões feitas"})`}
                </span>
              </div>
              <div
                role="meter"
                aria-label={`${d.nome}: acertos esperados`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={dados ? Number(d.acertosEsperados.toFixed(1)) : 0}
                aria-valuetext={
                  dados
                    ? `${d.acertosEsperados.toFixed(1)} de ${total} acertos; mínimo ${d.minimo}; meta ${Math.round(meta)}`
                    : `sem dados ainda; mínimo ${d.minimo}; meta ${Math.round(meta)}`
                }
                className="relative mt-3 h-4"
              >
                {/* Trilho visível (borda + fundo) com a barra de projeção na cor da disciplina. */}
                <div className="absolute inset-x-0 top-0.5 h-3 overflow-hidden rounded-full border border-borda-forte bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: dados ? pct(d.acertosEsperados) : 0,
                      minWidth: dados && d.acertosEsperados > 0 ? "0.5rem" : 0,
                      backgroundColor: "var(--d)",
                    }}
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -top-1 h-6 border-l-2 border-dashed border-bad"
                  style={{ left: pct(d.minimo) }}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-0 size-4 -translate-x-1/2 rotate-45 rounded-sm border-2 border-surface bg-ambar"
                  style={{ left: pct(meta) }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                mínimo {d.minimo} · meta ~{Math.round(meta)}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 border-l-2 border-dashed border-bad" /> mínimo para não ser eliminado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flag aria-hidden="true" className="size-3.5 text-ambar-texto" /> meta (nota-alvo)
        </span>
      </p>

      {abaixo.length > 0 && (
        <p role="status" className="mt-4 flex items-start gap-3 rounded-xl bg-warn-bg p-3 font-semibold text-warn">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            Atenção: {abaixo.map((d) => `${nomeCurtoDisciplina(d.nome)} (mínimo de ${d.minimo} acertos)`).join(" e ")}{" "}
            {abaixo.length === 1 ? "está abaixo do mínimo" : "estão abaixo do mínimo"} por enquanto.
          </span>
        </p>
      )}
    </section>
  );
}
