import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  HeartHandshake,
  Landmark,
  Map as MapIcon,
  RotateCcw,
  Route,
  Target,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = { title: "Como estudar" };

const PASSOS: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: MapIcon,
    titulo: "Estude pelo edital",
    texto:
      "O edital é a lista do que pode cair. Estude tópico por tópico, na ordem de importância, e não por apostila inteira. O que não está no edital não precisa de você.",
  },
  {
    icone: Target,
    titulo: "Teoria curta, muitas questões",
    texto:
      "Leia um resumo, veja um vídeo e vá logo para as questões. Questão é onde você descobre o que não sabe e aprende o jeito da banca de perguntar. Teoria demais sem prática dá a sensação de estudar, mas rende pouco.",
  },
  {
    icone: RotateCcw,
    titulo: "Refaça os erros",
    texto:
      "Cada erro é uma dica do que vai cair. Refazer a questão errada no mesmo dia e de novo dias depois (revisão espaçada) é o que fixa de verdade na memória.",
  },
  {
    icone: Landmark,
    titulo: "Leia a lei seca na fonte oficial",
    texto:
      "Em Legislação, a banca cobra o texto da lei. Leia os artigos do edital direto no Planalto (ou no site do órgão), com calma, sublinhando prazos e números. É de graça e é a fonte que vale.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Faça simulados perto da prova",
    texto:
      "Nas últimas semanas, treine como no dia: todas as disciplinas, tempo cronometrado, sem consulta. Isso ensina a controlar o ritmo e mostra onde ainda dá para ganhar pontos.",
  },
];

const FAZ_POR_VOCE: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: CalendarCheck,
    titulo: "Roteiro do dia",
    texto:
      "Você diz quanto tempo tem e como está a energia; o app monta os passos de hoje: aquecimento, estudo dos tópicos que mais valem e fechamento com os erros.",
  },
  {
    icone: HeartHandshake,
    titulo: "Recálculo semanal, sem culpa",
    texto:
      "Faltou um dia? O plano se ajusta e divide o que ficou para os dias que restam, sem exagero. Dia sem estudo não apaga nada do que você já aprendeu.",
  },
  {
    icone: Route,
    titulo: "Trilha por tópico",
    texto:
      "Cada tópico do edital tem resumo, fonte oficial, vídeos curados e questões, nessa ordem. Você só segue a trilha e marca o que concluiu.",
  },
];

export default function ComoEstudar() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="rotulo-secao">Guia rápido</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Primeira vez em concurso?</h1>
        <p className="text-lg text-muted">
          Calma: dá para aprender no seu ritmo. O método é simples e são só cinco passos. Leia em dois minutos e
          volte quando quiser.
        </p>
      </header>

      <section aria-labelledby="h-passos" className="space-y-4">
        <h2 id="h-passos" className="text-xl font-extrabold">
          O método em 5 passos
        </h2>
        <ol className="space-y-3">
          {PASSOS.map((p, i) => {
            const Icone = p.icone;
            return (
              <li key={p.titulo} className="cartao flex gap-4">
                <span
                  aria-hidden="true"
                  className="numero-grande inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-suave text-xl text-accent-texto"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Icone aria-hidden="true" className="size-5 shrink-0 text-accent-texto" />
                    {p.titulo}
                  </h3>
                  <p className="text-muted">{p.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="h-faz" className="cartao cartao-destaque space-y-4">
        <h2 id="h-faz" className="text-xl font-extrabold">
          Como o AprovaAI faz isso por você
        </h2>
        <ul className="space-y-4">
          {FAZ_POR_VOCE.map((f) => {
            const Icone = f.icone;
            return (
              <li key={f.titulo} className="flex gap-3">
                <Icone aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent-texto" />
                <p>
                  <strong>{f.titulo}.</strong> <span className="text-muted">{f.texto}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/" className="btn btn-primario btn-grande w-full sm:w-auto">
            Ver o roteiro de hoje
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
          <Link href="/edital" className="btn btn-grande w-full sm:w-auto">
            Abrir o mapa do edital
          </Link>
        </div>
      </section>
    </div>
  );
}
