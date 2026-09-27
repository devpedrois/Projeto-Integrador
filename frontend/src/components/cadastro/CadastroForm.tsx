"use client";

import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertaErro } from "@/components/feedback/AlertaErro";
import { BotaoEnviar } from "@/components/formulario/BotaoEnviar";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { Icone, type NomeIcone } from "@/components/vitrine/Icone";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import { ServiceError } from "@/services/errors";
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

const OPCOES_PAPEL: { valor: PapelCadastro; rotulo: string; icone: NomeIcone }[] = [
  { valor: "comprador", rotulo: "Comprador", icone: "sacola" },
  { valor: "artesao", rotulo: "Artesão", icone: "mao" },
];

const MENSAGEM_EMAIL_JA_CADASTRADO = "Este e-mail já está cadastrado. Use outro e-mail.";

const MENSAGEM_ERRO_SERVICO =
  "Não foi possível concluir o cadastro. Tente novamente em instantes.";

export function CadastroForm({ service }: CadastroFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<PapelCadastro>("comprador");
  const [erros, setErros] = useState<ErrosCadastro>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refNome = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);
  const refPapel = useRef<HTMLButtonElement>(null);

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
      papel,
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
    } catch (erro) {
      if (erro instanceof ServiceError && erro.code === "EMAIL_JA_CADASTRADO") {
        const errosEmail: ErrosCadastro = { email: MENSAGEM_EMAIL_JA_CADASTRADO };
        flushSync(() => {
          setErros(errosEmail);
          setEnviando(false);
        });
        focarPrimeiroErro(errosEmail);
      } else {
        setErroServico(MENSAGEM_ERRO_SERVICO);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
      {erroServico ? <AlertaErro>{erroServico}</AlertaErro> : null}

      <CampoTexto
        id="cadastro-nome"
        ref={refNome}
        rotulo="Nome"
        name="nome"
        autoComplete="name"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        disabled={enviando}
        erro={erros.nome}
      />

      <CampoTexto
        id="cadastro-email"
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
        id="cadastro-senha"
        ref={refSenha}
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        disabled={enviando}
        erro={erros.senha}
      />

      <div className={`flex flex-col gap-2 ${enviando ? "opacity-60" : ""}`}>
        <span id="cadastro-papel-rotulo" className="text-sm leading-[1.3] font-semibold text-fg-strong">
          Papel
        </span>
        <div
          role="radiogroup"
          aria-labelledby="cadastro-papel-rotulo"
          aria-describedby={erros.papel ? "cadastro-papel-erro" : undefined}
          className="grid grid-cols-2 gap-2.5 md:gap-3"
        >
          {OPCOES_PAPEL.map((opcao) => {
            const marcado = papel === opcao.valor;
            return (
              <button
                key={opcao.valor}
                ref={marcado ? refPapel : undefined}
                type="button"
                role="radio"
                aria-checked={marcado}
                onClick={() => setPapel(opcao.valor)}
                disabled={enviando}
                className={`flex h-[60px] items-center gap-2.5 rounded-md border px-3.5 text-left text-[15px] font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out disabled:cursor-not-allowed md:h-16 md:gap-3 md:px-4 ${
                  marcado
                    ? "border-barro-500 bg-barro-50"
                    : "border-border-strong bg-surface-card hover:bg-action-secondary-hover"
                }`}
              >
                <Icone nome={opcao.icone} tamanho={20} className="flex-none text-fg-brand" />
                <span className="flex-1">{opcao.rotulo}</span>
                {marcado ? (
                  <Icone nome="confirmar" className="flex-none text-barro-600" />
                ) : null}
              </button>
            );
          })}
        </div>
        {erros.papel ? (
          <p id="cadastro-papel-erro" className="m-0 text-[13px] leading-[1.4] text-erro-700">
            {erros.papel}
          </p>
        ) : null}
      </div>

      <BotaoEnviar enviando={enviando}>{enviando ? "Enviando..." : "Cadastrar"}</BotaoEnviar>
    </form>
  );
}
