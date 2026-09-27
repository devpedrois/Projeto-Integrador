"use client";

import { useEffect, useState } from "react";
import { Icone } from "@/components/vitrine/Icone";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import type { ProdutosService } from "@/services/contracts/produtos.contract";

export function MiniaturaProduto({
  produtoId,
  produtosService,
}: {
  produtoId: string;
  produtosService: ProdutosService | null;
}) {
  const [capaUrl, setCapaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!produtosService) return;
    let cancelado = false;

    produtosService
      .obterPublico(produtoId)
      .then((produto) => {
        if (cancelado || !produto) return;
        const capa = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
        setCapaUrl(fotoUrlSegura(capa?.url));
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [produtosService, produtoId]);

  return (
    <span
      aria-hidden="true"
      className="grid size-[60px] flex-none place-items-center overflow-hidden rounded-sm bg-linho-100 text-fg-subtle sm:size-[72px]"
    >
      {capaUrl ? (
        <img src={capaUrl} alt="" className="size-full object-cover" />
      ) : (
        <Icone nome="pacote" tamanho={22} className="opacity-75" />
      )}
    </span>
  );
}
