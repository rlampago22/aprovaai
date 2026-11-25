"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Landmark, Play, PlayCircle } from "lucide-react";
import BarraDominio from "@/components/BarraDominio";
import Markdown from "@/components/Markdown";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { classeDisciplina } from "@/lib/disciplinas-ui";
import {
  adicionarConteudo,
  getConteudos,
  getDisciplinas,
  getTopicos,
  removerConteudo,
} from "@/lib/queries";
import { extrairIdYoutube, formatarTempo, parseTempo, urlEmbedYoutube } from "@/lib/youtube";

const ERROS: Record<string, string> = {
  url: "URL do YouTube inválida. Use links watch?v=, youtu.be/ ou /shorts/.",
  tempo: "O fim do vídeo deve ser maior que o início.",
  vazio: "Escreva a nota de teoria antes de salvar.",
};

function EditalInterno() {
  const sp = useSearchParams();
  const { pronto, erro, catalogo, estado, atualizarEstado } = useStore();
  const [erroForm, setErroForm] = useState<{ topicoId: number; codigo: string } | null>(null);

  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const aberto = Number(sp.get("topico")) || 0;
  const disciplinas = getDisciplinas(catalogo);
  const topicos = getTopicos(catalogo, estado);
  const conteudos = getConteudos(catalogo, estado);

  function aoAdicionarVideo(topicoId: number, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const id = extrairIdYoutube(String(fd.get("url") ?? ""));
    if (!id) {
      setErroForm({ topicoId, codigo: "url" });
      return;
    }
    const inicio = parseTempo(String(fd.get("inicio") ?? ""));
    const fim = parseTempo(String(fd.get("fim") ?? ""));
    if (inicio != null && fim != null && fim <= inicio) {
      setErroForm({ topicoId, codigo: "tempo" });
      return;
    }
    const titulo = String(fd.get("titulo") ?? "").trim();
    setErroForm(null);
    atualizarEstado((atual) =>
      adicionarConteudo(atual, {
        topico_id: topicoId,
        tipo: "video",
        titulo: titulo || "Vídeo",
        url: `https://www.youtube.com/watch?v=${id}`,
        inicio_s: inicio,
        fim_s: fim,
        markdown: null,
      }),
    );
    form.reset();
  }

  function aoAdicionarTeoria(topicoId: number, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const md = String(fd.get("markdown") ?? "").trim();
    if (!md) {
      setErroForm({ topicoId, codigo: "vazio" });
      return;
    }
    const titulo = String(fd.get("titulo") ?? "").trim();
    setErroForm(null);
    atualizarEstado((atual) =>
      adicionarConteudo(atual, {
        topico_id: topicoId,
        tipo: "teoria",
        titulo: titulo || "Anotação de teoria",
        url: null,
        inicio_s: null,
        fim_s: null,
        markdown: md,
      }),
    );
    form.reset();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Mapa do edital</h1>
      <p className="text-muted">
        Todos os tópicos do edital, com seu domínio atual. Abra a trilha de um tópico para ler o resumo,
        consultar a fonte oficial, ver vídeos e praticar questões.
      </p>

      {disciplinas.map((d) => {
        const lista = topicos.filter((t) => t.disciplina_id === d.id);
        return (
          <section key={d.id} aria-labelledby={`d${d.id}`} className={`space-y-3 ${classeDisciplina(d.nome)}`}>
            <h2 id={`d${d.id}`} className="flex flex-wrap items-center gap-x-2 text-xl font-extrabold">
              <span aria-hidden="true" className="inline-block h-6 w-1.5 rounded-full bg-d" />
              <span className="text-d">{d.nome}</span>
              <span className="text-sm font-normal text-muted">
                ({d.questoes_prova} questões na prova · mínimo {d.minimo_acertos} acertos)
              </span>
            </h2>
            <ul className="space-y-3">
              {lista.map((t) => {
                const cs = conteudos.filter((c) => c.topico_id === t.id);
                const proprios = cs.filter((c) => c.chave == null);
                const nResumo = cs.filter((c) => c.tipo === "teoria").length;
                const nVideo = cs.filter((c) => c.tipo === "video").length;
                const nFonte = cs.filter((c) => c.tipo === "fonte").length;
                return (
                  <li key={t.id} id={`t${t.id}`} className="cartao !p-0">
                    <Link
                      href={`/edital/${t.id}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-2xl p-4 text-fg no-underline hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="block font-semibold">
                          <span className="text-muted">{t.ordem}.</span> {t.titulo_curto}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-d">
                          {nResumo > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <BookOpen aria-hidden="true" className="size-3.5" /> Resumo
                            </span>
                          )}
                          {nVideo > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <PlayCircle aria-hidden="true" className="size-3.5" /> {nVideo}{" "}
                              {nVideo === 1 ? "vídeo" : "vídeos"}
                            </span>
                          )}
                          {nFonte > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Landmark aria-hidden="true" className="size-3.5" /> Fonte oficial
                            </span>
                          )}
                          {cs.length === 0 && <span className="font-normal text-muted">Sem conteúdo ainda</span>}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <BarraDominio dominio={t.dominio} estado={t.estado} />
                        <span className="text-sm text-muted">
                          {t.n_questoes} {t.n_questoes === 1 ? "questão" : "questões"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-texto">
                          Abrir trilha
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </span>
                      </span>
                    </Link>
                    <details open={aberto === t.id} className="group border-t border-borda">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-semibold text-muted">
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                        Texto do edital e minhas anotações
                      </summary>
                      <div className="space-y-4 border-t border-borda p-4">
                        <p className="text-sm text-muted">{t.texto}</p>
                        <p>
                          {t.n_questoes > 0 ? (
                            <Link href={`/praticar?topico=${t.id}`} className="btn btn-primario">
                              <Play aria-hidden="true" className="size-4" />
                              Praticar este tópico
                            </Link>
                          ) : (
                            <span className="text-muted">Ainda não há questões neste tópico.</span>
                          )}
                        </p>

                        {proprios.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="font-semibold">Adicionados por mim</h3>
                            {proprios.map((c) => {
                              const vid = c.tipo === "video" && c.url ? extrairIdYoutube(c.url) : null;
                              return (
                                <div key={c.id} className="space-y-2 rounded-lg border border-borda p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">
                                      {c.tipo === "video" ? "Vídeo" : "Teoria"}: {c.titulo}
                                      {c.tipo === "video" && c.inicio_s != null && (
                                        <span className="text-sm text-muted">
                                          {" "}
                                          ({formatarTempo(c.inicio_s)}
                                          {c.fim_s != null ? `–${formatarTempo(c.fim_s)}` : ""})
                                        </span>
                                      )}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => atualizarEstado((atual) => removerConteudo(atual, c.id))}
                                      className="btn text-sm"
                                      aria-label={`Remover ${c.titulo}`}
                                    >
                                      Remover
                                    </button>
                                  </div>
                                  {vid && (
                                    <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border border-borda">
                                      <iframe
                                        src={urlEmbedYoutube(vid, c.inicio_s, c.fim_s)}
                                        title={`Vídeo: ${c.titulo}`}
                                        loading="lazy"
                                        allow="encrypted-media; picture-in-picture; fullscreen"
                                        allowFullScreen
                                        className="size-full"
                                      />
                                    </div>
                                  )}
                                  {c.markdown && <Markdown texto={c.markdown} />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {erroForm?.topicoId === t.id && ERROS[erroForm.codigo] && (
                          <p role="alert" className="rounded-lg bg-bad-bg p-3 font-semibold text-bad">
                            {ERROS[erroForm.codigo]}
                          </p>
                        )}

                        <form onSubmit={(e) => aoAdicionarVideo(t.id, e)} className="space-y-3 rounded-lg bg-bg p-3">
                          <h3 className="font-semibold">Adicionar vídeo do YouTube</h3>
                          <div>
                            <label htmlFor={`url${t.id}`} className="mb-1 block text-sm font-medium">
                              Link do vídeo
                            </label>
                            <input id={`url${t.id}`} name="url" type="url" required placeholder="https://www.youtube.com/watch?v=…" className="campo" />
                          </div>
                          <div>
                            <label htmlFor={`vt${t.id}`} className="mb-1 block text-sm font-medium">
                              Título (opcional)
                            </label>
                            <input id={`vt${t.id}`} name="titulo" type="text" className="campo" />
                          </div>
                          <div className="grid max-w-md grid-cols-2 gap-3">
                            <div>
                              <label htmlFor={`ini${t.id}`} className="mb-1 block text-sm font-medium">
                                Início (opcional)
                              </label>
                              <input id={`ini${t.id}`} name="inicio" type="text" placeholder="1:30" className="campo" />
                            </div>
                            <div>
                              <label htmlFor={`fim${t.id}`} className="mb-1 block text-sm font-medium">
                                Fim (opcional)
                              </label>
                              <input id={`fim${t.id}`} name="fim" type="text" placeholder="9:45" className="campo" />
                            </div>
                          </div>
                          <button type="submit" className="btn btn-primario">
                            Adicionar vídeo
                          </button>
                        </form>

                        <form onSubmit={(e) => aoAdicionarTeoria(t.id, e)} className="space-y-3 rounded-lg bg-bg p-3">
                          <h3 className="font-semibold">Adicionar nota de teoria (markdown)</h3>
                          <div>
                            <label htmlFor={`tt${t.id}`} className="mb-1 block text-sm font-medium">
                              Título (opcional)
                            </label>
                            <input id={`tt${t.id}`} name="titulo" type="text" className="campo" />
                          </div>
                          <div>
                            <label htmlFor={`md${t.id}`} className="mb-1 block text-sm font-medium">
                              Nota
                            </label>
                            <textarea id={`md${t.id}`} name="markdown" rows={5} className="campo" placeholder="Use **negrito**, listas com - e títulos com #" />
                          </div>
                          <button type="submit" className="btn btn-primario">
                            Adicionar nota
                          </button>
                        </form>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function EditalPage() {
  return (
    <Suspense fallback={<CarregandoApp />}>
      <EditalInterno />
    </Suspense>
  );
}
