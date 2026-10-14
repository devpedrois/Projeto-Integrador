export interface PerfilArtesao {
  artesaoId: string;
  nome?: string;
  completo?: boolean;
  historia: string;
  tecnicaId: string;
  regiaoId: string;
  fotoUrl?: string;
}

export interface PerfilArtesaoInput {
  historia: string;
  tecnicaId: string;
  regiaoId: string;
  fotoUrl?: string;
}
