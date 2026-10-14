"use client";

import { useEffect, useState } from "react";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { DetalhePedido, PaginaPedidos } from "@/types/pedido";
import { ServiceError } from "@/services/errors";

type Estado<T> =
  | { status: "carregando" }
  | { status: "sucesso"; dados: T }
  | { status: "erro"; mensagem: string };

export function useMeusPedidos(service: PedidosService) {
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<Estado<PaginaPedidos>>({
    status: "carregando",
  });
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Estado<DetalhePedido>>({
    status: "carregando",
  });
  const [versaoLista, setVersaoLista] = useState(0);
  const [versaoDetalhe, setVersaoDetalhe] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setLista({ status: "carregando" });
    service
      .listarMeus({ pagina, limite: 10 })
      .then((dados) => {
        if (!cancelado) setLista({ status: "sucesso", dados });
      })
      .catch(() => {
        if (!cancelado)
          setLista({
            status: "erro",
            mensagem: "Não foi possível carregar seus pedidos.",
          });
      });
    return () => {
      cancelado = true;
    };
  }, [service, pagina, versaoLista]);

  useEffect(() => {
    if (!pedidoId) return;
    let cancelado = false;
    setDetalhe({ status: "carregando" });
    service
      .obter(pedidoId)
      .then((dados) => {
        if (!cancelado) setDetalhe({ status: "sucesso", dados });
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        const naoEncontrado =
          error instanceof ServiceError &&
          ["PEDIDO_NAO_ENCONTRADO", "NAO_ENCONTRADO"].includes(error.code);
        setDetalhe({
          status: "erro",
          mensagem: naoEncontrado
            ? "Pedido não encontrado."
            : "Não foi possível carregar este pedido.",
        });
      });
    return () => {
      cancelado = true;
    };
  }, [service, pedidoId, versaoDetalhe]);

  return {
    pagina,
    lista,
    pedidoId,
    detalhe,
    mudarPagina: (nova: number) => {
      setLista({ status: "carregando" });
      setPagina(nova);
    },
    selecionar: (id: string) => {
      setDetalhe({ status: "carregando" });
      setPedidoId(id);
    },
    voltar: () => setPedidoId(null),
    recarregarLista: () => setVersaoLista((atual) => atual + 1),
    recarregarDetalhe: () => setVersaoDetalhe((atual) => atual + 1),
  };
}
