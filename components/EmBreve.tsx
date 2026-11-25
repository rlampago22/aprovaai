import Link from "next/link";
import { CalendarCheck, Hourglass } from "lucide-react";

export default function EmBreve({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
      <div className="cartao flex flex-col items-start gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-ambar-bg text-ambar-texto">
          <Hourglass aria-hidden="true" className="size-6" />
        </span>
        <p className="titulo text-lg font-bold">Em breve.</p>
        <p className="text-muted">{descricao}</p>
        <Link href="/" className="btn mt-1">
          <CalendarCheck aria-hidden="true" className="size-4" />
          Voltar para Hoje
        </Link>
      </div>
    </div>
  );
}
