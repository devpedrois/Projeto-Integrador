"use client";

import { useEffect, useState } from "react";
import { LayoutAutenticacao } from "@/components/autenticacao/LayoutAutenticacao";
import { CadastroForm } from "@/components/cadastro/CadastroForm";
import {
  obterSessionStore,
  obterUsuariosService,
} from "@/services/fake/container";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { SessionStore } from "@/store/sessao.store";

export default function CadastroPage() {
  const [service, setService] = useState<UsuariosService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    setService(obterUsuariosService());
    setSessionStore(obterSessionStore());
  }, []);

  return (
    <LayoutAutenticacao imagemNoMobile="oculta">
      <div className="flex w-full max-w-[440px] flex-col gap-4 pt-2 md:gap-5 md:pt-0">
        <h1 className="m-0 text-[34px] leading-[1.1] tracking-[-0.015em] md:text-[52px] md:leading-[1.04]">
          Cadastro
        </h1>
        {service && sessionStore ? (
          <CadastroForm service={service} sessionStore={sessionStore} />
        ) : null}
      </div>
    </LayoutAutenticacao>
  );
}
