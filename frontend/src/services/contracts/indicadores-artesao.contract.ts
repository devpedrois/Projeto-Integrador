export interface IndicadoresArtesao {
  quantidadeVendida: number;
  receitaTotal: number;
  numeroPedidos: number;
  ultimaVenda: string | null;
  atualizadoEm: string;
}

export interface IndicadoresArtesaoService {
  obter(): Promise<IndicadoresArtesao>;
}
