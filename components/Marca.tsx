import Link from "next/link";
import { BASE_PATH } from "@/lib/store";

/** Logo (SVG existente) + wordmark "Aprova" + "AI" em verde. */
export default function Marca() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 no-underline" aria-label="AprovaAI, ir para Hoje">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático local */}
      <img src={`${BASE_PATH}/logo-marca.svg`} alt="" width={36} height={36} className="size-9" />
      <span className="titulo text-xl font-extrabold tracking-tight text-fg">
        Aprova<span className="text-verde-ai">AI</span>
      </span>
    </Link>
  );
}
