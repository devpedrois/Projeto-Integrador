"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DetalheProduto } from "@/components/produto/DetalheProduto";
import {
  obterAvaliacoesService,
  obterCarrinhoStore,
  obterOpcoesFiltroService,
  obterProdutosService,
  obterRecomendacoesService,
  obterSessionStore,
  obterUsuariosService,
} from "@/services/fake/container";
import { ServiceError } from "@/services/errors";
import { useSessao } from "@/hooks/use-sessao";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { CartStore } from "@/store/carrinho.store";
import type { Produto } from "@/types/produto";

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

const MENSAGEM_ADICIONADO = "Produto adicionado ao carrinho.";

export default function PaginaProduto() {
  const params = useParams<{ id: string }>();
  const produtoId = typeof params.id === "string" ? params.id : null;

  const [produtosService, setProdutosService] =
    useState<ProdutosService | null>(null);
  const [avaliacoesService, setAvaliacoesService] =
    useState<AvaliacoesService | null>(null);
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);
  const [usuariosService, setUsuariosService] =
    useState<UsuariosService | null>(null);
  const [recomendacoesService, setRecomendacoesService] =
    useState<RecomendacoesService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);
  const [erroCarrinho, setErroCarrinho] = useState<string | undefined>(
    undefined,
  );
  const [mensagemCarrinho, setMensagemCarrinho] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    setProdutosService(obterProdutosService());
    setAvaliacoesService(obterAvaliacoesService());
    setOpcoesFiltroService(obterOpcoesFiltroService());
    setUsuariosService(obterUsuariosService());
    setRecomendacoesService(obterRecomendacoesService());
    setSessionStore(obterSessionStore());
  }, []);

  useEffect(() => {
    setErroCarrinho(undefined);
    setMensagemCarrinho(undefined);
  }, [produtoId]);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    if (!sessionStore) return;
    setCarrinhoStore(obterCarrinhoStore(sessao?.id));
  }, [sessionStore, sessao?.id]);

  async function adicionarAoCarrinho(produto: Produto): Promise<void> {
    try {
      if (sessao && sessao.papel !== "comprador")
        throw new ServiceError(
          "ACESSO_NEGADO",
          "Somente compradores podem adicionar ao carrinho.",
        );
      if (!carrinhoStore) return;
      await carrinhoStore.adicionar(produto, 1);
      setErroCarrinho(undefined);
      setMensagemCarrinho(MENSAGEM_ADICIONADO);
    } catch (excecao) {
      setMensagemCarrinho(undefined);
      setErroCarrinho(
        excecao instanceof ServiceError
          ? excecao.message
          : "Não foi possível adicionar ao carrinho.",
      );
    }
  }

  return (
    <main className="min-h-screen">
      <DetalheProduto
        key={produtoId ?? ""}
        produtoId={produtoId}
        produtosService={produtosService}
        avaliacoesService={avaliacoesService}
        opcoesFiltroService={opcoesFiltroService}
        usuariosService={usuariosService}
        recomendacoesService={recomendacoesService}
        onAdicionarAoCarrinho={adicionarAoCarrinho}
        erroCarrinho={erroCarrinho}
        mensagemCarrinho={mensagemCarrinho}
      />
    </main>
  );
}
