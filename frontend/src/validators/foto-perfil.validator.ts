import { ServiceError } from "@/services/errors";

function lerAssinatura(arquivo: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const falhar = () =>
      reject(new ServiceError("FOTO_INVALIDA", "Não foi possível ler a foto."));
    reader.onerror = falhar;
    reader.onabort = falhar;
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        falhar();
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(arquivo);
  });
}

export async function validarFotoPerfil(arquivo: File): Promise<void> {
  if (arquivo.size > 2 * 1024 * 1024)
    throw new ServiceError("FOTO_MUITO_GRANDE", "A foto deve ter até 2 MB.");
  if (!arquivo.size || !["image/jpeg", "image/png"].includes(arquivo.type))
    throw new ServiceError("FOTO_INVALIDA", "Selecione uma foto JPG ou PNG.");
  const bytes = await lerAssinatura(arquivo.slice(0, 8));
  const assinatura =
    arquivo.type === "image/jpeg"
      ? [255, 216, 255]
      : [137, 80, 78, 71, 13, 10, 26, 10];
  if (!assinatura.every((byte, indice) => bytes[indice] === byte))
    throw new ServiceError(
      "FOTO_INVALIDA",
      "O conteúdo deve corresponder a JPG ou PNG.",
    );
}
