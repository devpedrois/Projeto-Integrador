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

export function RetratoArtesao({ nome, fotoUrl }: { nome: string; fotoUrl: string | null }) {
  const [falhou, setFalhou] = useState(false);
  const mostrarFoto = fotoUrl !== null && !falhou;

  return (
    <div className="aspect-[4/5] w-[148px] flex-none overflow-hidden rounded-[999px_999px_14px_14px] bg-barro-100 shadow-md sm:w-[200px] lg:w-[240px]">
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
          className="grid size-full place-items-center font-display text-[44px] font-semibold tracking-tight text-barro-700 sm:text-[64px]"
        >
          {iniciais(nome)}
        </span>
      )}
    </div>
  );
}
