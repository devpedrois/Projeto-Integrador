"use client";

import { AlertaErro } from "@/components/feedback/AlertaErro";
import { BOTAO_SECUNDARIO } from "@/components/formulario/estilos-botao";
import type { SessionStore } from "@/store/sessao.store";

export function SessaoIndisponivel({ store }: { store: SessionStore }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <AlertaErro>Não foi possível conferir sua sessão.</AlertaErro>
      <button
        type="button"
        className={BOTAO_SECUNDARIO}
        onClick={() => {
          void store.hidratar();
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
