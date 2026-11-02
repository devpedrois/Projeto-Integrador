export type Papel = "comprador" | "artesao" | "admin";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  ativo: boolean;
}

export type UsuarioPublico = Omit<Usuario, "senha">;

export type UsuarioResumoPublico = Pick<
  UsuarioPublico,
  "id" | "nome" | "papel" | "ativo"
>;

export function paraUsuarioPublico(usuario: Usuario): UsuarioPublico {
  const { senha, ...publico } = usuario;
  void senha;
  return publico;
}
