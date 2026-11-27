"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleCheck,
  ExternalLink,
  Landmark,
  Play,
  PlayCircle,
  Target,
  Zap,
} from "lucide-react";
import BarraDominio from "@/components/BarraDominio";
import Markdown from "@/components/Markdown";
import ResumoComCronometro from "@/components/edital/ResumoComCronometro";
import VideoComTempo from "@/components/edital/VideoComTempo";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { formatarDuracao } from "@/lib/datas";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import {
  getConteudos,
  getEstudos,
  getTopicos,
  minutosDoConteudo,
  minutosEstimados,
} from "@/lib/queries";
import { extrairSecoes } from "@/lib/resumo";
import { extrairIdYoutube, urlEmbedYoutube } from "@/lib/youtube";

function Etapa({
  n,
  id,
  icone: Icone,
  titulo,
  feito,
  children,
}: {
  n: number;
  id: string;
  icone: typeof BookOpen;
  titulo: string;
  feito?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="cartao space-y-4">
      <h2 id={id} className="flex items-center gap-3 text-xl font-extrabold">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-d font-extrabold text-surface"
        >
          {feito ? <Check className="size-5" /> : n}
        </span>
        <Icone aria-hidden="true" className="size-5 shrink-0 text-d" />
        <span className="min-w-0">{titulo}</span>
        {feito && (
          <span className="ml-auto rounded-full bg-ok-bg px-2.5 py-0.5 text-xs font-semibold text-ok">Concluído</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function TrilhaInterna({ topicoId }: { topicoId: number }) {
  const sp = useSearchParams();
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const topico = getTopicos(catalogo, estado).find((t) => t.id === topicoId);
  if (!topico) {
    return (
      <div className="cartao space-y-3">
        <p className="font-bold">Tópico não encontrado.</p>
        <Link href="/edital" className="btn">
          Voltar ao mapa do edital
        </Link>
      </div>
    );
  }

  const nBruto = Number(sp.get("n"));
  const nPedido = Number.isInteger(nBruto) && nBruto > 0 ? nBruto : undefined;
  const conteudos = getConteudos(catalogo, estado, topico.id);
  const estudos = getEstudos(catalogo, estado, topico.id);
  const resumos = conteudos.filter((c) => c.tipo === "teoria");
  const fontes = conteudos.filter((c) => c.tipo === "fonte");
  const videos = conteudos.filter((c) => c.tipo === "video");
  const nQuestoes = nPedido ? Math.min(nPedido, topico.n_questoes) : topico.n_questoes;
  const expresso = sp.get("expresso") === "1";
  const secoesExpresso = expresso
    ? resumos.flatMap((r) =>
        r.markdown ? extrairSecoes(r.markdown, ["Revisão em 30 segundos", "Como a Fundatec cobra"]) : [],
      )
    : [];
  const hrefPraticar = `/praticar?topico=${topico.id}${nPedido ? `&n=${nQuestoes}` : ""}`;

  return (
    <div className={`space-y-5 ${classeDisciplina(topico.disciplina_nome)}`}>
      <Link href="/edital" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Mapa do edital
      </Link>

      <header className="cartao space-y-3 border-l-8 border-l-d">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <span className="chip">{nomeCurtoDisciplina(topico.disciplina_nome)}</span>
          <span>Tópico {topico.ordem}</span>
        </p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{topico.titulo_curto}</h1>
        <p className="text-muted">
          <span className="font-semibold text-fg">No edital: </span>
          {topico.texto}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <BarraDominio dominio={topico.dominio} estado={topico.estado} />
          <span className="text-sm text-muted">
            {topico.n_questoes} {topico.n_questoes === 1 ? "questão" : "questões"} no banco
          </span>
        </div>
      </header>

      {expresso && (
        <section
          id="expresso"
          aria-labelledby="h-expresso"
          className="cartao scroll-mt-4 space-y-4 border-2 border-accent bg-accent-suave"
        >
          <h2 id="h-expresso" className="flex items-center gap-2 text-xl font-extrabold">
            <Zap aria-hidden="true" className="size-5 text-accent-texto" />
            Resumo expresso (~8 min)
          </h2>
          <p className="text-muted">
            Na reta final, leia só estas duas partes do resumo e vá para as 5 questões. O resumo completo fica logo
            abaixo, se sobrar tempo.
          </p>
          {secoesExpresso.length === 0 && (
            <p className="text-muted">Este tópico ainda não tem essas seções no resumo; leia o resumo abaixo.</p>
          )}
          {secoesExpresso.map((s) => (
            <div key={s.titulo} className="space-y-2 rounded-xl bg-surface p-4">
              <h3 className="font-bold">{s.titulo}</h3>
              <Markdown texto={s.markdown} />
            </div>
          ))}
          {topico.n_questoes > 0 && (
            <Link href={hrefPraticar} className="btn btn-primario btn-grande w-full sm:w-auto">
              <Play aria-hidden="true" className="size-5" />
              Praticar {nQuestoes} {nQuestoes === 1 ? "questão" : "questões"}
            </Link>
          )}
        </section>
      )}

      <Etapa
        n={1}
        id="e-resumo"
        icone={BookOpen}
        titulo="Resumo"
        feito={resumos.length > 0 && resumos.every((r) => !!estudos[r.id])}
      >
        {resumos.length === 0 && (
          <p className="text-muted">
            Ainda não há resumo para este tópico. Use a fonte oficial e os vídeos abaixo.
          </p>
        )}
        {resumos.map((r) => (
          <ResumoComCronometro
            key={r.id}
            conteudoId={r.id}
            minutosPadrao={minutosEstimados(r)}
            feitoEm={estudos[r.id]?.feitoEm}
            minutosSalvos={estudos[r.id]?.minutos}
          >
            {(resumos.length > 1 || r.chave == null) && <h3 className="font-bold">{r.titulo}</h3>}
            {r.markdown && <Markdown texto={r.markdown} />}
          </ResumoComCronometro>
        ))}
      </Etapa>

      <Etapa n={2} id="e-fonte" icone={Landmark} titulo="Fonte oficial">
        {fontes.length === 0 ? (
          <p className="text-muted">Este tópico não tem uma fonte oficial específica; o resumo e os vídeos cobrem o conteúdo.</p>
        ) : (
          <>
            <p className="text-muted">Para a lei seca, o texto oficial manda. Abre em uma nova aba.</p>
            <ul className="space-y-2">
              {fontes.map((f) => (
                <li key={f.id}>
                  <a
                    href={f.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn w-full justify-between text-left sm:w-auto"
                  >
                    <span className="min-w-0 break-words">{f.titulo}</span>
                    <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </Etapa>

      <Etapa
        n={3}
        id="e-videos"
        icone={PlayCircle}
        titulo="Vídeos"
        feito={videos.length > 0 && videos.some((v) => !!estudos[v.id])}
      >
        {videos.length === 0 && <p className="text-muted">Ainda não há vídeo curado para este tópico.</p>}
        {videos.map((v) => {
          const vid = v.url ? extrairIdYoutube(v.url) : null;
          const dur = minutosDoConteudo(v);
          const estudo = estudos[v.id];
          return (
            <div key={v.id} className="space-y-3 rounded-xl border border-borda p-3 sm:p-4">
              <div>
                <h3 className="font-bold">{v.titulo}</h3>
                <p className="text-sm text-muted">
                  {v.canal ? `Canal: ${v.canal}` : "YouTube"}
                  {dur ? ` · ${formatarDuracao(dur)}` : ""}
                </p>
              </div>
              {vid && (
                <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-borda bg-surface-2">
                  <iframe
                    src={urlEmbedYoutube(vid, v.inicio_s, v.fim_s)}
                    title={`Vídeo: ${v.titulo}`}
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="size-full"
                  />
                </div>
              )}
              <VideoComTempo
                conteudoId={v.id}
                duracaoReal={dur}
                minutosPadrao={minutosEstimados(v)}
                estudo={estudo}
              />
            </div>
          );
        })}
      </Etapa>

      <Etapa n={4} id="e-questoes" icone={Target} titulo="Questões">
        {topico.n_questoes > 0 ? (
          <>
            <p className="text-muted">
              Teoria sem questão não fixa. Responda agora, enquanto o assunto está fresco; os erros voltam
              sozinhos na revisão.
            </p>
            <Link href={hrefPraticar} className="btn btn-primario btn-grande w-full sm:w-auto">
              <Play aria-hidden="true" className="size-5" />
              Praticar {nQuestoes} {nQuestoes === 1 ? "questão" : "questões"}
            </Link>
          </>
        ) : (
          <p className="flex items-start gap-2 text-muted">
            <CircleCheck aria-hidden="true" className="mt-1 size-4 shrink-0" />
            Ainda não há questões neste tópico. Enquanto isso, pratique questões mistas em Praticar.
          </p>
        )}
      </Etapa>
    </div>
  );
}

export default function TrilhaClient({ topicoId }: { topicoId: number }) {
  return (
    <Suspense fallback={<CarregandoApp />}>
      <TrilhaInterna topicoId={topicoId} />
    </Suspense>
  );
}
