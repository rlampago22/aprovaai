"use client";

import { Database } from "lucide-react";
import ImportadorQuestoes from "@/components/questoes/ImportadorQuestoes";
import { CarregandoApp, useStore } from "@/components/StoreProvider";
import { classeDisciplina, nomeCurtoDisciplina } from "@/lib/disciplinas-ui";
import { getDisciplinas, getTopicos } from "@/lib/queries";

export default function ImportarQuestoesPage() {
  const { pronto, erro, catalogo, estado } = useStore();
  if (!pronto || !catalogo) return <CarregandoApp erro={erro} />;

  const disciplinas = getDisciplinas(catalogo);
  const topicos = getTopicos(catalogo, estado);

  const porDisciplina = disciplinas.map((d) => ({
    id: d.id,
    nome: d.nome,
    total: topicos
      .filter((t) => t.disciplina_id === d.id)
      .reduce((s, t) => s + t.n_questoes, 0),
  }));
  const totalBanco = porDisciplina.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Importar questões</h1>
        <p className="mt-1 text-muted">
          Adicione novos lotes de questões em JSON direto pelo navegador. Tudo é validado item por item antes de entrar
          no seu banco local.
        </p>
      </header>

      <section aria-label="Resumo do banco atual" className="cartao !p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <Database aria-hidden="true" className="size-4 text-accent-texto" />
            Banco atual: <span className="numero-grande text-xl text-accent-texto">{totalBanco}</span> questões
          </p>
          <div className="flex flex-wrap gap-2">
            {porDisciplina.map((d) => (
              <span key={d.id} className={`chip ${classeDisciplina(d.nome)}`}>
                {nomeCurtoDisciplina(d.nome)}: {d.total}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ImportadorQuestoes />
    </div>
  );
}
