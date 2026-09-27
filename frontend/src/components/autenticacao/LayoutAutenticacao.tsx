import Link from "next/link";

type ImagemNoMobile = "compacta" | "destaque" | "oculta";

interface LayoutAutenticacaoProps {
  imagemNoMobile: ImagemNoMobile;
  children: React.ReactNode;
}

const CLASSE_IMAGEM_MOBILE: Record<ImagemNoMobile, string> = {
  compacta: "h-[180px]",
  destaque: "h-[220px]",
  oculta: "hidden md:block",
};

export function LayoutAutenticacao({ imagemNoMobile, children }: LayoutAutenticacaoProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <header className="h-[var(--header-h-mobile)] flex-none border-b border-border-default bg-linho-25/90 md:h-[var(--header-h)]">
        <div className="mx-auto flex h-full max-w-[var(--container-max)] items-center px-[var(--container-pad)]">
          <Link
            href="/"
            className="font-display text-2xl leading-none font-semibold tracking-[-0.02em] text-fg-strong no-underline hover:text-fg-strong md:text-[28px]"
          >
            Origem
          </Link>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[var(--container-max)] flex-1 content-start gap-6 px-[var(--container-pad)] pt-4 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:content-center md:items-center md:gap-20 md:py-6">
        <div
          className={`${CLASSE_IMAGEM_MOBILE[imagemNoMobile]} rounded-card border border-border-subtle bg-surface-card p-2 shadow-card md:order-last md:h-[min(740px,calc(100svh-120px))] md:min-h-[480px] md:p-3`}
        >
          <div
            role="img"
            aria-label="Mãos modelando barro no torno"
            className="size-full rounded-md bg-[url(/maos-barro.png),linear-gradient(160deg,var(--color-barro-300),var(--color-barro-700))] bg-cover bg-center"
          />
        </div>
        {children}
      </main>
    </div>
  );
}
