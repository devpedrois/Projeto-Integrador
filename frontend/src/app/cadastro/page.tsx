"use client";

import { useEffect, useState } from "react";
import { LayoutAutenticacao } from "@/components/autenticacao/LayoutAutenticacao";
import { CadastroForm } from "@/components/cadastro/CadastroForm";
import { obterUsuariosService } from "@/services/fake/container";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

export default function CadastroPage() {
  const [service, setService] = useState<UsuariosService | null>(null);

  useEffect(() => {
    setService(obterUsuariosService());
  }, []);

  return (
    <LayoutAutenticacao imagemNoMobile="oculta">
      <div className="flex w-full max-w-[440px] flex-col gap-4 pt-2 md:gap-5 md:pt-0">
        <h1 className="m-0 text-[34px] leading-[1.1] tracking-[-0.015em] md:text-[52px] md:leading-[1.04]">
          Cadastro
        </h1>
        {service ? <CadastroForm service={service} /> : null}
      </div>
    </LayoutAutenticacao>
  );
}
