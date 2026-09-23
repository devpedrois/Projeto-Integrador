"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { PerfilArtesao } from "@/types/perfil-artesao";
import type { Produto } from "@/types/produto";
import { produtoVisivelPublicamente } from "@/domain/produto-visibilidade";
import { verificarPerfilCompleto } from "@/domain/perfil-artesao-completo";

export interface UsuarioArtesaoPublico {
  id: string;
  nome: string;
}

export interface PerfilPublicoArtesao {
  usuario: UsuarioArtesaoPublico;
  perfil: PerfilArtesao | null;
  perfilCompleto: boolean;
  tecnicaNome: string | null;
  regiaoNome: string | null;
  produtos: Produto[];
}

export type EstadoPerfilPublicoArtesao =
  | { status: "carregando" }
  | { status: "naoEncontrado" }
  | { status: "erro"; mensagem: string }
  | ({ status: "sucesso" } & PerfilPublicoArtesao);

export interface UsePerfilPublicoArtesaoResultado {
  estado: EstadoPerfilPublicoArtesao;
  recarregar: () => void;
}

const MENSAGEM_ERRO_PADRAO =
  "Nao foi possivel carregar o perfil deste artesao agora.";

export function usePerfilPublicoArtesao(
  usuariosService: UsuariosService | null,
  perfilArtesaoService: PerfilArtesaoService | null,
  produtosService: ProdutosService | null,
  opcoesFiltroService: OpcoesFiltroService | null,
  artesaoId: string | null
): UsePerfilPublicoArtesaoResultado {
  const [estado, setEstado] = useState<EstadoPerfilPublicoArtesao>({
    status: "carregando",
  });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (
      !usuariosService ||
      !perfilArtesaoService ||
      !produtosService ||
      !opcoesFiltroService ||
      !artesaoId
    ) {
      setEstado({ status: "carregando" });
      return;
    }

    let cancelado = false;
    setEstado({ status: "carregando" });

    Promise.all([
      usuariosService.list(),
      perfilArtesaoService.obter(artesaoId),
      produtosService.listByArtesao(artesaoId),
      opcoesFiltroService.tecnicas(),
      opcoesFiltroService.regioes(),
    ])
      .then(([usuarios, perfil, produtos, tecnicas, regioes]) => {
        if (cancelado) return;

        const usuario = usuarios.find(
          (candidato) =>
            candidato.id === artesaoId &&
            candidato.papel === "artesao" &&
            candidato.ativo
        );

        if (!usuario) {
          setEstado({ status: "naoEncontrado" });
          return;
        }

        const produtosVisiveis = produtos.filter(produtoVisivelPublicamente);
        const { completo } = verificarPerfilCompleto(perfil);
        const tecnicaNome =
          tecnicas.find((tecnica) => tecnica.id === perfil?.tecnicaId)?.nome ?? null;
        const regiaoNome =
          regioes.find((regiao) => regiao.id === perfil?.regiaoId)?.nome ?? null;

        setEstado({
          status: "sucesso",
          usuario: { id: usuario.id, nome: usuario.nome },
          perfil,
          perfilCompleto: completo,
          tecnicaNome,
          regiaoNome,
          produtos: produtosVisiveis,
        });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro", mensagem: MENSAGEM_ERRO_PADRAO });
      });

    return () => {
      cancelado = true;
    };
  }, [
    usuariosService,
    perfilArtesaoService,
    produtosService,
    opcoesFiltroService,
    artesaoId,
    versao,
  ]);

  const recarregar = useCallback(() => {
    setVersao((atual) => atual + 1);
  }, []);

  return { estado, recarregar };
}
