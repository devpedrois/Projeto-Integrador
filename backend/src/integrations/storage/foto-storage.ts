export interface FotoStorage {
  salvar(caminho: string, bytes: Buffer, mime: string): Promise<string>;
  remover(url: string): Promise<void>;
}
