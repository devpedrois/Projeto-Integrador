"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
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
import { useCarrinho } from "@/hooks/use-carrinho";
import { paraDestinoSeguro } from "@/utils/rota-segura";
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

const CARRINHO_VAZIO = { itens: [], total: 0, atualizadoEm: "" };

const CARRINHO_STORE_INATIVO: CartStore = {
  getSnapshot: () => CARRINHO_VAZIO,
  subscribe: () => () => {},
} as unknown as CartStore;

const MENSAGEM_ADICIONADO = "Produto adicionado ao carrinho.";

export default function PaginaProduto() {
  const params = useParams<{ id: string }>();
  const produtoId = typeof params.id === "string" ? params.id : null;
  const router = useRouter();
  const pathname = usePathname();

  const [produtosService, setProdutosService] = useState<ProdutosService | null>(null);
  const [avaliacoesService, setAvaliacoesService] = useState<AvaliacoesService | null>(null);
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);
  const [usuariosService, setUsuariosService] = useState<UsuariosService | null>(null);
  const [recomendacoesService, setRecomendacoesService] =
    useState<RecomendacoesService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);
  const [erroCarrinho, setErroCarrinho] = useState<string | undefined>(undefined);
  const [mensagemCarrinho, setMensagemCarrinho] = useState<string | undefined>(undefined);

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

  const carrinho = useCarrinho(carrinhoStore ?? CARRINHO_STORE_INATIVO);

  function adicionarAoCarrinho(produto: Produto): void {
    if (!sessao) {
      router.push(`/login?redirect=${encodeURIComponent(paraDestinoSeguro(pathname))}`);
      return;
    }

    try {
      carrinhoStore?.adicionar(produto, 1);
      setErroCarrinho(undefined);
      setMensagemCarrinho(MENSAGEM_ADICIONADO);
    } catch (excecao) {
      if (!(excecao instanceof ServiceError)) throw excecao;
      setMensagemCarrinho(undefined);
      setErroCarrinho(excecao.message);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-4 pt-4 sm:px-6">
        <Link href="/carrinho" className="text-sm underline">
          Carrinho ({carrinho.itens.length})
        </Link>
      </div>
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
