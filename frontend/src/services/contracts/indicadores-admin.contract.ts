export interface IndicadoresAdmin {
  artesaosAtivos: number;
  produtosAtivos: number;
  pedidosConfirmados: number;
  receitaTotal: string;
  atualizadoEm: string;
}

export interface IndicadoresAdminService {
  obter(): Promise<IndicadoresAdmin>;
}
