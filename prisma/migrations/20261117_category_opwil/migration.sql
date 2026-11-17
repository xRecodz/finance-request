-- AlterTable
ALTER TABLE `Category` ADD COLUMN `opwil` ENUM('OPWIL_1', 'OPWIL_2') NULL;

-- CreateIndex
CREATE INDEX `Category_kind_opwil_isActive_idx` ON `Category`(`kind`, `opwil`, `isActive`);
