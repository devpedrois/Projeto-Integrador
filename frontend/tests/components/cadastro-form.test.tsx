import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CadastroForm } from "@/components/cadastro/CadastroForm";
import { ServiceError } from "@/services/errors";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { UsuarioPublico } from "@/types/usuario";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function preencher(
  senha = "senha1234",
  overrides: { nome?: string; email?: string } = {}
) {
  return {
    nome: overrides.nome ?? "Maria Artesa",
    email: overrides.email ?? "maria@origem.test",
    senha,
  };
}

function criarServicoFake(
  registerImpl?: UsuariosService["register"]
): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    register:
      registerImpl ??
      vi.fn<UsuariosService["register"]>().mockResolvedValue({
        id: "novo-1",
        nome: "Maria Artesa",
        email: "maria@origem.test",
        papel: "comprador",
        ativo: true,
      } satisfies UsuarioPublico),
  };
}

beforeEach(() => {
  pushMock.mockClear();
});

describe("CadastroForm", () => {
  it("possui labels associadas a cada campo", () => {
    render(<CadastroForm service={criarServicoFake()} />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/papel/i)).toBeInTheDocument();
  });

  it("o seletor de papel oferece somente comprador e artesao", () => {
    render(<CadastroForm service={criarServicoFake()} />);

    const seletor = screen.getByLabelText(/papel/i);
    const opcoes = within(seletor).getAllByRole("option");
    const valoresSelecionaveis = opcoes
      .map((opcao) => opcao as HTMLOptionElement)
      .filter((opcao) => !opcao.disabled)
      .map((opcao) => opcao.value);

    expect(valoresSelecionaveis).toEqual(["comprador", "artesao"]);
    expect(valoresSelecionaveis).not.toContain("admin");
  });

  it("cadastro valido chama o service e redireciona para login com confirmacao", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>().mockResolvedValue({
      id: "novo-1",
      nome: "Maria Artesa",
      email: "maria@origem.test",
      papel: "comprador",
      ativo: true,
    });
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/email/i), dados.email);
    await user.type(screen.getByLabelText(/senha/i), dados.senha);
    await user.selectOptions(screen.getByLabelText(/papel/i), "comprador");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => expect(registerSpy).toHaveBeenCalledTimes(1));
    expect(registerSpy).toHaveBeenCalledWith({
      nome: dados.nome,
      email: dados.email,
      senha: dados.senha,
      papel: "comprador",
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/login?cadastro=sucesso")
    );
  });

  it("senha curta bloqueia envio e mostra erro no campo", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>();
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm service={service} />);

    const dados = preencher("curta12");
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/email/i), dados.email);
    await user.type(screen.getByLabelText(/senha/i), dados.senha);
    await user.selectOptions(screen.getByLabelText(/papel/i), "comprador");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(
      await screen.findByText(/oito caracteres/i)
    ).toBeInTheDocument();
    expect(registerSpy).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("foca o primeiro campo invalido apos tentativa de envio", async () => {
    const user = userEvent.setup();
    render(<CadastroForm service={criarServicoFake()} />);

    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => expect(screen.getByLabelText(/nome/i)).toHaveFocus());
  });

  it("mostra loading e desabilita o botao durante o envio", async () => {
    const user = userEvent.setup();
    let resolver: (value: UsuarioPublico) => void = () => {};
    const pendente = new Promise<UsuarioPublico>((resolve) => {
      resolver = resolve;
    });
    const registerSpy = vi
      .fn<UsuariosService["register"]>()
      .mockReturnValue(pendente);
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/email/i), dados.email);
    await user.type(screen.getByLabelText(/senha/i), dados.senha);
    await user.selectOptions(screen.getByLabelText(/papel/i), "comprador");

    const botao = screen.getByRole("button", { name: /cadastrar/i });
    await user.click(botao);

    expect(botao).toBeDisabled();
    expect(screen.getByText(/enviando/i)).toBeInTheDocument();

    resolver({
      id: "novo-1",
      nome: dados.nome,
      email: dados.email,
      papel: "comprador",
      ativo: true,
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("email ja cadastrado associa a mensagem ao campo email", async () => {
    const user = userEvent.setup();
    const registerSpy = vi
      .fn<UsuariosService["register"]>()
      .mockRejectedValue(
        new ServiceError("EMAIL_JA_CADASTRADO", "Este email ja esta cadastrado.")
      );
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/email/i), dados.email);
    await user.type(screen.getByLabelText(/senha/i), dados.senha);
    await user.selectOptions(screen.getByLabelText(/papel/i), "comprador");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    const campoEmail = await screen.findByLabelText(/email/i);
    await waitFor(() => expect(campoEmail).toHaveAttribute("aria-invalid", "true"));
    const idDescricao = campoEmail.getAttribute("aria-describedby");
    expect(idDescricao).toBeTruthy();
    expect(document.getElementById(idDescricao as string)).toHaveTextContent(
      /ja esta cadastrado/i
    );
    expect(campoEmail).toHaveFocus();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("mostra erro recuperavel quando o service falha", async () => {
    const user = userEvent.setup();
    const registerSpy = vi
      .fn<UsuariosService["register"]>()
      .mockRejectedValue(
        new ServiceError("CADASTRO_INDISPONIVEL", "Falha ao cadastrar.")
      );
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/email/i), dados.email);
    await user.type(screen.getByLabelText(/senha/i), dados.senha);
    await user.selectOptions(screen.getByLabelText(/papel/i), "comprador");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nao foi possivel concluir o cadastro/i
    );
    const botao = screen.getByRole("button", { name: /cadastrar/i });
    expect(botao).not.toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
