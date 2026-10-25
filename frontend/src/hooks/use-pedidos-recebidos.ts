"use client";

import { useEffect, useRef, useState } from "react";
import type { PedidosArtesaoService } from "@/services/contracts/pedidos-artesao.contract";
import type { PaginaPedidosRecebidos } from "@/types/pedidos-artesao";
import { ServiceError } from "@/services/errors";

type Estado =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "sucesso"; dados: PaginaPedidosRecebidos };

export function usePedidosRecebidos(service: PedidosArtesaoService) {
  const [offset, setOffset] = useState(0);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<Estado>({ status: "carregando" });
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const emCurso = useRef(false);
  const geracao = useRef(0);

  useEffect(() => {
    let cancelado = false;
    geracao.current += 1;
    setEstado({ status: "carregando" });
    service
      .listar(offset)
      .then((dados) => {
        if (!cancelado) setEstado({ status: "sucesso", dados });
      })
      .catch(() => {
        if (!cancelado) setEstado({ status: "erro" });
      });
    return () => {
      cancelado = true;
      geracao.current += 1;
    };
  }, [service, offset, versao]);

  async function enviar() {
    if (!confirmando || emCurso.current) return;
    emCurso.current = true;
    setSalvando(true);
    setErroEnvio(null);
    const atual = geracao.current;
    try {
      const resultado = await service.enviar(confirmando);
      if (atual !== geracao.current) return;
      setEstado((anterior) =>
        anterior.status !== "sucesso"
          ? anterior
          : {
              status: "sucesso",
              dados: {
                ...anterior.dados,
                itens: anterior.dados.itens.map((pedido) => ({
                  ...pedido,
                  itens: pedido.itens.map((item) =>
                    item.id === resultado.id ? { ...item, ...resultado } : item,
                  ),
                })),
              },
            },
      );
      setConfirmando(null);
    } catch (error: unknown) {
      if (atual !== geracao.current) return;
      const code = error instanceof ServiceError ? error.code : "";
      if (
        [
          "ITEM_JA_ENVIADO",
          "PEDIDO_NAO_CONFIRMADO",
          "ITEM_PEDIDO_NAO_ENCONTRADO",
        ].includes(code)
      ) {
        setConfirmando(null);
        setVersao((v) => v + 1);
        setErroEnvio("O pedido mudou. Confira os dados atualizados.");
      } else
        setErroEnvio("Não foi possível marcar como enviado. Tente novamente.");
    } finally {
      emCurso.current = false;
      if (atual === geracao.current) setSalvando(false);
    }
  }

  return {
    estado,
    offset,
    confirmando,
    salvando,
    erroEnvio,
    enviar,
    confirmar: (id: string | null) => {
      if (!emCurso.current) {
        setConfirmando(id);
        setErroEnvio(null);
      }
    },
    recarregar: () => {
      setConfirmando(null);
      setSalvando(false);
      setVersao((v) => v + 1);
    },
    paginar: (novo: number) => {
      setConfirmando(null);
      setErroEnvio(null);
      setOffset(novo);
    },
  };
}
