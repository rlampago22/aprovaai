import type { Metadata } from "next";
import { notFound } from "next/navigation";
import topicosMeta from "@/data/topicos-meta.json";
import TrilhaClient from "./TrilhaClient";

export function generateStaticParams() {
  return topicosMeta.map((t) => ({ id: String(t.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = topicosMeta.find((x) => x.id === Number(id));
  return { title: t ? t.titulo_curto : "Tópico" };
}

export default async function TrilhaDoTopicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicoId = Number(id);
  const existe = topicosMeta.some((t) => t.id === topicoId);
  if (!existe) notFound();
  return <TrilhaClient topicoId={topicoId} />;
}
