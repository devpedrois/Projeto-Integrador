"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { PerfilArtesaoInput } from "@/types/perfil-artesao";
import type { Tecnica } from "@/types/tecnica";
import type { Regiao } from "@/types/regiao";
import {
  HISTORIA_LIMITE_CARACTERES,
  perfilArtesaoValido,
  validarPerfilArtesao,
  type CampoPerfilArtesao,
  type ErrosPerfilArtesao,
} from "@/validators/perfil-artesao.validator";

export interface PerfilArtesaoFormProps {
  service: PerfilArtesaoService;
  opcoesFiltroService: OpcoesFiltroService;
  artesaoId: string;
}

type EstadoCarregamento =
  | { status: "carregando" }
  | { status: "pronto" }
  | { status: "erro"; mensagem: string };

const ORDEM_CAMPOS: CampoPerfilArtesao[] = ["historia", "tecnicaId", "regiaoId", "fotoUrl"];

const MENSAGEM_ERRO_CARREGAMENTO = "Nao foi possivel carregar seu perfil agora.";
const MENSAGEM_ERRO_SALVAR =
  "Nao foi possivel salvar seu perfil. Tente novamente em instantes.";

export function PerfilArtesaoForm({
  service,
  opcoesFiltroService,
  artesaoId,
}: PerfilArtesaoFormProps) {
  const [estadoCarregamento, setEstadoCarregamento] = useState<EstadoCarregamento>({
    status: "carregando",
  });
  const [tentativa, setTentativa] = useState(0);
  const [tecnicas, setTecnicas] = useState<readonly Tecnica[]>([]);
  const [regioes, setRegioes] = useState<readonly Regiao[]>([]);

  const [historia, setHistoria] = useState("");
  const [tecnicaId, setTecnicaId] = useState("");
  const [regiaoId, setRegiaoId] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [erros, setErros] = useState<ErrosPerfilArtesao>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refHistoria = useRef<HTMLTextAreaElement>(null);
  const refTecnica = useRef<HTMLSelectElement>(null);
  const refRegiao = useRef<HTMLSelectElement>(null);
  const refFoto = useRef<HTMLInputElement>(null);

  const refsPorCampo: Record<CampoPerfilArtesao, React.RefObject<HTMLElement | null>> = {
    historia: refHistoria,
    tecnicaId: refTecnica,
    regiaoId: refRegiao,
    fotoUrl: refFoto,
  };

  useEffect(() => {
    let cancelado = false;
    setEstadoCarregamento({ status: "carregando" });

    Promise.all([
      service.obter(artesaoId),
      opcoesFiltroService.tecnicas(),
      opcoesFiltroService.regioes(),
    ])
      .then(([perfil, tecnicasCarregadas, regioesCarregadas]) => {
        if (cancelado) return;
        setTecnicas(tecnicasCarregadas);
        setRegioes(regioesCarregadas);
        if (perfil) {
          setHistoria(perfil.historia);
          setTecnicaId(perfil.tecnicaId);
          setRegiaoId(perfil.regiaoId);
          setFotoUrl(perfil.fotoUrl ?? "");
        }
        setEstadoCarregamento({ status: "pronto" });
      })
      .catch(() => {
        if (cancelado) return;
        setEstadoCarregamento({ status: "erro", mensagem: MENSAGEM_ERRO_CARREGAMENTO });
      });

    return () => {
      cancelado = true;
    };
  }, [service, opcoesFiltroService, artesaoId, tentativa]);

  function focarPrimeiroErro(errosAtuais: ErrosPerfilArtesao) {
    const primeiroCampo = ORDEM_CAMPOS.find((campo) => errosAtuais[campo]);
    if (!primeiroCampo) return;
    refsPorCampo[primeiroCampo].current?.focus();
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const entrada: PerfilArtesaoInput = {
      historia,
      tecnicaId,
      regiaoId,
      ...(fotoUrl.trim().length > 0 ? { fotoUrl } : {}),
    };

    const errosValidacao = validarPerfilArtesao(entrada);
    setErros(errosValidacao);
    setErroServico(null);
    setMensagemSucesso(null);

    if (!perfilArtesaoValido(errosValidacao)) {
      focarPrimeiroErro(errosValidacao);
      return;
    }

    setEnviando(true);
    try {
      await service.salvar(entrada, artesaoId);
      setMensagemSucesso("Perfil salvo com sucesso.");
    } catch {
      setErroServico(MENSAGEM_ERRO_SALVAR);
    } finally {
      setEnviando(false);
    }
  }

  if (estadoCarregamento.status === "carregando") {
    return (
      <p role="status" className="text-sm text-neutral-600">
        Carregando seu perfil...
      </p>
    );
  }

  if (estadoCarregamento.status === "erro") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {estadoCarregamento.mensagem}
        </p>
        <button
          type="button"
          onClick={() => setTentativa((atual) => atual + 1)}
          className="min-h-11 min-w-11 self-start rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const contador = `${historia.length}/${HISTORIA_LIMITE_CARACTERES}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {erroServico ? (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {erroServico}
        </p>
      ) : null}

      {mensagemSucesso ? (
        <p role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {mensagemSucesso}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="perfil-historia" className="text-sm font-medium">
          Historia
        </label>
        <textarea
          id="perfil-historia"
          ref={refHistoria}
          name="historia"
          value={historia}
          onChange={(evento) => setHistoria(evento.target.value)}
          aria-invalid={Boolean(erros.historia)}
          aria-describedby={erros.historia ? "perfil-historia-erro" : undefined}
          className="min-h-32 rounded border border-gray-300 px-3 py-2"
        />
        <span
          className={
            historia.length > HISTORIA_LIMITE_CARACTERES
              ? "text-sm text-red-700"
              : "text-sm text-neutral-500"
          }
        >
          {contador}
        </span>
        {erros.historia ? (
          <p id="perfil-historia-erro" className="text-sm text-red-700">
            {erros.historia}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="perfil-tecnica" className="text-sm font-medium">
          Tecnica principal
        </label>
        <select
          id="perfil-tecnica"
          ref={refTecnica}
          name="tecnicaId"
          value={tecnicaId}
          onChange={(evento) => setTecnicaId(evento.target.value)}
          aria-invalid={Boolean(erros.tecnicaId)}
          aria-describedby={erros.tecnicaId ? "perfil-tecnica-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Selecione
          </option>
          {tecnicas.map((tecnica) => (
            <option key={tecnica.id} value={tecnica.id}>
              {tecnica.nome}
            </option>
          ))}
        </select>
        {erros.tecnicaId ? (
          <p id="perfil-tecnica-erro" className="text-sm text-red-700">
            {erros.tecnicaId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="perfil-regiao" className="text-sm font-medium">
          Regiao
        </label>
        <select
          id="perfil-regiao"
          ref={refRegiao}
          name="regiaoId"
          value={regiaoId}
          onChange={(evento) => setRegiaoId(evento.target.value)}
          aria-invalid={Boolean(erros.regiaoId)}
          aria-describedby={erros.regiaoId ? "perfil-regiao-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Selecione
          </option>
          {regioes.map((regiao) => (
            <option key={regiao.id} value={regiao.id}>
              {regiao.nome}
            </option>
          ))}
        </select>
        {erros.regiaoId ? (
          <p id="perfil-regiao-erro" className="text-sm text-red-700">
            {erros.regiaoId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="perfil-foto" className="text-sm font-medium">
          URL da foto (opcional)
        </label>
        <input
          id="perfil-foto"
          ref={refFoto}
          name="fotoUrl"
          type="text"
          value={fotoUrl}
          onChange={(evento) => setFotoUrl(evento.target.value)}
          aria-invalid={Boolean(erros.fotoUrl)}
          aria-describedby={erros.fotoUrl ? "perfil-foto-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.fotoUrl ? (
          <p id="perfil-foto-erro" className="text-sm text-red-700">
            {erros.fotoUrl}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 min-w-11 rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
