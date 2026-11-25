// Utilidades de data (strings YYYY-MM-DD, sem fuso: usa a data local do usuário).

export function hojeISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function utc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Dias inteiros de a até b (positivo se b é depois de a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

export function somarDias(iso: string, n: number): string {
  const t = new Date(utc(iso) + n * 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export function diaDaSemana(iso: string): DiaSemana {
  return DIAS_SEMANA[new Date(utc(iso)).getUTCDay()];
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** dd/mm */
export function formatarDataCurta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/** "2h", "1h30", "45 min" */
export function formatarDuracao(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
}
