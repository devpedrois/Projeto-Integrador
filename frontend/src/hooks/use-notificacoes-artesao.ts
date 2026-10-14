"use client";

import { useEffect, useState } from "react";
import type {
  Notificacao,
  NotificacoesService,
} from "@/services/contracts/notificacoes.contract";

type Estado =
  | { status: "carregando" }
  | { status: "sucesso"; dados: Notificacao[] }
  | { status: "erro" };

export function useNotificacoesArtesao(service: NotificacoesService) {
  const [estado, setEstado] = useState<Estado>({ status: "carregando" });
  const [versao, setVersao] = useState(0);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [erroLeitura, setErroLeitura] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let emAndamento = false;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const carregar = async () => {
      if (cancelado || emAndamento || document.visibilityState === "hidden")
        return;
      emAndamento = true;
      try {
        const dados = await service.listar();
        if (!cancelado) setEstado({ status: "sucesso", dados });
      } catch {
        if (!cancelado) setEstado({ status: "erro" });
      } finally {
        emAndamento = false;
      }
    };
    const acompanharVisibilidade = () => {
      clearInterval(intervalo);
      if (document.visibilityState === "hidden") return;
      void carregar();
      intervalo = setInterval(() => {
        void carregar();
      }, 15_000);
    };
    acompanharVisibilidade();
    document.addEventListener("visibilitychange", acompanharVisibilidade);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", acompanharVisibilidade);
    };
  }, [service, versao]);

  const marcarComoLida = async (id: string) => {
    if (marcando) return;
    setMarcando(id);
    setErroLeitura(false);
    try {
      await service.marcarComoLida(id);
      setEstado((atual) =>
        atual.status === "sucesso"
          ? {
              status: "sucesso",
              dados: atual.dados.map((n) =>
                n.id === id ? { ...n, lida: true } : n,
              ),
            }
          : atual,
      );
      setVersao((atual) => atual + 1);
    } catch {
      setErroLeitura(true);
    } finally {
      setMarcando(null);
    }
  };
  return {
    estado,
    marcando,
    erroLeitura,
    marcarComoLida,
    recarregar: () => setVersao((atual) => atual + 1),
  };
}
