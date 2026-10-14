"use client";

import { useCallback, useEffect, useState } from "react";
import { obterOpcoesFiltroService } from "@/services/fake/container";
import type { Categoria } from "@/types/categoria";

type EstadoCategorias =
  | { status: "carregando" }
  | { status: "sucesso"; categorias: readonly Categoria[] }
  | { status: "erro" };

export function useCategoriasProduto() {
  const [estado, setEstado] = useState<EstadoCategorias>({
    status: "carregando",
  });
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let cancelado = false;
    setEstado({ status: "carregando" });
    obterOpcoesFiltroService()
      .categorias()
      .then((categorias) => {
        if (!cancelado) setEstado({ status: "sucesso", categorias });
      })
      .catch(() => {
        if (!cancelado) setEstado({ status: "erro" });
      });
    return () => {
      cancelado = true;
    };
  }, [versao]);
  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);
  const categorias = estado.status === "sucesso" ? estado.categorias : [];
  return {
    estado,
    recarregar,
    categorias,
    opcoes: categorias.map(({ id, nome }) => ({ valor: id, rotulo: nome })),
  };
}
