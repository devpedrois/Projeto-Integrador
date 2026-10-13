import bcrypt from "bcrypt";

export function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
