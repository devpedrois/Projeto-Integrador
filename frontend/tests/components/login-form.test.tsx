import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/login/LoginForm";
import { ServiceError } from "@/services/errors";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { UsuarioSessao } from "@/types/sessao";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const SESSAO: UsuarioSessao = { id: "u1", nome: "Ana", email: "u1@origem.test", papel: "comprador" };

function criarServicoFake(loginImpl?: UsuariosService["login"]): UsuariosService {
  return {
    list: vi.fn().mockResolvedValue([]),
    register: vi.fn(),
    login: loginImpl ?? vi.fn<UsuariosService["login"]>().mockResolvedValue(SESSAO),
  };
}

function criarSessionStoreFake(): SessionStore {
  return {
    getSnapshot: vi.fn().mockReturnValue(null),
    subscribe: vi.fn().mockReturnValue(() => {}),
    login: vi.fn(),
    logout: vi.fn(),
  } as unknown as SessionStore;
}

beforeEach(() => {
  pushMock.mockClear();
});

describe("LoginForm", () => {
  it("possui labels associadas a cada campo", () => {
    render(
      <LoginForm service={criarServicoFake()} sessionStore={criarSessionStoreFake()} />
    );

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("login valido chama o service, cria a sessao e redireciona", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.fn<UsuariosService["login"]>().mockResolvedValue(SESSAO);
    const service = criarServicoFake(loginSpy);
    const sessionStore = criarSessionStoreFake();
    render(<LoginForm service={service} sessionStore={sessionStore} />);

    await user.type(screen.getByLabelText(/e-mail/i), "ana@origem.test");
    await user.type(screen.getByLabelText("Senha"), "senha1234");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(loginSpy).toHaveBeenCalledTimes(1));
    expect(loginSpy).toHaveBeenCalledWith({
      email: "ana@origem.test",
      senha: "senha1234",
    });
    await waitFor(() =>
      expect(sessionStore.login).toHaveBeenCalledWith(SESSAO)
    );
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("credenciais invalidas mostram mensagem generica sem apontar o campo", async () => {
    const user = userEvent.setup();
    const loginSpy = vi
      .fn<UsuariosService["login"]>()
      .mockRejectedValue(
        new ServiceError("CREDENCIAIS_INVALIDAS", "Email ou senha invalidos.")
      );
    const service = criarServicoFake(loginSpy);
    const sessionStore = criarSessionStoreFake();
    render(<LoginForm service={service} sessionStore={sessionStore} />);

    await user.type(screen.getByLabelText(/e-mail/i), "ana@origem.test");
    await user.type(screen.getByLabelText("Senha"), "senha-errada");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha incorretos. Confira os dados e tente de novo."
    );
    expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute(
      "aria-invalid",
      "false"
    );
    expect(screen.getByLabelText("Senha")).toHaveAttribute(
      "aria-invalid",
      "false"
    );
    expect(sessionStore.login).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("mostra loading e desabilita o botao durante o envio", async () => {
    const user = userEvent.setup();
    let resolver: (value: UsuarioSessao) => void = () => {};
    const pendente = new Promise<UsuarioSessao>((resolve) => {
      resolver = resolve;
    });
    const loginSpy = vi.fn<UsuariosService["login"]>().mockReturnValue(pendente);
    const service = criarServicoFake(loginSpy);
    const sessionStore = criarSessionStoreFake();
    render(<LoginForm service={service} sessionStore={sessionStore} />);

    await user.type(screen.getByLabelText(/e-mail/i), "ana@origem.test");
    await user.type(screen.getByLabelText("Senha"), "senha1234");
    const botao = screen.getByRole("button", { name: /entrar/i });
    await user.click(botao);

    expect(botao).toBeDisabled();
    expect(screen.getByText(/entrando/i)).toBeInTheDocument();

    resolver(SESSAO);
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("email em formato invalido bloqueia envio e mostra erro no campo", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.fn<UsuariosService["login"]>();
    const service = criarServicoFake(loginSpy);
    render(
      <LoginForm service={service} sessionStore={criarSessionStoreFake()} />
    );

    await user.type(screen.getByLabelText(/e-mail/i), "nao-e-email");
    await user.type(screen.getByLabelText("Senha"), "senha1234");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/email valido/i)).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("oferece link para criar cadastro", () => {
    render(
      <LoginForm service={criarServicoFake()} sessionStore={criarSessionStoreFake()} />
    );

    expect(screen.getByRole("link", { name: /criar cadastro/i })).toHaveAttribute(
      "href",
      "/cadastro"
    );
  });

  it("alterna a visibilidade da senha", async () => {
    const user = userEvent.setup();
    render(
      <LoginForm service={criarServicoFake()} sessionStore={criarSessionStoreFake()} />
    );

    const campoSenha = screen.getByLabelText("Senha");
    expect(campoSenha).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar senha/i }));

    expect(campoSenha).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /ocultar senha/i })).toBeInTheDocument();
  });
});
