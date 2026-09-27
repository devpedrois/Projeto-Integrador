import Link from "next/link";
import { BOTAO_PRIMARIO_GRANDE } from "@/components/formulario/estilos-botao";
import { CLASSE_VAZIO, IconeVazio } from "@/components/vitrine/EsqueletoProdutos";
import { Icone } from "@/components/vitrine/Icone";

export default function NotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
      <div className={CLASSE_VAZIO}>
        <IconeVazio nome="busca" />
        <h1 className="m-0 font-display text-[32px] leading-[1.1] font-semibold tracking-display text-fg-strong sm:text-[40px]">
          Página não encontrada
        </h1>
        <p className="m-0 max-w-[420px] text-body text-fg-muted">
          A página que você procurou não existe ou foi removida.
        </p>
        <Link href="/" className={BOTAO_PRIMARIO_GRANDE}>
          <Icone nome="voltar" />
          Voltar para a vitrine
        </Link>
      </div>
    </main>
  );
}
