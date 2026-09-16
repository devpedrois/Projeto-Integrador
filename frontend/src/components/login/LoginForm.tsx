"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

const MENSAGEM_ERRO_SERVICO =
  "Nao foi possivel entrar. Tente novamente em instantes.";

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
        setErroServico(erro.message);
      } else {
        setErroServico(MENSAGEM_ERRO_SERVICO);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {erroServico ? (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {erroServico}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="login-email"
          ref={refEmail}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          aria-invalid={Boolean(erros.email)}
          aria-describedby={erros.email ? "login-email-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.email ? (
          <p id="login-email-erro" className="text-sm text-red-700">
            {erros.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-senha" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="login-senha"
          ref={refSenha}
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          aria-invalid={Boolean(erros.senha)}
          aria-describedby={erros.senha ? "login-senha-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.senha ? (
          <p id="login-senha-erro" className="text-sm text-red-700">
            {erros.senha}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 min-w-11 rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
