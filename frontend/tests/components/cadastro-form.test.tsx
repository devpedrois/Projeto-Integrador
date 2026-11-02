import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CadastroForm } from "@/components/cadastro/CadastroForm";
import { ServiceError } from "@/services/errors";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { UsuarioPublico } from "@/types/usuario";
import { SessionStore } from "@/store/sessao.store";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { HttpUsuariosService } from "@/services/http/usuarios.service";

const pushMock = vi.fn();
let sessionStore: SessionStore;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function preencher(
  senha = "senha1234",
  overrides: { nome?: string; email?: string } = {},
) {
  return {
    nome: overrides.nome ?? "Maria Artesa",
    email: overrides.email ?? "maria@origem.test",
    senha,
  };
}

function criarServicoFake(
  registerImpl?: UsuariosService["register"],
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
  pushMock.mockReset();
  sessionStore = new SessionStore(null);
  window.localStorage.clear();
});

describe("CadastroForm", () => {
  it("exibe aviso de protótipo associado ao campo de senha", () => {
    render(
      <CadastroForm sessionStore={sessionStore} service={criarServicoFake()} />,
    );

    const aviso = screen.getByText(
      "Protótipo acadêmico: não use uma senha que você usa em outros sites.",
    );
    const campoSenha = screen.getByLabelText("Senha");

    expect(campoSenha.getAttribute("aria-describedby")).toContain(aviso.id);
  });

  it("possui labels associadas a cada campo", () => {
    render(
      <CadastroForm sessionStore={sessionStore} service={criarServicoFake()} />,
    );

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /papel/i }),
    ).toBeInTheDocument();
  });

  it("o seletor de papel oferece somente comprador e artesao, com comprador marcado", () => {
    render(
      <CadastroForm sessionStore={sessionStore} service={criarServicoFake()} />,
    );

    const grupo = screen.getByRole("radiogroup", { name: /papel/i });
    const opcoes = within(grupo).getAllByRole("radio");

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      "Comprador",
      "Artesão",
    ]);
    expect(
      within(grupo).getByRole("radio", { name: "Comprador" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("cadastro valido de artesao hidrata sessao e redireciona para painel-artesao", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>().mockResolvedValue({
      id: "novo-2",
      nome: "Maria Artesa",
      email: "maria@origem.test",
      papel: "artesao",
      ativo: true,
    });
    render(
      <CadastroForm
        sessionStore={sessionStore}
        service={criarServicoFake(registerSpy)}
      />,
    );

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("radio", { name: "Artesão" }));

    expect(screen.getByRole("radio", { name: "Artesão" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/painel-artesao"),
    );
    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ papel: "artesao" }),
    );
    expect(sessionStore.getSnapshot()).toEqual({
      id: "novo-2",
      nome: dados.nome,
      email: dados.email,
      papel: "artesao",
    });
    expect(sessionStore.getRestaurandoSnapshot()).toBe(false);
  });

  it("cadastro valido de comprador hidrata sessao e redireciona para vitrine", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>().mockResolvedValue({
      id: "novo-1",
      nome: "Maria Artesa",
      email: "maria@origem.test",
      papel: "comprador",
      ativo: true,
    });
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm sessionStore={sessionStore} service={service} />);

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
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(sessionStore.getSnapshot()).toEqual({
      id: "novo-1",
      nome: dados.nome,
      email: dados.email,
      papel: "comprador",
    });
    expect(sessionStore.getRestaurandoSnapshot()).toBe(false);
    expect(service.login).not.toHaveBeenCalled();
  });

  it("senha curta bloqueia envio e mostra erro no campo", async () => {
    const user = userEvent.setup();
    const registerSpy = vi.fn<UsuariosService["register"]>();
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm sessionStore={sessionStore} service={service} />);

    const dados = preencher("curta12");
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByText(/oito caracteres/i)).toBeInTheDocument();
    expect(registerSpy).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("foca o primeiro campo invalido apos tentativa de envio", async () => {
    const user = userEvent.setup();
    render(
      <CadastroForm sessionStore={sessionStore} service={criarServicoFake()} />,
    );

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
    render(<CadastroForm sessionStore={sessionStore} service={service} />);

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
        new ServiceError(
          "EMAIL_JA_CADASTRADO",
          "Este email ja esta cadastrado.",
        ),
      );
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm sessionStore={sessionStore} service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    const campoEmail = await screen.findByLabelText(/e-mail/i);
    await waitFor(() =>
      expect(campoEmail).toHaveAttribute("aria-invalid", "true"),
    );
    const idDescricao = campoEmail.getAttribute("aria-describedby");
    expect(idDescricao).toBeTruthy();
    expect(document.getElementById(idDescricao as string)).toHaveTextContent(
      "Este e-mail já está cadastrado. Use outro e-mail.",
    );
    expect(campoEmail).toHaveFocus();
    expect(pushMock).not.toHaveBeenCalled();
    expect(sessionStore.getSnapshot()).toBeNull();
    expect(service.login).not.toHaveBeenCalled();
  });

  it("mostra erro recuperavel quando o service falha", async () => {
    const user = userEvent.setup();
    const registerSpy = vi
      .fn<UsuariosService["register"]>()
      .mockRejectedValue(
        new ServiceError("CADASTRO_INDISPONIVEL", "Falha ao cadastrar."),
      );
    const service = criarServicoFake(registerSpy);
    render(<CadastroForm sessionStore={sessionStore} service={service} />);

    const dados = preencher();
    await user.type(screen.getByLabelText(/nome/i), dados.nome);
    await user.type(screen.getByLabelText(/e-mail/i), dados.email);
    await user.type(screen.getByLabelText("Senha"), dados.senha);
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível concluir o cadastro. Tente novamente em instantes.",
    );
    const botao = screen.getByRole("button", { name: /cadastrar/i });
    expect(botao).not.toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("CadastroForm com adapters reais", () => {
  it.each([
    { papel: "comprador" as const, destino: "/" },
    { papel: "artesao" as const, destino: "/painel-artesao" },
  ])(
    "fake cadastra $papel, persiste sessao e navega para $destino",
    async ({ papel, destino }) => {
      const storage = new BrowserSessaoStorage(
        window.localStorage,
        "teste:cadastro:sessao",
      );
      sessionStore = new SessionStore(storage);
      const service = new FakeUsuariosService(
        new BrowserUsuarioRepository(
          window.localStorage,
          "teste:cadastro:usuarios",
        ),
      );
      const user = userEvent.setup();
      render(<CadastroForm service={service} sessionStore={sessionStore} />);
      await user.type(screen.getByLabelText(/nome/i), "Pessoa sintetica");
      await user.type(screen.getByLabelText(/e-mail/i), "pessoa@origem.test");
      await user.type(screen.getByLabelText("Senha"), "senha1234");
      await user.click(
        screen.getByRole("radio", {
          name: papel === "artesao" ? "Artesão" : "Comprador",
        }),
      );
      await user.click(screen.getByRole("button", { name: /cadastrar/i }));
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith(destino));
      expect(sessionStore.getSnapshot()).toMatchObject({
        papel,
        email: "pessoa@origem.test",
      });
      expect(new SessionStore(storage).getSnapshot()).toEqual(
        sessionStore.getSnapshot(),
      );
      expect(sessionStore.getSnapshot()).not.toHaveProperty("senha");
    },
  );

  it("HTTP hidrata sessao pelo cadastro sem chamar login nem usar storage local", async () => {
    const usuario = {
      id: "http-1",
      nome: "Pessoa sintetica",
      email: "pessoa@origem.test",
      papel: "comprador",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json(usuario, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const service = new HttpUsuariosService();
      sessionStore = new SessionStore(null, service);
      const user = userEvent.setup();
      pushMock.mockImplementation(() => {
        expect(sessionStore.getSnapshot()).toEqual(usuario);
        expect(sessionStore.getRestaurandoSnapshot()).toBe(false);
      });
      render(<CadastroForm service={service} sessionStore={sessionStore} />);
      await user.type(screen.getByLabelText(/nome/i), usuario.nome);
      await user.type(screen.getByLabelText(/e-mail/i), usuario.email);
      await user.type(screen.getByLabelText("Senha"), "senha1234");
      await user.click(screen.getByRole("button", { name: /cadastrar/i }));
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        "/api/auth/register",
      ]);
      expect(window.localStorage.length).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
