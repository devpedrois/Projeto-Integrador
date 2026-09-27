"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertaErro } from "@/components/feedback/AlertaErro";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { SessionStore } from "@/store/sessao.store";
import { ServiceError } from "@/services/errors";
import type { LoginInput } from "@/types/login";
import {
  loginValido,
  validarLogin,
  type CampoLogin,
  type ErrosLogin,
} from "@/validators/login.validator";

export interface LoginFormProps {
  service: UsuariosService;
  sessionStore: SessionStore;
}

const ORDEM_CAMPOS: CampoLogin[] = ["email", "senha"];

const MENSAGEM_CREDENCIAIS_INVALIDAS =
  "E-mail ou senha incorretos. Confira os dados e tente de novo.";

const MENSAGEM_ERRO_SERVICO =
  "Não foi possível entrar. Tente novamente em instantes.";

export function LoginForm({ service, sessionStore }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<ErrosLogin>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);

  const refsPorCampo: Record<CampoLogin, React.RefObject<HTMLElement | null>> = {
    email: refEmail,
    senha: refSenha,
  };

  function focarPrimeiroErro(errosAtuais: ErrosLogin) {
    const primeiroCampo = ORDEM_CAMPOS.find((campo) => errosAtuais[campo]);
    if (!primeiroCampo) return;
    refsPorCampo[primeiroCampo].current?.focus();
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const entrada: LoginInput = { email, senha };

    const errosValidacao = validarLogin(entrada);
    setErros(errosValidacao);
    setErroServico(null);

    if (!loginValido(errosValidacao)) {
      focarPrimeiroErro(errosValidacao);
      return;
    }

    setEnviando(true);
    try {
      const sessao = await service.login(entrada);
      sessionStore.login(sessao);
      router.push("/");
    } catch (erro) {
      if (erro instanceof ServiceError && erro.code === "CREDENCIAIS_INVALIDAS") {
        setErroServico(MENSAGEM_CREDENCIAIS_INVALIDAS);
      } else {
        setErroServico(MENSAGEM_ERRO_SERVICO);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {erroServico ? <AlertaErro>{erroServico}</AlertaErro> : null}

      <CampoTexto
        id="login-email"
        ref={refEmail}
        rotulo="E-mail"
        name="email"
        type="email"
        placeholder="nome@email.com"
        autoComplete="email"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        disabled={enviando}
        erro={erros.email}
      />

      <CampoTexto
        id="login-senha"
        ref={refSenha}
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        disabled={enviando}
        erro={erros.senha}
      />

      <BotaoEnviar enviando={enviando}>{enviando ? "Entrando…" : "Entrar"}</BotaoEnviar>

      <div className="mt-2 h-px bg-border-default" />
      <p className="m-0 text-center text-[15px] text-fg-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold">
          Criar cadastro
        </Link>
      </p>
    </form>
  );
}
