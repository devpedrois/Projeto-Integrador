import multer from "multer";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const FOTO_MAX_BYTES = 2 * 1024 * 1024;
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FOTO_MAX_BYTES, files: 1, fields: 0, parts: 1 },
  fileFilter: (_request, file, callback) => {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
      callback(
        new AppError(400, "FOTO_INVALIDA", "Envie uma foto JPG ou PNG."),
      );
      return;
    }
    callback(null, true);
  },
}).single("foto");

export const receberFotoPerfil: RequestHandler = (request, response, next) => {
  parser(request, response, (error: unknown) => {
    if (error) {
      const excedido =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      next(
        new AppError(
          excedido ? 413 : 400,
          excedido ? "FOTO_MUITO_GRANDE" : "FOTO_INVALIDA",
          excedido
            ? "A foto deve ter ate 2 MB."
            : "Envie somente um arquivo JPG ou PNG no campo foto.",
        ),
      );
      return;
    }
    if (!request.file || request.file.size === 0) {
      next(new AppError(400, "FOTO_INVALIDA", "Envie uma foto JPG ou PNG."));
      return;
    }
    if (request.file.size > FOTO_MAX_BYTES) {
      next(new AppError(413, "FOTO_MUITO_GRANDE", "A foto deve ter ate 2 MB."));
      return;
    }
    const { buffer, mimetype } = request.file;
    const jpg = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const png = buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (
      !(mimetype === "image/jpeg" && jpg) &&
      !(mimetype === "image/png" && png)
    ) {
      next(
        new AppError(
          400,
          "FOTO_INVALIDA",
          "O conteudo deve corresponder a JPG ou PNG.",
        ),
      );
      return;
    }
    next();
  });
};
