"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  BASE_PATH,
  CHAVE_STORAGE,
  criarEstadoInicial,
  lerEstadoLocal,
  salvarEstadoLocal,
  type CatalogoEstatico,
  type EstadoUsuario,
} from "@/lib/store";

let cacheCatalogo: CatalogoEstatico | null = null;
let promessaCatalogo: Promise<CatalogoEstatico> | null = null;

function carregarCatalogo(): Promise<CatalogoEstatico> {
  if (cacheCatalogo) return Promise.resolve(cacheCatalogo);
  if (!promessaCatalogo) {
    promessaCatalogo = fetch(`${BASE_PATH}/dados/catalogo.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Erro ao carregar catálogo (${res.status})`);
        return res.json() as Promise<CatalogoEstatico>;
      })
      .then((dados) => {
        cacheCatalogo = dados;
        return dados;
      })
      .catch((err) => {
        promessaCatalogo = null;
        throw err;
      });
  }
  return promessaCatalogo;
}

interface StoreContextValue {
  pronto: boolean;
  erro: string | null;
  catalogo: CatalogoEstatico | null;
  estado: EstadoUsuario;
  atualizarEstado: (fn: (atual: EstadoUsuario) => EstadoUsuario) => void;
  substituirEstado: (novo: EstadoUsuario) => void;
  resetarEstado: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [catalogo, setCatalogo] = useState<CatalogoEstatico | null>(() => cacheCatalogo);
  const [estado, setEstado] = useState<EstadoUsuario>(() => criarEstadoInicial());
  const [hidratado, setHidratado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarCatalogo()
      .then((dados) => {
        if (!ativo) return;
        setEstado(lerEstadoLocal());
        setCatalogo(dados);
        setHidratado(true);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar o banco de questões e resumos. Recarregue a página.");
      });

    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAVE_STORAGE) setEstado(lerEstadoLocal());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ativo = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const atualizarEstado = useCallback((fn: (atual: EstadoUsuario) => EstadoUsuario) => {
    setEstado((atual) => {
      const proximo = fn(atual);
      salvarEstadoLocal(proximo);
      return proximo;
    });
  }, []);

  const substituirEstado = useCallback((novo: EstadoUsuario) => {
    salvarEstadoLocal(novo);
    setEstado(novo);
  }, []);

  const resetarEstado = useCallback(() => {
    const limpo = criarEstadoInicial();
    salvarEstadoLocal(limpo);
    setEstado(limpo);
  }, []);

  const pronto = hidratado && catalogo != null;

  return (
    <StoreContext.Provider
      value={{ pronto, erro, catalogo, estado, atualizarEstado, substituirEstado, resetarEstado }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return ctx;
}

export function CarregandoApp({ erro }: { erro?: string | null }) {
  if (erro) {
    return (
      <div role="alert" className="cartao border-bad bg-bad-bg text-bad">
        <p className="font-bold">{erro}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando dados do AprovaAI">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
