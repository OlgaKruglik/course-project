/*
  Warnings:

  - Made the column `apiToken` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `apiToken` VARCHAR(191) NOT NULL DEFAULT '';
