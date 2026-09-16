import type { Papel } from "@/types/usuario";

export type PapelCadastro = Extract<Papel, "comprador" | "artesao">;

export interface CadastroInput {
  nome: string;
  email: string;
  senha: string;
  papel: PapelCadastro;
}
