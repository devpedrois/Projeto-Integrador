"use client";

import { useRef, useState, type FormEvent } from "react";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { NovoProdutoInput } from "@/types/novo-produto";
import {
  produtoValido,
  validarProduto,
  type CampoProduto,
  type ErrosProduto,
} from "@/validators/produto.validator";

export interface ProdutoFormProps {
  service: ProdutosService;
  artesaoId: string;
}

const ORDEM_CAMPOS: CampoProduto[] = [
  "nome",
  "descricao",
  "preco",
  "categoriaId",
  "fotos",
  "quantidadeEstoque",
];

const MENSAGEM_ERRO_SERVICO =
  "Nao foi possivel cadastrar o produto. Tente novamente em instantes.";

export function ProdutoForm({ service, artesaoId }: ProdutoFormProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [erros, setErros] = useState<ErrosProduto>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const refNome = useRef<HTMLInputElement>(null);
  const refDescricao = useRef<HTMLTextAreaElement>(null);
  const refPreco = useRef<HTMLInputElement>(null);
  const refCategoria = useRef<HTMLSelectElement>(null);
  const refFoto = useRef<HTMLInputElement>(null);
  const refEstoque = useRef<HTMLInputElement>(null);

  const refsPorCampo: Record<CampoProduto, React.RefObject<HTMLElement | null>> = {
    nome: refNome,
    descricao: refDescricao,
    preco: refPreco,
    categoriaId: refCategoria,
    fotos: refFoto,
    quantidadeEstoque: refEstoque,
  };

  function focarPrimeiroErro(errosAtuais: ErrosProduto) {
    const primeiroCampo = ORDEM_CAMPOS.find((campo) => errosAtuais[campo]);
    if (!primeiroCampo) return;
    refsPorCampo[primeiroCampo].current?.focus();
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const entrada: NovoProdutoInput = {
      nome,
      descricao,
      preco: Number(preco),
      categoriaId,
      fotos: fotoUrl.trim().length > 0 ? [{ url: fotoUrl }] : [],
      quantidadeEstoque: Number(quantidadeEstoque),
    };

    const errosValidacao = validarProduto(entrada);
    setErros(errosValidacao);
    setErroServico(null);
    setMensagemSucesso(null);

    if (!produtoValido(errosValidacao)) {
      focarPrimeiroErro(errosValidacao);
      return;
    }

    setEnviando(true);
    try {
      await service.create(entrada, artesaoId);
      setMensagemSucesso("Produto cadastrado com sucesso.");
      setNome("");
      setDescricao("");
      setPreco("");
      setCategoriaId("");
      setFotoUrl("");
      setQuantidadeEstoque("");
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

      {mensagemSucesso ? (
        <p role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {mensagemSucesso}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="produto-nome"
          ref={refNome}
          name="nome"
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "produto-nome-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.nome ? (
          <p id="produto-nome-erro" className="text-sm text-red-700">
            {erros.nome}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-descricao" className="text-sm font-medium">
          Descricao
        </label>
        <textarea
          id="produto-descricao"
          ref={refDescricao}
          name="descricao"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          aria-invalid={Boolean(erros.descricao)}
          aria-describedby={erros.descricao ? "produto-descricao-erro" : undefined}
          className="min-h-24 rounded border border-gray-300 px-3 py-2"
        />
        {erros.descricao ? (
          <p id="produto-descricao-erro" className="text-sm text-red-700">
            {erros.descricao}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-preco" className="text-sm font-medium">
          Preco
        </label>
        <input
          id="produto-preco"
          ref={refPreco}
          name="preco"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={preco}
          onChange={(evento) => setPreco(evento.target.value)}
          aria-invalid={Boolean(erros.preco)}
          aria-describedby={erros.preco ? "produto-preco-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.preco ? (
          <p id="produto-preco-erro" className="text-sm text-red-700">
            {erros.preco}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-categoria" className="text-sm font-medium">
          Categoria
        </label>
        <select
          id="produto-categoria"
          ref={refCategoria}
          name="categoriaId"
          value={categoriaId}
          onChange={(evento) => setCategoriaId(evento.target.value)}
          aria-invalid={Boolean(erros.categoriaId)}
          aria-describedby={erros.categoriaId ? "produto-categoria-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Selecione
          </option>
          {CATEGORIAS_SEED.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
        {erros.categoriaId ? (
          <p id="produto-categoria-erro" className="text-sm text-red-700">
            {erros.categoriaId}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-foto" className="text-sm font-medium">
          URL da foto
        </label>
        <input
          id="produto-foto"
          ref={refFoto}
          name="foto"
          type="text"
          value={fotoUrl}
          onChange={(evento) => setFotoUrl(evento.target.value)}
          aria-invalid={Boolean(erros.fotos)}
          aria-describedby={erros.fotos ? "produto-foto-erro" : undefined}
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.fotos ? (
          <p id="produto-foto-erro" className="text-sm text-red-700">
            {erros.fotos}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="produto-estoque" className="text-sm font-medium">
          Estoque
        </label>
        <input
          id="produto-estoque"
          ref={refEstoque}
          name="quantidadeEstoque"
          type="number"
          step="1"
          inputMode="numeric"
          value={quantidadeEstoque}
          onChange={(evento) => setQuantidadeEstoque(evento.target.value)}
          aria-invalid={Boolean(erros.quantidadeEstoque)}
          aria-describedby={
            erros.quantidadeEstoque ? "produto-estoque-erro" : undefined
          }
          className="min-h-11 rounded border border-gray-300 px-3 py-2"
        />
        {erros.quantidadeEstoque ? (
          <p id="produto-estoque-erro" className="text-sm text-red-700">
            {erros.quantidadeEstoque}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 min-w-11 rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Cadastrar produto"}
      </button>
    </form>
  );
}
