"use client";

import { useEffect, useState } from "react";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      {service && sessionStore ? (
        <LoginForm service={service} sessionStore={sessionStore} />
      ) : null}
    </main>
  );
}
