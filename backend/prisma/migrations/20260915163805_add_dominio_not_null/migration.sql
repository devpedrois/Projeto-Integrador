/*
  Warnings:

  - Made the column `compradorId` on table `Pedido` required. This step will fail if there are existing NULL values in that column.
  - Made the column `artesaoId` on table `Produto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoriaId` on table `Produto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Pedido" ALTER COLUMN "compradorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Produto" ALTER COLUMN "artesaoId" SET NOT NULL,
ALTER COLUMN "categoriaId" SET NOT NULL;
