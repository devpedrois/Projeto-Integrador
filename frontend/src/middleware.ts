import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { obterFonteDados } from "@/services/data-source";
import { paraDestinoSeguro } from "@/utils/rota-segura";

export function middleware(request: NextRequest) {
  if (
    obterFonteDados() === "fake" ||
    request.cookies.get("origem_sessao")?.value
  )
    return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set(
    "retorno",
    paraDestinoSeguro(request.nextUrl.pathname + request.nextUrl.search),
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/painel-artesao/:path*", "/admin/:path*", "/minha-conta/:path*"],
};
