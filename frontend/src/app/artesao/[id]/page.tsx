"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PerfilArtesaoPublico } from "@/components/artesao/PerfilArtesaoPublico";
import {
  obterOpcoesFiltroService,
  obterPerfilArtesaoService,
  obterProdutosService,
  obterUsuariosService,
} from "@/services/fake/container";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

export default function PerfilPublicoArtesaoPage() {
  const params = useParams<{ id: string }>();
  const artesaoId = typeof params.id === "string" ? params.id : null;

  const [usuariosService, setUsuariosService] = useState<UsuariosService | null>(null);
  const [perfilArtesaoService, setPerfilArtesaoService] =
    useState<PerfilArtesaoService | null>(null);
  const [produtosService, setProdutosService] = useState<ProdutosService | null>(null);
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);

  useEffect(() => {
    setUsuariosService(obterUsuariosService());
    setPerfilArtesaoService(obterPerfilArtesaoService());
    setProdutosService(obterProdutosService());
    setOpcoesFiltroService(obterOpcoesFiltroService());
  }, []);

  return (
    <main className="min-h-screen">
      <PerfilArtesaoPublico
        usuariosService={usuariosService}
        perfilArtesaoService={perfilArtesaoService}
        produtosService={produtosService}
        opcoesFiltroService={opcoesFiltroService}
        artesaoId={artesaoId}
      />
    </main>
  );
}
