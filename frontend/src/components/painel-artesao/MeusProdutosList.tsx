"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Alerta } from "@/components/feedback/Alerta";
import { CampoAreaTexto } from "@/components/formulario/CampoAreaTexto";
import { CampoSelecao } from "@/components/formulario/CampoSelecao";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { Giro } from "@/components/formulario/Giro";
import {
  BOTAO_PERIGO_PEQUENO,
  BOTAO_PRIMARIO_GRANDE,
  BOTAO_REMOVER,
  BOTAO_SECUNDARIO,
  BOTAO_SECUNDARIO_PEQUENO,
} from "@/components/formulario/estilos-botao";
import { Icone } from "@/components/vitrine/Icone";
import { useMeusProdutos } from "@/hooks/use-meus-produtos";
import { CATEGORIA_IDS, CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { NovoProdutoInput } from "@/types/novo-produto";
import type { Produto } from "@/types/produto";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { formatarPrecoCampo, lerPrecoCampo } from "@/utils/preco-campo";
import {
  produtoValido,
  validarProduto,
  type ErrosProduto,
} from "@/validators/produto.validator";

export interface MeusProdutosListProps {
  service: ProdutosService;
  artesaoId: string;
}

const MENSAGEM_ERRO_ACAO =
  "Não foi possível concluir a ação. Tente novamente em instantes.";

const OPCOES_CATEGORIA = CATEGORIAS_SEED.map((categoria) => ({
  valor: categoria.id,
  rotulo: categoria.nome,
}));

const TONS_CATEGORIA: Record<string, string> = {
  [CATEGORIA_IDS.ceramicaBarro]: "bg-cat-ceramica-tint text-cat-ceramica-ink",
  [CATEGORIA_IDS.rendaBordado]: "bg-cat-renda-tint text-cat-renda-ink",
  [CATEGORIA_IDS.madeiraEntalhada]: "bg-cat-madeira-tint text-cat-madeira-ink",
  [CATEGORIA_IDS.textilCostura]: "bg-cat-textil-tint text-cat-textil-ink",
  [CATEGORIA_IDS.bijuteriaAcessorios]: "bg-cat-bijuteria-tint text-cat-bijuteria-ink",
};

const BOTAO_LINHA = "md:h-[var(--control-h-sm)] md:px-3.5 md:text-sm";

function capaDoProduto(produto: Produto): string | undefined {
  return [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0]?.url;
}

export function MeusProdutosList({ service, artesaoId }: MeusProdutosListProps) {
  const { estado, recarregar } = useMeusProdutos(service, artesaoId);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoRemocaoId, setConfirmandoRemocaoId] = useState<string | null>(
    null
  );
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const produtoEmEdicao =
    estado.status === "sucesso"
      ? estado.produtos.find((produto) => produto.id === editandoId) ?? null
      : null;

  function iniciarEdicao(id: string) {
    setErroAcao(null);
    setErroEdicao(null);
    setConfirmandoRemocaoId(null);
    setEditandoId(id);
  }

  function fecharEdicao() {
    if (processandoId !== null) return;
    setEditandoId(null);
    setErroEdicao(null);
  }

  async function salvarEdicao(produto: Produto, input: NovoProdutoInput) {
    setProcessandoId(produto.id);
    setErroEdicao(null);
    try {
      await service.update(produto.id, input, artesaoId);
      setEditandoId(null);
      recarregar();
    } catch {
      setErroEdicao(MENSAGEM_ERRO_ACAO);
    } finally {
      setProcessandoId(null);
    }
  }

  function iniciarConfirmacaoRemocao(id: string) {
    setErroAcao(null);
    setEditandoId(null);
    setConfirmandoRemocaoId(id);
  }

  function cancelarRemocao() {
    setConfirmandoRemocaoId(null);
  }

  async function confirmarRemocao(id: string) {
    setProcessandoId(id);
    setErroAcao(null);
    try {
      await service.remove(id, artesaoId);
      setConfirmandoRemocaoId(null);
      recarregar();
    } catch {
      setErroAcao(MENSAGEM_ERRO_ACAO);
      setConfirmandoRemocaoId(null);
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="m-0 font-display text-[30px] leading-[1.12] font-semibold tracking-[-0.015em] text-fg-strong md:text-[40px]">
        Meus produtos
      </h1>

      {erroAcao ? (
        <Alerta tom="erro" onFechar={() => setErroAcao(null)}>
          {erroAcao}
        </Alerta>
      ) : null}

      {estado.status === "carregando" ? (
        <p role="status" className="m-0 text-body-sm text-fg-muted">
          Carregando seus produtos...
        </p>
      ) : null}

      {estado.status === "erro" ? <Alerta tom="erro">{estado.mensagem}</Alerta> : null}

      {estado.status === "vazio" ? <ListaVazia /> : null}

      {estado.status === "sucesso" ? (
        <div className="overflow-hidden rounded-card border border-border-subtle bg-surface-card shadow-sm">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1fr)_140px_110px_212px] items-center gap-4 border-b border-border-default bg-surface-raised px-5 py-3 text-caption font-semibold tracking-[0.06em] text-fg-muted uppercase md:grid"
          >
            <span>Produto</span>
            <span>Preço</span>
            <span>Estoque</span>
            <span />
          </div>
          <ul role="list" className="m-0 list-none p-0">
            {estado.produtos.map((produto) => (
              <li
                key={produto.id}
                aria-label={produto.nome}
                className="border-b border-border-subtle last:border-b-0"
              >
                <LinhaProduto
                  produto={produto}
                  onEditar={() => iniciarEdicao(produto.id)}
                  onRemover={() => iniciarConfirmacaoRemocao(produto.id)}
                />
                {confirmandoRemocaoId === produto.id ? (
                  <ConfirmacaoRemocao
                    processando={processandoId === produto.id}
                    onCancelar={cancelarRemocao}
                    onConfirmar={() => confirmarRemocao(produto.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {produtoEmEdicao ? (
        <PainelEdicao
          key={produtoEmEdicao.id}
          produto={produtoEmEdicao}
          processando={processandoId === produtoEmEdicao.id}
          erro={erroEdicao}
          onFechar={fecharEdicao}
          onSalvar={(input) => salvarEdicao(produtoEmEdicao, input)}
        />
      ) : null}
    </section>
  );
}

function ListaVazia() {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-border-strong bg-surface-raised px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mb-1 grid h-[84px] w-[72px] place-items-center rounded-[999px_999px_14px_14px] bg-barro-50 text-barro-600"
      >
        <Icone nome="pacoteAberto" tamanho={32} />
      </span>
      <h2 className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
        Nenhum produto cadastrado
      </h2>
      <p className="m-0 max-w-[380px] text-[15px] leading-[1.55] text-fg-muted">
        Cadastre sua primeira peça no Painel do artesão.
      </p>
      <Link href="/painel-artesao" className={`${BOTAO_PRIMARIO_GRANDE} mt-1.5`}>
        <Icone nome="mais" className="flex-none" />
        Ir para o Painel do artesão
      </Link>
    </div>
  );
}

function Miniatura({
  categoriaId,
  fotoUrl,
  className,
}: {
  categoriaId: string;
  fotoUrl: string | undefined;
  className: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const url = fotoUrlSegura(fotoUrl);
  const tom = TONS_CATEGORIA[categoriaId] ?? "bg-linho-100 text-fg-subtle";

  useEffect(() => {
    setFalhou(false);
  }, [url]);

  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center overflow-hidden rounded-[8px] ${tom} ${className}`}
    >
      {url && !falhou ? (
        <img src={url} alt="" onError={() => setFalhou(true)} className="size-full object-cover" />
      ) : (
        <Icone nome="pacote" tamanho={22} className="opacity-75" />
      )}
    </span>
  );
}

interface LinhaProdutoProps {
  produto: Produto;
  onEditar: () => void;
  onRemover: () => void;
}

function LinhaProduto({ produto, onEditar, onRemover }: LinhaProdutoProps) {
  const preco = `R$ ${produto.preco.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-3.5 p-4 md:grid md:grid-cols-[minmax(0,1fr)_140px_110px_212px] md:items-center md:gap-4 md:px-5 md:py-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <Miniatura
          categoriaId={produto.categoriaId}
          fotoUrl={capaDoProduto(produto)}
          className="size-[60px] md:size-[52px]"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-base leading-[1.3] font-semibold text-fg-strong md:truncate md:text-[15px]">
            {produto.nome}
          </span>
          <span className="text-sm text-fg-muted tabular-nums md:hidden">
            {preco} · Estoque: {produto.quantidadeEstoque}
          </span>
          {produto.desativadoPorAdmin ? (
            <span className="text-caption font-semibold text-aviso-700">
              Desativado pela moderação: fora da vitrine.
            </span>
          ) : null}
        </div>
      </div>
      <span className="hidden text-[15px] font-semibold text-fg-strong tabular-nums md:block">
        {preco}
      </span>
      <span className="hidden text-[15px] text-fg-body tabular-nums md:block">
        {produto.quantidadeEstoque}
      </span>
      <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
        <button type="button" onClick={onEditar} className={`${BOTAO_SECUNDARIO} ${BOTAO_LINHA}`}>
          <Icone nome="lapis" tamanho={16} className="flex-none" />
          Editar
        </button>
        <button type="button" onClick={onRemover} className={`${BOTAO_REMOVER} ${BOTAO_LINHA}`}>
          <Icone nome="lixeira" tamanho={16} className="flex-none" />
          Remover
        </button>
      </div>
    </div>
  );
}

interface ConfirmacaoRemocaoProps {
  processando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function ConfirmacaoRemocao({
  processando,
  onCancelar,
  onConfirmar,
}: ConfirmacaoRemocaoProps) {
  const refCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    refCancelar.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-label="Remover este produto da vitrine?"
      className="mx-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md bg-erro-50 px-4 py-3.5"
    >
      <span className="mr-auto flex items-center gap-2.5 text-[15px] font-semibold text-erro-700">
        <Icone nome="aviso" className="flex-none" />
        Remover este produto da vitrine?
      </span>
      <div className="flex flex-auto justify-end gap-2">
        <button
          ref={refCancelar}
          type="button"
          onClick={onCancelar}
          disabled={processando}
          className={BOTAO_SECUNDARIO_PEQUENO}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={processando}
          aria-busy={processando || undefined}
          className={`${BOTAO_PERIGO_PEQUENO} min-w-[160px]`}
        >
          {processando ? <Giro /> : null}
          {processando ? "Removendo..." : "Confirmar remoção"}
        </button>
      </div>
    </div>
  );
}

interface PainelEdicaoProps {
  produto: Produto;
  processando: boolean;
  erro: string | null;
  onFechar: () => void;
  onSalvar: (input: NovoProdutoInput) => void;
}

function PainelEdicao({ produto, processando, erro, onFechar, onSalvar }: PainelEdicaoProps) {
  const [nome, setNome] = useState(produto.nome);
  const [descricao, setDescricao] = useState(produto.descricao);
  const [preco, setPreco] = useState(formatarPrecoCampo(produto.preco));
  const [categoriaId, setCategoriaId] = useState(produto.categoriaId);
  const [fotoUrl, setFotoUrl] = useState(capaDoProduto(produto) ?? "");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState(
    String(produto.quantidadeEstoque)
  );
  const [erros, setErros] = useState<ErrosProduto>({});
  const refNome = useRef<HTMLInputElement>(null);
  const refOnFechar = useRef(onFechar);

  const idBase = `editar-${produto.id}`;

  useEffect(() => {
    refOnFechar.current = onFechar;
  });

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    refNome.current?.focus();

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") refOnFechar.current();
    }
    document.addEventListener("keydown", aoPressionarTecla);

    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, []);

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (processando) return;

    const input: NovoProdutoInput = {
      nome,
      descricao,
      preco: lerPrecoCampo(preco),
      categoriaId,
      fotos: fotoUrl.trim().length > 0 ? [{ url: fotoUrl }] : [],
      quantidadeEstoque: Number(quantidadeEstoque),
    };

    const errosValidacao = validarProduto(input);
    setErros(errosValidacao);
    if (!produtoValido(errosValidacao)) return;

    onSalvar(input);
  }

  return (
    <>
      <div aria-hidden="true" onClick={onFechar} className="fixed inset-0 z-40 bg-overlay-scrim" />
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Editar produto"
        onSubmit={handleSubmit}
        noValidate
        className="fixed inset-y-0 right-0 z-[41] flex w-full max-w-[480px] flex-col bg-surface-card shadow-lg"
      >
        <div className="flex flex-none items-center gap-3 border-b border-border-subtle py-4 pr-3 pl-6">
          <Miniatura categoriaId={categoriaId} fotoUrl={fotoUrl} className="size-11" />
          <div className="mr-auto flex min-w-0 flex-col">
            <span className="text-overline font-semibold tracking-[0.1em] text-fg-brand uppercase">
              Editar
            </span>
            <span className="truncate font-display text-[22px] leading-[1.25] font-semibold tracking-[-0.015em] text-fg-strong">
              {nome.trim() || "Produto"}
            </span>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={processando}
            aria-label="Fechar"
            className="grid size-11 flex-none place-items-center rounded-control text-fg-strong transition-colors duration-[var(--dur-fast)] hover:bg-linho-100 disabled:opacity-60"
          >
            <Icone nome="fechar" tamanho={22} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
          <CampoTexto
            id={`${idBase}-nome`}
            ref={refNome}
            rotulo="Nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            disabled={processando}
            erro={erros.nome}
          />
          <CampoAreaTexto
            id={`${idBase}-descricao`}
            rotulo="Descrição"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            disabled={processando}
            erro={erros.descricao}
          />
          <CampoTexto
            id={`${idBase}-preco`}
            rotulo="Preço"
            inputMode="decimal"
            placeholder="0,00"
            icone="cedula"
            value={preco}
            onChange={(evento) => setPreco(evento.target.value)}
            disabled={processando}
            erro={erros.preco}
          />
          <CampoSelecao
            id={`${idBase}-categoria`}
            rotulo="Categoria"
            opcoes={OPCOES_CATEGORIA}
            value={categoriaId}
            onChange={(evento) => setCategoriaId(evento.target.value)}
            disabled={processando}
            erro={erros.categoriaId}
          />
          <CampoTexto
            id={`${idBase}-foto`}
            rotulo="URL da foto"
            type="url"
            icone="imagem"
            value={fotoUrl}
            onChange={(evento) => setFotoUrl(evento.target.value)}
            disabled={processando}
            erro={erros.fotos}
          />
          <CampoTexto
            id={`${idBase}-estoque`}
            rotulo="Estoque"
            type="number"
            step="1"
            inputMode="numeric"
            value={quantidadeEstoque}
            onChange={(evento) => setQuantidadeEstoque(evento.target.value)}
            disabled={processando}
            erro={erros.quantidadeEstoque}
          />
        </div>

        <div className="flex flex-none flex-col gap-3 border-t border-border-subtle bg-surface-raised px-6 pt-4 pb-6">
          {erro ? <Alerta tom="erro">{erro}</Alerta> : null}
          <button
            type="submit"
            disabled={processando}
            aria-busy={processando || undefined}
            className={`${BOTAO_PRIMARIO_GRANDE} w-full`}
          >
            {processando ? <Giro /> : <Icone nome="confirmar" className="flex-none" />}
            {processando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </>
  );
}