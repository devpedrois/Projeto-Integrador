import type { Categoria } from "@/types/categoria";
import type { Tecnica } from "@/types/tecnica";
import type { Regiao } from "@/types/regiao";

export interface OpcoesFiltroService {
  categorias(): Promise<readonly Categoria[]>;
  tecnicas(): Promise<readonly Tecnica[]>;
  regioes(): Promise<readonly Regiao[]>;
}
