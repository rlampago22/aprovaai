// Utilidades de YouTube (puras): extrai o ID e monta a URL de incorporação sem cookies.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Aceita youtube.com/watch?v=, youtu.be/, /shorts/ (e /embed/). Retorna o ID ou null. */
export function extrairIdYoutube(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

/** Aceita "90", "1:30" ou "1:02:03" e devolve segundos (ou null se vazio/inválido). */
export function parseTempo(entrada: string | null | undefined): number | null {
  const t = (entrada ?? "").trim();
  if (!t) return null;
  const partes = t.split(":");
  if (partes.length > 3 || partes.some((p) => !/^\d+$/.test(p))) return null;
  return partes.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export function urlEmbedYoutube(id: string, inicio?: number | null, fim?: number | null): string {
  const q = new URLSearchParams();
  if (inicio != null && inicio > 0) q.set("start", String(inicio));
  if (fim != null && fim > 0) q.set("end", String(fim));
  const qs = q.toString();
  return `https://www.youtube-nocookie.com/embed/${id}${qs ? `?${qs}` : ""}`;
}

export function formatarTempo(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(seg).padStart(2, "0")}`;
}
