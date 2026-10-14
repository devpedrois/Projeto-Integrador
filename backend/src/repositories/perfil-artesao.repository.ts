import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import type { CamposPerfilArtesao } from "../domain/perfil-artesao-completo.js";
import { AppError } from "../errors/app-error.js";

export interface PerfilArtesaoDTO extends CamposPerfilArtesao {
  artesaoId: string;
  nome: string;
  fotoUrl?: string;
  completo: boolean;
}
type UsuarioPerfil = Prisma.UsuarioGetPayload<{ select: typeof selecao }>;
const selecao = {
  id: true,
  nome: true,
  perfilArtesao: {
    select: {
      historia: true,
      tecnicaPrincipalId: true,
      regiaoId: true,
      foto: true,
      completo: true,
    },
  },
} as const;

function dto(usuario: UsuarioPerfil): PerfilArtesaoDTO {
  const perfil = usuario.perfilArtesao;
  return {
    artesaoId: usuario.id,
    nome: usuario.nome,
    historia: perfil?.historia ?? "",
    tecnicaId: perfil?.tecnicaPrincipalId ?? "",
    regiaoId: perfil?.regiaoId ?? "",
    ...(perfil?.foto ? { fotoUrl: perfil.foto } : {}),
    completo: perfil?.completo ?? false,
  };
}
export interface PerfilArtesaoRepository {
  obter(id: string): Promise<PerfilArtesaoDTO | null>;
  tecnicaExiste(id: string): Promise<boolean>;
  regiaoExiste(id: string): Promise<boolean>;
  atualizar(
    id: string,
    preparar: (atual: PerfilArtesaoDTO) => PerfilArtesaoDTO,
  ): Promise<PerfilArtesaoDTO>;
}

export class PrismaPerfilArtesaoRepository implements PerfilArtesaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async obter(id: string): Promise<PerfilArtesaoDTO | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, ativo: true, papel: "artesao" },
      select: selecao,
    });
    return usuario ? dto(usuario) : null;
  }
  async tecnicaExiste(id: string): Promise<boolean> {
    return (
      (await this.prisma.tecnica.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async regiaoExiste(id: string): Promise<boolean> {
    return (
      (await this.prisma.regiao.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async atualizar(
    id: string,
    preparar: (atual: PerfilArtesaoDTO) => PerfilArtesaoDTO,
  ): Promise<PerfilArtesaoDTO> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const usuario = await tx.usuario.findFirst({
        where: { id, ativo: true, papel: "artesao" },
        select: selecao,
      });
      if (!usuario)
        throw new AppError(
          404,
          "ARTESAO_NAO_ENCONTRADO",
          "Artesao nao encontrado.",
        );
      const perfil = preparar(dto(usuario));
      const data = {
        historia: perfil.historia,
        tecnicaPrincipalId: perfil.tecnicaId || null,
        regiaoId: perfil.regiaoId || null,
        foto: perfil.fotoUrl || null,
        completo: perfil.completo,
      };
      await tx.perfilArtesao.upsert({
        where: { usuarioId: id },
        create: { usuarioId: id, ...data },
        update: data,
      });
      return perfil;
    });
  }
}
