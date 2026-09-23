"use client";

import { usePerfilPublicoArtesao } from "@/hooks/use-perfil-publico-artesao";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

function fotoUrlSegura(fotoUrl: string | undefined): string | null {
  if (!fotoUrl) return null;
  try {
    const url = new URL(fotoUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? fotoUrl : null;
  } catch {
    return null;
  }
}

export interface PerfilArtesaoPublicoProps {
  usuariosService: UsuariosService | null;
  perfilArtesaoService: PerfilArtesaoService | null;
  produtosService: ProdutosService | null;
  opcoesFiltroService: OpcoesFiltroService | null;
  artesaoId: string | null;
}

export function PerfilArtesaoPublico({
  usuariosService,
  perfilArtesaoService,
  produtosService,
  opcoesFiltroService,
  artesaoId,
}: PerfilArtesaoPublicoProps) {
  const { estado, recarregar } = usePerfilPublicoArtesao(
    usuariosService,
    perfilArtesaoService,
    produtosService,
    opcoesFiltroService,
    artesaoId
  );

  if (estado.status === "carregando") {
    return (
      <p role="status" className="text-sm text-neutral-600">
        Carregando perfil do artesao...
      </p>
    );
  }

  if (estado.status === "naoEncontrado") {
    return (
      <p role="status" className="text-sm text-neutral-600">
        Artesao nao encontrado.
      </p>
    );
  }

  if (estado.status === "erro") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {estado.mensagem}
        </p>
        <button
          type="button"
          onClick={recarregar}
          className="min-h-11 min-w-11 self-start rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { usuario, perfil, tecnicaNome, regiaoNome, produtos } = estado;
  const fotoUrl = fotoUrlSegura(perfil?.fotoUrl);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={usuario.nome}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : null}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{usuario.nome}</h1>
          {tecnicaNome ? (
            <span className="text-sm text-neutral-600">{tecnicaNome}</span>
          ) : null}
          {regiaoNome ? (
            <span className="text-sm text-neutral-600">{regiaoNome}</span>
          ) : null}
        </div>
      </header>

      {perfil?.historia ? (
        <p className="whitespace-pre-line text-sm text-neutral-700">
          {perfil.historia}
        </p>
      ) : null}

      <section aria-label="Produtos do artesao" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Produtos</h2>

        {produtos.length === 0 ? (
          <p role="status" className="text-sm text-neutral-600">
            Nenhum produto disponivel no momento.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <li
                key={produto.id}
                className="flex flex-col gap-2 rounded border border-gray-200 p-3"
              >
                <span className="block text-sm font-medium">{produto.nome}</span>
                <span className="block text-sm text-neutral-600">
                  R$ {produto.preco.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
