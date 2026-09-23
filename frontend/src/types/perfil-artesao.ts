export interface PerfilArtesao {
  artesaoId: string;
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
