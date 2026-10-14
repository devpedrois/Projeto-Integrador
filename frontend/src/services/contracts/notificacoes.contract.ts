export interface Notificacao {
  id: string;
  pedidoId: string;
  tipo: "novo_pedido";
  lida: boolean;
  criadoEm: string;
}

export interface NotificacoesService {
  listar(): Promise<Notificacao[]>;
  marcarComoLida(id: string): Promise<void>;
}
