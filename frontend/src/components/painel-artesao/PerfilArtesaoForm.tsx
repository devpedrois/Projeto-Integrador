"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { RetratoArtesao } from "@/components/artesao/RetratoArtesao";
import { Alerta } from "@/components/feedback/Alerta";
import { CampoAreaTexto } from "@/components/formulario/CampoAreaTexto";
import { CampoSelecao } from "@/components/formulario/CampoSelecao";
import { Giro } from "@/components/formulario/Giro";
import {
  BOTAO_PRIMARIO_GRANDE,
  BOTAO_SECUNDARIO,
} from "@/components/formulario/estilos-botao";
import { Icone } from "@/components/vitrine/Icone";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { PerfilArtesaoInput } from "@/types/perfil-artesao";
import type { Tecnica } from "@/types/tecnica";
import type { Regiao } from "@/types/regiao";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { validarFotoPerfil } from "@/validators/foto-perfil.validator";
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
  nomeArtesao?: string;
}

type EstadoCarregamento =
  | { status: "carregando" }
  | { status: "pronto" }
  | { status: "erro"; mensagem: string };

const ORDEM_CAMPOS: CampoPerfilArtesao[] = [
  "historia",
  "tecnicaId",
  "regiaoId",
  "fotoUrl",
];

const MENSAGEM_ERRO_CARREGAMENTO = "Não foi possível carregar seu perfil.";
const MENSAGEM_ERRO_SALVAR =
  "Não foi possível salvar seu perfil. Tente novamente em instantes.";

export function PerfilArtesaoForm({
  service,
  opcoesFiltroService,
  artesaoId,
  nomeArtesao = "Artesão",
}: PerfilArtesaoFormProps) {
  const [estadoCarregamento, setEstadoCarregamento] =
    useState<EstadoCarregamento>({
      status: "carregando",
    });
  const [tentativa, setTentativa] = useState(0);
  const [tecnicas, setTecnicas] = useState<readonly Tecnica[]>([]);
  const [regioes, setRegioes] = useState<readonly Regiao[]>([]);

  const [historia, setHistoria] = useState("");
  const [tecnicaId, setTecnicaId] = useState("");
  const [regiaoId, setRegiaoId] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previaFoto, setPreviaFoto] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [validandoFoto, setValidandoFoto] = useState(false);
  const selecaoFoto = useRef(0);
  const [erros, setErros] = useState<ErrosPerfilArtesao>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refHistoria = useRef<HTMLTextAreaElement>(null);
  const refTecnica = useRef<HTMLSelectElement>(null);
  const refRegiao = useRef<HTMLSelectElement>(null);
  const refFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!arquivoFoto) {
      setPreviaFoto(null);
      return;
    }
    const url = URL.createObjectURL(arquivoFoto);
    setPreviaFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivoFoto]);

  async function selecionarFoto(arquivo: File | undefined) {
    const selecao = ++selecaoFoto.current;
    setArquivoFoto(null);
    setErroFoto(null);
    setMensagemSucesso(null);
    setValidandoFoto(Boolean(arquivo));
    if (!arquivo) return;
    try {
      await validarFotoPerfil(arquivo);
      if (selecao !== selecaoFoto.current) return;
      setArquivoFoto(arquivo);
    } catch (error: unknown) {
      if (selecao !== selecaoFoto.current) return;
      setErroFoto(error instanceof Error ? error.message : "Foto inválida.");
      if (refFoto.current) refFoto.current.value = "";
    } finally {
      if (selecao === selecaoFoto.current) setValidandoFoto(false);
    }
  }

  const refsPorCampo: Record<
    CampoPerfilArtesao,
    React.RefObject<HTMLElement | null>
  > = {
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
        setEstadoCarregamento({
          status: "erro",
          mensagem: MENSAGEM_ERRO_CARREGAMENTO,
        });
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
    if (enviando || validandoFoto || erroFoto) return;

    const entrada: PerfilArtesaoInput = {
      historia,
      tecnicaId,
      regiaoId,
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
      if (arquivoFoto) {
        if (!service.enviarFoto) throw new Error("Upload indisponível.");
        const salvo = await service.enviarFoto(arquivoFoto, artesaoId);
        setFotoUrl(salvo.fotoUrl ?? "");
        setArquivoFoto(null);
        if (refFoto.current) refFoto.current.value = "";
      }
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
      <p role="status" className="m-0 text-body-sm text-fg-muted">
        Carregando seu perfil...
      </p>
    );
  }

  if (estadoCarregamento.status === "erro") {
    return (
      <div className="flex max-w-[640px] flex-col items-start gap-4">
        <div className="w-full">
          <Alerta tom="erro" titulo={estadoCarregamento.mensagem}>
            Tente novamente em instantes.
          </Alerta>
        </div>
        <button
          type="button"
          onClick={() => setTentativa((atual) => atual + 1)}
          className={BOTAO_SECUNDARIO}
        >
          <Icone nome="recarregar" className="flex-none" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const tecnicaSelecionada = tecnicas.find(
    (tecnica) => tecnica.id === tecnicaId,
  );
  const regiaoSelecionada = regioes.find((regiao) => regiao.id === regiaoId);

  function alterarCampo(definir: (valor: string) => void) {
    return (evento: { target: { value: string } }) => {
      definir(evento.target.value);
      setMensagemSucesso(null);
    };
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 rounded-card border border-border-subtle bg-surface-card p-5 shadow-sm sm:p-8"
      >
        <CampoAreaTexto
          id="perfil-historia"
          ref={refHistoria}
          name="historia"
          rotulo="História"
          rows={5}
          limite={HISTORIA_LIMITE_CARACTERES}
          value={historia}
          onChange={alterarCampo(setHistoria)}
          disabled={enviando}
          erro={erros.historia}
        />
        <CampoSelecao
          id="perfil-tecnica"
          ref={refTecnica}
          name="tecnicaId"
          rotulo="Técnica principal"
          opcoes={tecnicas.map((tecnica) => ({
            valor: tecnica.id,
            rotulo: tecnica.nome,
          }))}
          value={tecnicaId}
          onChange={alterarCampo(setTecnicaId)}
          disabled={enviando}
          erro={erros.tecnicaId}
        />
        <CampoSelecao
          id="perfil-regiao"
          ref={refRegiao}
          name="regiaoId"
          rotulo="Região"
          opcoes={regioes.map((regiao) => ({
            valor: regiao.id,
            rotulo: regiao.nome,
          }))}
          value={regiaoId}
          onChange={alterarCampo(setRegiaoId)}
          disabled={enviando}
          erro={erros.regiaoId}
        />
        <div className="flex flex-col gap-2">
          <label
            htmlFor="perfil-foto"
            className="text-sm font-semibold text-fg-strong"
          >
            Foto do perfil{" "}
            <span className="font-normal text-fg-muted">opcional</span>
          </label>
          <input
            id="perfil-foto"
            ref={refFoto}
            name="foto"
            type="file"
            accept="image/jpeg,image/png"
            disabled={enviando || validandoFoto || !service.enviarFoto}
            aria-invalid={Boolean(erroFoto)}
            aria-describedby="perfil-foto-ajuda perfil-foto-erro"
            onChange={(evento) => void selecionarFoto(evento.target.files?.[0])}
            className="w-full rounded-control border border-border-subtle p-3 text-sm"
          />
          <p id="perfil-foto-ajuda" className="text-sm text-fg-muted">
            JPG ou PNG. Até 2 MB.
          </p>
          {!service.enviarFoto ? (
            <p className="text-sm text-fg-muted">
              Envio de foto indisponível neste ambiente.
            </p>
          ) : null}
          {arquivoFoto || erroFoto ? (
            <button
              type="button"
              disabled={enviando}
              className={BOTAO_SECUNDARIO}
              onClick={() => {
                void selecionarFoto(undefined);
                if (refFoto.current) refFoto.current.value = "";
              }}
            >
              Cancelar foto
            </button>
          ) : null}
          <p
            id="perfil-foto-erro"
            role={erroFoto ? "alert" : undefined}
            className="text-sm text-fg-strong"
          >
            {erroFoto}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-5">
          {mensagemSucesso ? (
            <Alerta
              tom="sucesso"
              titulo={mensagemSucesso}
              onFechar={() => setMensagemSucesso(null)}
            />
          ) : null}
          {erroServico ? (
            <Alerta tom="erro" onFechar={() => setErroServico(null)}>
              {erroServico}
            </Alerta>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={enviando || validandoFoto || Boolean(erroFoto)}
              aria-busy={enviando || undefined}
              className={`${BOTAO_PRIMARIO_GRANDE} w-full sm:w-auto sm:min-w-[200px]`}
            >
              {enviando ? (
                <Giro />
              ) : (
                <Icone nome="confirmar" className="flex-none" />
              )}
              {enviando ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </div>
      </form>

      <aside
        aria-label="Prévia do perfil público"
        className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 lg:sticky lg:top-24 lg:max-w-[400px]"
      >
        <div className="flex items-center gap-2 text-overline font-semibold tracking-[0.1em] text-fg-muted uppercase">
          <Icone nome="olho" tamanho={16} className="flex-none" />
          Prévia do perfil público
        </div>
        <div className="overflow-hidden rounded-card border border-border-subtle bg-surface-card shadow-sm">
          <div className="flex justify-center bg-linho-100 px-6 pt-6">
            <div className="-mb-10">
              <RetratoArtesao
                key={previaFoto ?? fotoUrl}
                nome={nomeArtesao}
                fotoUrl={previaFoto ?? fotoUrlSegura(fotoUrl.trim())}
                variante="previa"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2.5 px-6 pt-14 pb-6 text-center">
            {regiaoSelecionada ? (
              <span className="text-overline font-semibold tracking-[0.1em] text-fg-brand uppercase">
                {regiaoSelecionada.nome.replace(" - ", " · ")}
              </span>
            ) : null}
            <span className="font-display text-[28px] leading-[1.15] font-semibold tracking-[-0.015em] text-fg-strong">
              {nomeArtesao}
            </span>
            {tecnicaSelecionada ? (
              <span className="inline-flex h-[26px] items-center rounded-pill bg-linho-100 px-2.5 text-[13px] leading-none font-semibold whitespace-nowrap text-linho-700">
                {tecnicaSelecionada.nome}
              </span>
            ) : null}
            <p className="m-0 mt-1.5 text-[15px] leading-[1.6] text-pretty whitespace-pre-line text-fg-body">
              {historia.trim() || "Sua história aparece aqui."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
