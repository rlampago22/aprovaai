"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  FileJson,
  FileUp,
  SearchCheck,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { useStore } from "@/components/StoreProvider";
import { processarImportacaoJson, type ResultadoImportacaoJson } from "@/lib/queries";

const EXEMPLO_JSON = `[
  {
    "disciplina": "Legislação",
    "topico_ordem": 2,
    "enunciado": "Conforme a Lei nº 8.112/1990, qual é o prazo para a posse após a publicação do ato de provimento?",
    "texto_base": null,
    "alternativas": [
      { "letra": "A", "texto": "15 dias.", "explicacao": "Incorreta. 15 dias é o prazo para entrar em exercício após a posse (art. 15, § 1º)." },
      { "letra": "B", "texto": "30 dias.", "explicacao": "Correta. A posse ocorrerá no prazo de 30 dias contados da publicação do ato de provimento (art. 13, § 1º)." },
      { "letra": "C", "texto": "45 dias.", "explicacao": "Incorreta. A Lei nº 8.112/1990 não fixa prazo de 45 dias para a posse." },
      { "letra": "D", "texto": "60 dias.", "explicacao": "Incorreta. O prazo legal da posse é de 30 dias (art. 13, § 1º)." }
    ],
    "correta": "B",
    "dificuldade": 1,
    "fonte": "Questão manual",
    "origem": "manual",
    "revisada": true
  }
]`;

export default function ImportadorQuestoes() {
  const { catalogo, estado, substituirEstado } = useStore();
  const [texto, setTexto] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoJson | null>(null);
  const pendente = false;
  const inputArqRef = useRef<HTMLInputElement>(null);

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    if (!arq) return;
    setNomeArquivo(arq.name);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setTexto(reader.result);
    };
    reader.readAsText(arq, "utf-8");
  }

  function validar() {
    if (!catalogo) return;
    const { resultado: r } = processarImportacaoJson(catalogo, estado, texto, true);
    setResultado(r);
  }

  function importar() {
    if (!catalogo) return;
    const { resultado: r, estado: novo } = processarImportacaoJson(catalogo, estado, texto, false);
    setResultado(r);
    if (r.ok && r.novas > 0) substituirEstado(novo);
  }

  function limpar() {
    setTexto("");
    setNomeArquivo(null);
    setResultado(null);
    if (inputArqRef.current) inputArqRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="h-enviar" className="cartao space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-enviar" className="rotulo-secao flex items-center gap-2">
            <FileJson aria-hidden="true" className="size-4 text-accent-texto" />
            Enviar arquivo ou colar JSON
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTexto(EXEMPLO_JSON);
                setNomeArquivo("exemplo.json");
                setResultado(null);
              }}
              className="btn !min-h-9 !px-3 text-xs"
            >
              Carregar exemplo
            </button>
            {texto && (
              <button type="button" onClick={limpar} className="btn !min-h-9 !px-3 text-xs text-muted">
                <Trash2 aria-hidden="true" className="size-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-borda-forte bg-bg/60 p-3.5">
          <label className="btn !min-h-10 cursor-pointer text-sm">
            <FileUp aria-hidden="true" className="size-4" />
            Escolher arquivo .json
            <input
              ref={inputArqRef}
              type="file"
              accept=".json,application/json"
              onChange={aoEscolherArquivo}
              className="sr-only"
            />
          </label>
          <span className="text-sm text-muted">
            {nomeArquivo ? `Arquivo carregado: ${nomeArquivo}` : "Ou cole o JSON diretamente no campo abaixo."}
          </span>
        </div>

        <div>
          <label htmlFor="json-questoes" className="mb-1.5 block text-sm font-semibold text-fg">
            Conteúdo JSON (array de questões)
          </label>
          <textarea
            id="json-questoes"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setResultado(null);
            }}
            rows={12}
            spellCheck={false}
            placeholder='[ { "disciplina": "Legislação", "topico_ordem": 1, "enunciado": "...", ... } ]'
            className="campo font-mono text-xs leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={validar}
            disabled={pendente || !texto.trim()}
            className="btn"
          >
            <SearchCheck aria-hidden="true" className="size-4" />
            {pendente ? "Verificando…" : "Validar e ver prévia"}
          </button>
          <button
            type="button"
            onClick={importar}
            disabled={pendente || !texto.trim()}
            className="btn btn-primario"
          >
            <Upload aria-hidden="true" className="size-4" />
            {pendente ? "Importando…" : "Importar para o banco"}
          </button>
          <span className="text-xs text-muted">
            Duplicadas são ignoradas automaticamente e seu progresso nunca é apagado.
          </span>
        </div>

        {/* Resultado da validação ou importação */}
        {resultado && !resultado.ok && (
          <div role="alert" className="space-y-2 rounded-xl bg-bad-bg p-4 text-bad">
            <p className="flex items-center gap-2 font-bold">
              <ShieldAlert aria-hidden="true" className="size-5 shrink-0" />
              Validação encontrou {resultado.erros.length}{" "}
              {resultado.erros.length === 1 ? "erro" : "erros"} — nada foi gravado no banco
            </p>
            <ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
              {resultado.erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {resultado && resultado.ok && (
          <div
            role="status"
            className={`space-y-2 rounded-xl p-4 ${
              resultado.modo === "importado" ? "bg-ok-bg text-ok" : "bg-accent-suave text-fg"
            }`}
          >
            <p className="flex items-center gap-2 font-bold">
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
              {resultado.modo === "importado"
                ? resultado.novas > 0
                  ? `Importação concluída: ${resultado.novas} ${resultado.novas === 1 ? "questão nova adicionada" : "questões novas adicionadas"} (total no banco: ${resultado.totalBanco}).`
                  : `Nenhuma questão nova adicionada — todas as ${resultado.duplicadas} já estavam no banco.`
                : `JSON válido! ${resultado.totalArquivo} ${resultado.totalArquivo === 1 ? "questão verificada" : "questões verificadas"}: ${resultado.novas} ${resultado.novas === 1 ? "nova" : "novas"} e ${resultado.duplicadas} ${resultado.duplicadas === 1 ? "duplicada" : "duplicadas"}.`}
            </p>
            <p className="text-sm">
              Por disciplina:{" "}
              {resultado.porDisciplina.map((d) => `${d.disciplina} (${d.quantidade})`).join(" · ")}.
            </p>
          </div>
        )}
      </section>

      {/* Guia rápido do formato */}
      <details className="cartao group">
        <summary className="flex cursor-pointer items-center gap-2 font-bold">
          <CircleHelp aria-hidden="true" className="size-5 text-accent-texto" />
          Formato esperado do JSON
        </summary>
        <div className="mt-3 space-y-2 text-sm text-muted">
          <p>
            O arquivo deve ser uma lista (array) de objetos com exatamente <strong className="text-fg">4 alternativas (A–D)</strong>, cada uma com texto e explicação:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <code className="text-fg">disciplina</code>: nome exato (<code className="text-fg">Língua Portuguesa</code>,{" "}
              <code className="text-fg">Legislação</code> ou <code className="text-fg">Conhecimentos Específicos</code>).
            </li>
            <li>
              <code className="text-fg">topico_ordem</code>: número do tópico dentro da disciplina (veja a numeração em{" "}
              <strong className="text-fg">Edital</strong>).
            </li>
            <li>
              <code className="text-fg">enunciado</code>, <code className="text-fg">texto_base</code> (opcional ou{" "}
              <code className="text-fg">null</code>), <code className="text-fg">correta</code> (<code className="text-fg">A</code>–<code className="text-fg">D</code>),{" "}
              <code className="text-fg">fonte</code> e <code className="text-fg">origem</code> (<code className="text-fg">prova_oficial</code>,{" "}
              <code className="text-fg">adaptada</code>, <code className="text-fg">gerada_ia</code> ou{" "}
              <code className="text-fg">manual</code>).
            </li>
            <li>
              <strong className="text-fg">Duplicatas:</strong> o importador compara tópico, enunciado, <code className="text-fg">texto_base</code> e o texto das alternativas — assim questões repetidas são ignoradas com segurança.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}
