"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { Produto } from "@/types/produto";
import type { ResumoAvaliacoes } from "@/types/avaliacao";

export interface DetalheProdutoCarregado {
  produto: Produto;
  resumo: ResumoAvaliacoes;
  categoriaNome: string | null;
  tecnicaNome: string | null;
  regiaoNome: string | null;
}

export type EstadoDetalheProduto =
  | { status: "carregando" }
  | { status: "indisponivel" }
  | { status: "erro"; mensagem: string }
  | ({ status: "sucesso" } & DetalheProdutoCarregado);

export interface UseDetalheProdutoResultado {
  estado: EstadoDetalheProduto;
  recarregar: () => void;
}

const MENSAGEM_ERRO_PADRAO = "Nao foi possivel carregar este produto agora.";

function nomePorId(opcoes: readonly { id: string; nome: string }[], id: string): string | null {
  return opcoes.find((opcao) => opcao.id === id)?.nome ?? null;
}

export function useDetalheProduto(
  produtosService: ProdutosService | null,
  avaliacoesService: AvaliacoesService | null,
  opcoesFiltroService: OpcoesFiltroService | null,
  produtoId: string | null
): UseDetalheProdutoResultado {
  const [estado, setEstado] = useState<EstadoDetalheProduto>({ status: "carregando" });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!produtosService || !avaliacoesService || !opcoesFiltroService) {
      setEstado({ status: "carregando" });
      return;
    }

    if (!produtoId) {
      setEstado({ status: "indisponivel" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    Promise.all([
      produtosService.obterPublico(produtoId),
      avaliacoesService.resumo(produtoId),
      opcoesFiltroService.categorias(),
      opcoesFiltroService.tecnicas(),
      opcoesFiltroService.regioes(),
    ])
      .then(([produto, resumo, categorias, tecnicas, regioes]) => {
        if (cancelado) return;

        if (!produto) {
          setEstado({ status: "indisponivel" });
          return;
        }

        setEstado({
          status: "sucesso",
          produto,
          resumo,
          categoriaNome: nomePorId(categorias, produto.categoriaId),
          tecnicaNome: nomePorId(tecnicas, produto.tecnicaId),
          regiaoNome: nomePorId(regioes, produto.regiaoId),
        });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [produtosService, avaliacoesService, opcoesFiltroService, produtoId, versao]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}
