import type { Usuario } from "@/types/usuario";

export const USUARIOS_SEED: readonly Usuario[] = [
  {
    id: "seed-comprador-01",
    nome: "Ana Comprador",
    email: "ana.compradora@origem.test",
    senha: "senha-sintetica-comprador",
    papel: "comprador",
    ativo: true,
  },
  {
    id: "seed-artesao-01",
    nome: "Joao Artesao",
    email: "joao.artesao@origem.test",
    senha: "senha-sintetica-artesao",
    papel: "artesao",
    ativo: true,
  },
  {
    id: "seed-artesao-02",
    nome: "Maria Artesa",
    email: "maria.artesa@origem.test",
    senha: "senha-sintetica-artesao-02",
    papel: "artesao",
    ativo: true,
  },
  {
    id: "seed-admin-01",
    nome: "Admin Origem",
    email: "admin@origem.test",
    senha: "senha-sintetica-admin",
    papel: "admin",
    ativo: true,
  },
];
