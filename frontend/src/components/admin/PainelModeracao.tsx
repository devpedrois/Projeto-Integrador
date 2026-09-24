"use client";

import { useState } from "react";
import { useModeracao } from "@/hooks/use-moderacao";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";

export interface PainelModeracaoProps {
  service: ModeracaoService;
  adminId: string;
}

interface RegistroModeravel {
  tipo: "artesao" | "produto";
  id: string;
  nome: string;
  detalhe: string;
  ativo: boolean;
  aviso?: string;
}

interface Feedback {
  tipo: "sucesso" | "erro";
  mensagem: string;
}

const MENSAGEM_ERRO_ACAO =
  "Nao foi possivel concluir a moderacao. Tente novamente em instantes.";

function chave(registro: RegistroModeravel): string {
  return `${registro.tipo}:${registro.id}`;
}

export function PainelModeracao({ service, adminId }: PainelModeracaoProps) {
  const { estado, recarregar } = useModeracao(service, adminId);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function solicitar(registro: RegistroModeravel) {
    setFeedback(null);
    setConfirmando(chave(registro));
  }

  async function confirmar(registro: RegistroModeravel) {
    const ativar = !registro.ativo;
    setProcessando(chave(registro));
    setFeedback(null);
    try {
      if (registro.tipo === "artesao") {
        await (ativar
          ? service.ativarArtesao(registro.id, adminId)
          : service.desativarArtesao(registro.id, adminId));
      } else {
        await (ativar
          ? service.ativarProduto(registro.id, adminId)
          : service.desativarProduto(registro.id, adminId));
      }
      setFeedback({
        tipo: "sucesso",
        mensagem: `${registro.nome} foi ${ativar ? "reativado" : "desativado"}.`,
      });
      recarregar();
    } catch {
      setFeedback({ tipo: "erro", mensagem: MENSAGEM_ERRO_ACAO });
    } finally {
      setConfirmando(null);
      setProcessando(null);
    }
  }

  if (estado.status === "carregando") {
    return (
      <p role="status" className="text-sm text-neutral-600">
        Carregando cadastros...
      </p>
    );
  }

  if (estado.status === "erro") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-red-700">
          {estado.mensagem}
        </p>
        <button
          type="button"
          onClick={recarregar}
          className="min-h-11 rounded border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const artesaosPorId = new Map(estado.artesaos.map((artesao) => [artesao.id, artesao]));

  const artesaos: RegistroModeravel[] = estado.artesaos.map((artesao) => ({
    tipo: "artesao",
    id: artesao.id,
    nome: artesao.nome,
    detalhe: artesao.email,
    ativo: artesao.ativo,
  }));

  const produtos: RegistroModeravel[] = estado.produtos.map((produto) => {
    const artesao = artesaosPorId.get(produto.artesaoId);
    const aviso = !produto.ativo
      ? "Removido pelo artesao: nao volta a vitrine pela moderacao."
      : artesao && !artesao.ativo
        ? "Oculto da vitrine: artesao desativado."
        : undefined;
    return {
      tipo: "produto",
      id: produto.id,
      nome: produto.nome,
      detalhe: `${artesao?.nome ?? "Artesao desconhecido"} · R$ ${produto.preco.toFixed(2)} · Estoque: ${produto.quantidadeEstoque}`,
      ativo: produto.desativadoPorAdmin !== true,
      ...(aviso ? { aviso } : {}),
    };
  });

  const propsLista = {
    confirmando,
    processando,
    onSolicitar: solicitar,
    onCancelar: () => setConfirmando(null),
    onConfirmar: confirmar,
  };

  return (
    <div className="flex flex-col gap-8">
      {feedback ? (
        <p
          role={feedback.tipo === "erro" ? "alert" : "status"}
          className={
            feedback.tipo === "erro"
              ? "rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              : "rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
          }
        >
          {feedback.mensagem}
        </p>
      ) : null}

      <ListaModeracao
        id="moderacao-artesaos"
        titulo="Artesaos"
        vazio="Nenhum artesao cadastrado."
        registros={artesaos}
        {...propsLista}
      />

      <ListaModeracao
        id="moderacao-produtos"
        titulo="Produtos"
        vazio="Nenhum produto cadastrado."
        registros={produtos}
        {...propsLista}
      />
    </div>
  );
}

interface ListaModeracaoProps {
  id: string;
  titulo: string;
  vazio: string;
  registros: RegistroModeravel[];
  confirmando: string | null;
  processando: string | null;
  onSolicitar: (registro: RegistroModeravel) => void;
  onCancelar: () => void;
  onConfirmar: (registro: RegistroModeravel) => void;
}

function ListaModeracao({
  id,
  titulo,
  vazio,
  registros,
  confirmando,
  processando,
  onSolicitar,
  onCancelar,
  onConfirmar,
}: ListaModeracaoProps) {
  const tituloId = `${id}-titulo`;

  return (
    <section aria-labelledby={tituloId} className="flex flex-col gap-4">
      <h2 id={tituloId} className="text-xl font-semibold">
        {titulo}
      </h2>

      {registros.length === 0 ? (
        <p className="text-sm text-neutral-600">{vazio}</p>
      ) : (
        <ul role="list" className="flex flex-col gap-3">
          {registros.map((registro) => {
            const chaveRegistro = chave(registro);
            const emProcesso = processando === chaveRegistro;
            const acao = registro.ativo ? "Desativar" : "Ativar";

            return (
              <li
                key={chaveRegistro}
                aria-label={registro.nome}
                className="flex flex-col gap-3 rounded border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="break-words font-medium">{registro.nome}</span>
                  <span className="break-words text-sm text-neutral-600">
                    {registro.detalhe}
                  </span>
                  <span
                    className={
                      registro.ativo
                        ? "w-fit rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "w-fit rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700"
                    }
                  >
                    {registro.ativo ? "Ativo" : "Inativo"}
                  </span>
                  {registro.aviso ? (
                    <span className="text-xs text-amber-800">{registro.aviso}</span>
                  ) : null}
                </div>

                {confirmando === chaveRegistro ? (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <p className="text-sm">
                      {registro.ativo
                        ? "Desativar? Os dados nao serao apagados."
                        : "Reativar e voltar a exibir na vitrine?"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onConfirmar(registro)}
                        disabled={emProcesso}
                        className="min-h-11 rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {emProcesso
                          ? "Salvando..."
                          : registro.ativo
                            ? "Confirmar desativacao"
                            : "Confirmar reativacao"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelar}
                        disabled={emProcesso}
                        className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSolicitar(registro)}
                    disabled={processando !== null}
                    className={
                      registro.ativo
                        ? "min-h-11 rounded border border-red-700 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
                        : "min-h-11 rounded border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700 disabled:opacity-60"
                    }
                  >
                    {acao}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
