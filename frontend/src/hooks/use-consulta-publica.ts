"use client";

import { useCallback, useEffect, useState } from "react";

type EstadoConsulta<T> =
  | { status: "carregando" }
  | { status: "sucesso"; dados: T }
  | { status: "erro" };

const INTERVALO_ATUALIZACAO_MS = 15_000;
const abaVisivel = () => document.visibilityState !== "hidden";

export function useConsultaPublica<T>(consulta: (() => Promise<T>) | null) {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    status: "carregando",
  });
  const [tentativa, setTentativa] = useState(0);
  const recarregar = useCallback(() => setTentativa((atual) => atual + 1), []);

  useEffect(() => {
    setEstado({ status: "carregando" });
    if (!consulta) return;
    const consultar = consulta;

    let cancelado = false;
    let emAndamento = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function carregar() {
      if (cancelado || emAndamento || !abaVisivel()) return;
      emAndamento = true;
      clearTimeout(timer);
      try {
        const dados = await consultar();
        if (!cancelado) setEstado({ status: "sucesso", dados });
      } catch {
        if (!cancelado) setEstado({ status: "erro" });
      } finally {
        emAndamento = false;
        if (!cancelado && abaVisivel())
          timer = setTimeout(() => void carregar(), INTERVALO_ATUALIZACAO_MS);
      }
    }

    function retomar() {
      clearTimeout(timer);
      void carregar();
    }

    void carregar();
    document.addEventListener("visibilitychange", retomar);
    window.addEventListener("focus", retomar);
    window.addEventListener("online", retomar);
    return () => {
      cancelado = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", retomar);
      window.removeEventListener("focus", retomar);
      window.removeEventListener("online", retomar);
    };
  }, [consulta, tentativa]);

  return { estado, recarregar };
}
