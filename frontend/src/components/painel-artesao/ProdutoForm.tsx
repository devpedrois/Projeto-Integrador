"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alerta } from "@/components/feedback/Alerta";
import { CampoAreaTexto } from "@/components/formulario/CampoAreaTexto";
import { CampoSelecao } from "@/components/formulario/CampoSelecao";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { Giro } from "@/components/formulario/Giro";
import { BOTAO_PRIMARIO_GRANDE } from "@/components/formulario/estilos-botao";
import { Icone } from "@/components/vitrine/Icone";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { NovoProdutoInput } from "@/types/novo-produto";
import {
  produtoValido,
  validarProduto,
  type CampoProduto,
  type ErrosProduto,
} from "@/validators/produto.validator";
import { lerPrecoCampo } from "@/utils/preco-campo";

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
  "Não foi possível cadastrar o produto. Tente novamente em instantes.";

const OPCOES_CATEGORIA = CATEGORIAS_SEED.map((categoria) => ({
  valor: categoria.id,
  rotulo: categoria.nome,
}));

export function ProdutoForm({ service, artesaoId }: ProdutoFormProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [erros, setErros] = useState<ErrosProduto>({});
  const [erroServico, setErroServico] = useState<string | null>(null);
  const [produtoCadastrado, setProdutoCadastrado] = useState<string | null>(null);
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
      preco: lerPrecoCampo(preco),
      categoriaId,
      fotos: fotoUrl.trim().length > 0 ? [{ url: fotoUrl }] : [],
      quantidadeEstoque: Number(quantidadeEstoque),
    };

    const errosValidacao = validarProduto(entrada);
    setErros(errosValidacao);
    setErroServico(null);
    setProdutoCadastrado(null);

    if (!produtoValido(errosValidacao)) {
      focarPrimeiroErro(errosValidacao);
      return;
    }

    setEnviando(true);
    try {
      await service.create(entrada, artesaoId);
      setProdutoCadastrado(entrada.nome.trim());
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {produtoCadastrado !== null ? (
        <Alerta
          tom="sucesso"
          titulo="Produto cadastrado!"
          onFechar={() => setProdutoCadastrado(null)}
        >
          {produtoCadastrado} já está em Meus produtos.
        </Alerta>
      ) : null}

      {erroServico ? <Alerta tom="erro">{erroServico}</Alerta> : null}

      <div className="flex flex-col gap-6 rounded-card border border-border-subtle bg-surface-card p-5 shadow-sm sm:p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <CampoTexto
              id="produto-nome"
              ref={refNome}
              name="nome"
              rotulo="Nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              disabled={enviando}
              erro={erros.nome}
            />
          </div>
          <div className="sm:col-span-2">
            <CampoAreaTexto
              id="produto-descricao"
              ref={refDescricao}
              name="descricao"
              rotulo="Descrição"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              disabled={enviando}
              erro={erros.descricao}
            />
          </div>
          <CampoTexto
            id="produto-preco"
            ref={refPreco}
            name="preco"
            rotulo="Preço"
            inputMode="decimal"
            placeholder="0,00"
            icone="cedula"
            value={preco}
            onChange={(evento) => setPreco(evento.target.value)}
            disabled={enviando}
            erro={erros.preco}
          />
          <CampoSelecao
            id="produto-categoria"
            ref={refCategoria}
            name="categoriaId"
            rotulo="Categoria"
            opcoes={OPCOES_CATEGORIA}
            value={categoriaId}
            onChange={(evento) => setCategoriaId(evento.target.value)}
            disabled={enviando}
            erro={erros.categoriaId}
          />
          <CampoTexto
            id="produto-foto"
            ref={refFoto}
            name="foto"
            rotulo="URL da foto"
            type="url"
            placeholder="https://"
            icone="imagem"
            value={fotoUrl}
            onChange={(evento) => setFotoUrl(evento.target.value)}
            disabled={enviando}
            erro={erros.fotos}
          />
          <CampoTexto
            id="produto-estoque"
            ref={refEstoque}
            name="quantidadeEstoque"
            rotulo="Estoque"
            type="number"
            step="1"
            inputMode="numeric"
            value={quantidadeEstoque}
            onChange={(evento) => setQuantidadeEstoque(evento.target.value)}
            disabled={enviando}
            erro={erros.quantidadeEstoque}
          />
        </div>

        <div className="flex justify-end border-t border-border-subtle pt-5">
          <button
            type="submit"
            disabled={enviando}
            aria-busy={enviando || undefined}
            className={`${BOTAO_PRIMARIO_GRANDE} w-full sm:w-auto sm:min-w-[220px]`}
          >
            {enviando ? <Giro /> : <Icone nome="confirmar" className="flex-none" />}
            {enviando ? "Cadastrando…" : "Cadastrar produto"}
          </button>
        </div>
      </div>
    </form>
  );
}
