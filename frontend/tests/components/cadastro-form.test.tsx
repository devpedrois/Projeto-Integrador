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
    login: vi.fn(),
  };
}

beforeEach(() => {
  pushMock.mockClear();
});

describe("CadastroForm", () => {
  it("possui labels associadas a cada campo", () => {
    render(<CadastroForm service={criarServicoFake()} />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /papel/i })).toBeInTheDocument();
  });

  it("o seletor de papel oferece somente comprador e artesao, com comprador marcado", () => {
    render(<CadastroForm service={criarServicoFake()} />);

    const grupo = screen.getByRole("radiogroup", { name: /papel/i });
    const opcoes = within(grupo).getAllByRole("radio");

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(["Comprador", "Artesão"]);
    expect(within(grupo).getByRole("radio", { name: "Comprador" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("escolher artesao envia o papel artesao", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>().mockResolvedValue({
      id: "novo-2",
      nome: "Maria Artesa",
      email: "maria@origem.test",
      papel: "artesao",
      ativo: true,
    });
    render(<CadastroForm service={criarServicoFake(registerSpy)} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("radio", { name: "Artesão" }));

    expect(screen.getByRole("radio", { name: "Artesão" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() =>
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ papel: "artesao" }))
    );
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
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
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
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
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
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);

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
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    const campoEmail = await screen.findByLabelText(/e-mail/i);
    await waitFor(() => expect(campoEmail).toHaveAttribute("aria-invalid", "true"));
    const idDescricao = campoEmail.getAttribute("aria-describedby");
    expect(idDescricao).toBeTruthy();
    expect(document.getElementById(idDescricao as string)).toHaveTextContent(
      "Este e-mail já está cadastrado. Use outro e-mail."
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
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível concluir o cadastro. Tente novamente em instantes."
    );
    const botao = screen.getByRole("button", { name: /cadastrar/i });
    expect(botao).not.toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
