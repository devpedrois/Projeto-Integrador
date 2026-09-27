"use client";

import { useState } from "react";

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

const VARIANTES = {
  destaque: {
    moldura: "w-[148px] shadow-md sm:w-[200px] lg:w-[240px]",
    iniciais: "text-[44px] text-barro-700 sm:text-[64px]",
  },
  previa: {
    moldura: "w-[148px] shadow-[0_0_0_4px_var(--color-surface-card)]",
    iniciais: "text-[44px] text-barro-800",
  },
};

interface RetratoArtesaoProps {
  nome: string;
  fotoUrl: string | null;
  variante?: keyof typeof VARIANTES;
}

export function RetratoArtesao({ nome, fotoUrl, variante = "destaque" }: RetratoArtesaoProps) {
  const [falhou, setFalhou] = useState(false);
  const mostrarFoto = fotoUrl !== null && !falhou;
  const estilo = VARIANTES[variante];

  return (
    <div
      className={`aspect-[4/5] flex-none overflow-hidden rounded-[999px_999px_14px_14px] bg-barro-100 ${estilo.moldura}`}
    >
      {mostrarFoto ? (
        <img
          src={fotoUrl}
          alt={nome}
          onError={() => setFalhou(true)}
          className="block size-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`grid size-full place-items-center font-display font-semibold tracking-tight ${estilo.iniciais}`}
        >
          {iniciais(nome)}
        </span>
      )}
    </div>
  );
}