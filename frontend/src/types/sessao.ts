import type { Papel } from "@/types/usuario";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}
