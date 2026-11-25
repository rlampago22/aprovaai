// Cor por disciplina: classe CSS que define --d / --d-bg (ver globals.css).
export function classeDisciplina(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("portugu")) return "disc-pt";
  if (n.includes("legisla")) return "disc-leg";
  if (n.includes("espec")) return "disc-esp";
  return "disc-neutra";
}

/** Nome curto para chips e rótulos apertados. */
export function nomeCurtoDisciplina(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("portugu")) return "Português";
  if (n.includes("legisla")) return "Legislação";
  if (n.includes("espec")) return "Específicos";
  return nome;
}
