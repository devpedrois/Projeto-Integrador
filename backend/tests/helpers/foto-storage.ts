import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { FotoStorage } from "../../src/integrations/storage/foto-storage.js";

export class FotoDiscoTemporario implements FotoStorage {
  constructor(readonly raiz: string) {}

  async salvar(caminho: string, bytes: Buffer, _mime: string): Promise<string> {
    void _mime;
    const destino = join(this.raiz, caminho);
    await mkdir(join(destino, ".."), { recursive: true });
    await writeFile(destino, bytes, { flag: "wx" });
    return `https://disco.example.test/${caminho}`;
  }

  async remover(url: string): Promise<void> {
    await unlink(join(this.raiz, new URL(url).pathname));
  }
}
