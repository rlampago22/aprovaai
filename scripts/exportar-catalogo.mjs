// Exporta o catálogo público (sem progresso pessoal) do banco local ../app/data/aprovaai.db
// em modo somente-leitura para public/dados/catalogo.json e data/topicos-meta.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const raiz = path.resolve(import.meta.dirname, "..");
const dbPath = path.resolve(raiz, "..", "app", "data", "aprovaai.db");
const sqlitePath = path.resolve(raiz, "..", "app", "node_modules", "better-sqlite3");

if (!fs.existsSync(dbPath)) {
  console.error(`Banco não encontrado: ${dbPath}`);
  process.exit(1);
}

const Database = require(sqlitePath);
const db = new Database(dbPath, { readonly: true });

const disciplinas = db
  .prepare("SELECT id, nome, questoes_prova, minimo_acertos, ordem FROM disciplina ORDER BY ordem")
  .all();
const topicos = db
  .prepare("SELECT id, disciplina_id, ordem, texto, titulo_curto FROM topico ORDER BY disciplina_id, ordem")
  .all();
const questoes = db
  .prepare(
    "SELECT id, topico_id, enunciado, texto_base, alternativas, correta, fonte, origem, dificuldade, revisada FROM questao ORDER BY id",
  )
  .all()
  .map((q) => ({
    ...q,
    alternativas: JSON.parse(q.alternativas),
    revisada: !!q.revisada,
  }));
const conteudos = db
  .prepare(
    "SELECT id, topico_id, tipo, titulo, url, inicio_s, fim_s, markdown, canal, minutos, chave FROM conteudo WHERE chave IS NOT NULL ORDER BY id",
  )
  .all();

db.close();

fs.mkdirSync(path.join(raiz, "public", "dados"), { recursive: true });
fs.mkdirSync(path.join(raiz, "data"), { recursive: true });
fs.writeFileSync(
  path.join(raiz, "public", "dados", "catalogo.json"),
  JSON.stringify({ disciplinas, topicos, questoes, conteudos }),
);
fs.writeFileSync(
  path.join(raiz, "data", "topicos-meta.json"),
  JSON.stringify(
    topicos.map((t) => ({ id: t.id, titulo_curto: t.titulo_curto })),
    null,
    2,
  ),
);

console.log(
  `Catálogo atualizado: ${disciplinas.length} disciplinas, ${topicos.length} tópicos, ${questoes.length} questões, ${conteudos.length} conteúdos.`,
);
