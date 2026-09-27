"use client";

import { useEffect, useState } from "react";
import { LayoutAutenticacao } from "@/components/autenticacao/LayoutAutenticacao";
import { LoginForm } from "@/components/login/LoginForm";
import { obterSessionStore, obterUsuariosService } from "@/services/fake/container";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { SessionStore } from "@/store/sessao.store";

export default function LoginPage() {
  const [service, setService] = useState<UsuariosService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    setService(obterUsuariosService());
    setSessionStore(obterSessionStore());
  }, []);

  return (
    <LayoutAutenticacao imagemNoMobile="compacta">
      <div className="flex w-full max-w-[420px] flex-col gap-4 md:gap-5">
        <h1 className="m-0 mt-2 text-[34px] leading-[1.1] tracking-[-0.015em] md:mt-0 md:mb-2 md:text-[60px] md:leading-[1.04]">
          Entrar
        </h1>
        {service && sessionStore ? (
          <LoginForm service={service} sessionStore={sessionStore} />
        ) : null}
      </div>
    </LayoutAutenticacao>
  );
}
