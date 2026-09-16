"use client";

import { useEffect, useState } from "react";
import { CadastroForm } from "@/components/cadastro/CadastroForm";
import { obterUsuariosService } from "@/services/fake/container";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export default function CadastroPage() {
  const [service, setService] = useState<UsuariosService | null>(null);

  useEffect(() => {
    setService(obterUsuariosService());
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      {service ? <CadastroForm service={service} /> : null}
    </main>
  );
}
