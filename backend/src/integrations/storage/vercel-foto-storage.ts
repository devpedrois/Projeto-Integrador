import { del, put } from "@vercel/blob";
import { AppError } from "../../errors/app-error.js";
import type { FotoStorage } from "./foto-storage.js";

export class VercelFotoStorage implements FotoStorage {
  constructor(private readonly token = process.env.BLOB_READ_WRITE_TOKEN) {}

  async salvar(caminho: string, bytes: Buffer, mime: string): Promise<string> {
    if (!this.token)
      throw new AppError(503, "FOTO_INDISPONIVEL", "Upload indisponivel.");
    const blob = await put(caminho, bytes, {
      access: "public",
      contentType: mime,
      token: this.token,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return blob.url;
  }

  async remover(url: string): Promise<void> {
    if (!this.token)
      throw new AppError(503, "FOTO_INDISPONIVEL", "Upload indisponivel.");
    await del(url, { token: this.token });
  }
}
