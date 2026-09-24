"use client";

import { useState, type FormEvent } from "react";
import { useMeusProdutos } from "@/hooks/use-meus-produtos";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { NovoProdutoInput } from "@/types/novo-produto";
import type { Produto } from "@/types/produto";
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
  "Nao foi possivel concluir a acao. Tente novamente em instantes.";

export function MeusProdutosList({ service, artesaoId }: MeusProdutosListProps) {
  const { estado, recarregar } = useMeusProdutos(service, artesaoId);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoRemocaoId, setConfirmandoRemocaoId] = useState<string | null>(
    null
  );
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  function iniciarEdicao(id: string) {
    setErroAcao(null);
    setConfirmandoRemocaoId(null);
    setEditandoId(id);
  }

  function cancelarEdicao() {
    setEditandoId(null);
  }

  async function salvarEdicao(produto: Produto, input: NovoProdutoInput) {
    setProcessandoId(produto.id);
    setErroAcao(null);
    try {
      await service.update(produto.id, input, artesaoId);
      setEditandoId(null);
      recarregar();
    } catch {
      setErroAcao(MENSAGEM_ERRO_ACAO);
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
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Meus produtos</h2>

      {erroAcao ? (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {erroAcao}
        </p>
      ) : null}

      {estado.status === "carregando" ? (
        <p role="status" className="text-sm text-neutral-600">
          Carregando seus produtos...
        </p>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className="text-sm text-red-700">
          {estado.mensagem}
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <p className="text-sm text-neutral-600">
          Nenhum produto cadastrado ainda.
        </p>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul role="list" className="flex flex-col gap-4">
          {estado.produtos.map((produto) => (
            <li
              key={produto.id}
              aria-label={produto.nome}
              className="flex flex-col gap-3 rounded border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              {editandoId === produto.id ? (
                <EdicaoProdutoForm
                  produto={produto}
                  processando={processandoId === produto.id}
                  onCancelar={cancelarEdicao}
                  onSalvar={(input) => salvarEdicao(produto, input)}
                />
              ) : confirmandoRemocaoId === produto.id ? (
                <ConfirmacaoRemocao
                  processando={processandoId === produto.id}
                  onCancelar={cancelarRemocao}
                  onConfirmar={() => confirmarRemocao(produto.id)}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{produto.nome}</span>
                    <span className="text-sm text-neutral-600">
                      R$ {produto.preco.toFixed(2)} · Estoque:{" "}
                      {produto.quantidadeEstoque}
                    </span>
                    {produto.desativadoPorAdmin ? (
                      <span className="text-xs font-medium text-amber-800">
                        Desativado pela moderacao: fora da vitrine.
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(produto.id)}
                      className="min-h-11 min-w-11 rounded border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => iniciarConfirmacaoRemocao(produto.id)}
                      className="min-h-11 min-w-11 rounded border border-red-700 px-3 py-2 text-sm font-medium text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface EdicaoProdutoFormProps {
  produto: Produto;
  processando: boolean;
  onCancelar: () => void;
  onSalvar: (input: NovoProdutoInput) => void;
}

function EdicaoProdutoForm({
  produto,
  processando,
  onCancelar,
  onSalvar,
}: EdicaoProdutoFormProps) {
  const [nome, setNome] = useState(produto.nome);
  const [descricao, setDescricao] = useState(produto.descricao);
  const [preco, setPreco] = useState(String(produto.preco));
  const [categoriaId, setCategoriaId] = useState(produto.categoriaId);
  const [fotoUrl, setFotoUrl] = useState(produto.fotos[0]?.url ?? "");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState(
    String(produto.quantidadeEstoque)
  );
  const [erros, setErros] = useState<ErrosProduto>({});

  const idBase = `editar-${produto.id}`;

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (processando) return;

    const input: NovoProdutoInput = {
      nome,
      descricao,
      preco: Number(preco),
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
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-1 flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idBase}-nome`} className="text-sm font-medium">
          Nome
        </label>
        <input
          id={`${idBase}-nome`}
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          aria-invalid={Boolean(erros.nome)}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.nome ? (
          <p className="text-sm text-red-700">{erros.nome}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idBase}-descricao`} className="text-sm font-medium">
          Descricao
        </label>
        <textarea
          id={`${idBase}-descricao`}
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          aria-invalid={Boolean(erros.descricao)}
          className="min-h-20 rounded border border-gray-300 px-3 py-2"
        />
        {erros.descricao ? (
          <p className="text-sm text-red-700">{erros.descricao}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${idBase}-preco`} className="text-sm font-medium">
            Preco
          </label>
          <input
            id={`${idBase}-preco`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={preco}
            onChange={(evento) => setPreco(evento.target.value)}
            aria-invalid={Boolean(erros.preco)}
            className="min-h-11 rounded border border-gray-300 px-3 py-2"
          />
          {erros.preco ? (
            <p className="text-sm text-red-700">{erros.preco}</p>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${idBase}-estoque`} className="text-sm font-medium">
            Estoque
          </label>
          <input
            id={`${idBase}-estoque`}
            type="number"
            step="1"
            inputMode="numeric"
            value={quantidadeEstoque}
            onChange={(evento) => setQuantidadeEstoque(evento.target.value)}
            aria-invalid={Boolean(erros.quantidadeEstoque)}
            className="min-h-11 rounded border border-gray-300 px-3 py-2"
          />
          {erros.quantidadeEstoque ? (
            <p className="text-sm text-red-700">{erros.quantidadeEstoque}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idBase}-categoria`} className="text-sm font-medium">
          Categoria
        </label>
        <select
          id={`${idBase}-categoria`}
          value={categoriaId}
          onChange={(evento) => setCategoriaId(evento.target.value)}
          aria-invalid={Boolean(erros.categoriaId)}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        >
          {CATEGORIAS_SEED.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
        {erros.categoriaId ? (
          <p className="text-sm text-red-700">{erros.categoriaId}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idBase}-foto`} className="text-sm font-medium">
          URL da foto
        </label>
        <input
          id={`${idBase}-foto`}
          value={fotoUrl}
          onChange={(evento) => setFotoUrl(evento.target.value)}
          aria-invalid={Boolean(erros.fotos)}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.fotos ? (
          <p className="text-sm text-red-700">{erros.fotos}</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={processando}
          className="min-h-11 min-w-11 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {processando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={processando}
          className="min-h-11 min-w-11 rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
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
  return (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">Remover este produto da vitrine?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={processando}
          className="min-h-11 min-w-11 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {processando ? "Removendo..." : "Confirmar remocao"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={processando}
          className="min-h-11 min-w-11 rounded border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
