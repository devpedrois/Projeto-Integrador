"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { CadastroInput, PapelCadastro } from "@/types/cadastro";
import {
  cadastroValido,
  validarCadastro,
  type CampoCadastro,
  type ErrosCadastro,
} from "@/validators/cadastro.validator";

export interface CadastroFormProps {
  service: UsuariosService;
}

const ORDEM_CAMPOS: CampoCadastro[] = ["nome", "email", "senha", "papel"];

const MENSAGEM_ERRO_SERVICO =
  "Nao foi possivel concluir o cadastro. Tente novamente em instantes.";

export function CadastroForm({ service }: CadastroFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<PapelCadastro | "">("");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refNome = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);
  const refPapel = useRef<HTMLSelectElement>(null);

  const refsPorCampo: Record<CampoCadastro, React.RefObject<HTMLElement | null>> = {
    nome: refNome,
    email: refEmail,
    senha: refSenha,
    papel: refPapel,
  };

  function focarPrimeiroErro(errosAtuais: ErrosCadastro) {
    const primeiroCampo = ORDEM_CAMPOS.find((campo) => errosAtuais[campo]);
    if (!primeiroCampo) return;
    refsPorCampo[primeiroCampo].current?.focus();
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const entrada: CadastroInput = {
      nome,
      email,
      senha,
      papel: papel as PapelCadastro,
    };

    const errosValidacao = validarCadastro(entrada);
    setErros(errosValidacao);
    setErroServico(null);

    if (!cadastroValido(errosValidacao)) {
      focarPrimeiroErro(errosValidacao);
      return;
    }

    setEnviando(true);
    try {
      await service.register(entrada);
      router.push("/login?cadastro=sucesso");
    } catch {
      setErroServico(MENSAGEM_ERRO_SERVICO);
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
        <label htmlFor="cadastro-nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="cadastro-nome"
          ref={refNome}
          name="nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "cadastro-nome-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.nome ? (
          <p id="cadastro-nome-erro" className="text-sm text-red-700">
            {erros.nome}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="cadastro-email"
          ref={refEmail}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          aria-invalid={Boolean(erros.email)}
          aria-describedby={erros.email ? "cadastro-email-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.email ? (
          <p id="cadastro-email-erro" className="text-sm text-red-700">
            {erros.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-senha" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="cadastro-senha"
          ref={refSenha}
          name="senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          aria-invalid={Boolean(erros.senha)}
          aria-describedby={erros.senha ? "cadastro-senha-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.senha ? (
          <p id="cadastro-senha-erro" className="text-sm text-red-700">
            {erros.senha}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cadastro-papel" className="text-sm font-medium">
          Papel
        </label>
        <select
          id="cadastro-papel"
          ref={refPapel}
          name="papel"
          value={papel}
          onChange={(evento) => setPapel(evento.target.value as PapelCadastro)}
          aria-invalid={Boolean(erros.papel)}
          aria-describedby={erros.papel ? "cadastro-papel-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Selecione
          </option>
          <option value="comprador">Comprador</option>
          <option value="artesao">Artesao</option>
        </select>
        {erros.papel ? (
          <p id="cadastro-papel-erro" className="text-sm text-red-700">
            {erros.papel}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 min-w-11 rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Cadastrar"}
      </button>
    </form>
  );
}
