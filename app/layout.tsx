import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Marca from "@/components/Marca";
import NavPrincipal from "@/components/NavPrincipal";
import Preferencias from "@/components/Preferencias";
import { StoreProvider } from "@/components/StoreProvider";

const titulos = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const texto = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "AprovaAI", template: "%s · AprovaAI" },
  description: "Estudo para concurso IFFar 2026: rotina diária, 918 questões, resumos e simulados.",
};

const scriptPreferencias = `try{var d=document.documentElement,t=localStorage.getItem("aprovaai-tema"),f=localStorage.getItem("aprovaai-fonte");if(t==="claro"||t==="escuro")d.setAttribute("data-tema",t);if(f==="grande"||f==="maior")d.setAttribute("data-fonte",f)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulos.variable} ${texto.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptPreferencias }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
        >
          Pular para o conteúdo
        </a>
        <header className="sticky top-0 z-30 border-b border-borda bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
            <Marca />
            <div className="hidden md:block">
              <Preferencias />
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-4 md:pb-2">
            <NavPrincipal />
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:pb-10">
          <StoreProvider>{children}</StoreProvider>
        </main>
        <footer className="px-4 pb-24 pt-2 text-center text-sm text-muted md:pb-6">
          AprovaAI · IFFar, Edital 406/2026 · seu progresso fica salvo neste navegador
        </footer>
      </body>
    </html>
  );
}
