import type { UsuarioCriado } from "../repositories/usuario.repository.js";

declare module "express-serve-static-core" {
  interface Locals {
    usuario?: UsuarioCriado;
  }
}
