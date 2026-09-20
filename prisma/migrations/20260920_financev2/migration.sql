-- AlterTable
ALTER TABLE `Request` ADD COLUMN `businessRoleAtSubmit` VARCHAR(191) NULL,
    ADD COLUMN `destination` VARCHAR(191) NULL,
    ADD COLUMN `disbursementOfficerId` VARCHAR(191) NULL,
    ADD COLUMN `workflowVersion` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `businessRole` VARCHAR(191) NULL,
    ADD COLUMN `homeOutletId` VARCHAR(191) NULL,
    ADD COLUMN `onboardingComplete` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `workLocation` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ManagerRoute` (
    `id` VARCHAR(191) NOT NULL,
    `businessRole` VARCHAR(191) NOT NULL,
    `outletCategoryId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManagerRoute_businessRole_outletCategoryId_isActive_idx`(`businessRole`, `outletCategoryId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisbursementRoute` (
    `id` VARCHAR(191) NOT NULL,
    `track` ENUM('DIREKTUR', 'FINANCE') NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DisbursementRoute_track_destination_key`(`track`, `destination`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Disbursement` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `disbursedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'VALID',
    `source` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Disbursement_requestId_status_idx`(`requestId`, `status`),
    INDEX `Disbursement_officerId_disbursedAt_idx`(`officerId`, `disbursedAt`),
    INDEX `Disbursement_disbursedAt_status_idx`(`disbursedAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Request_disbursementOfficerId_status_idx` ON `Request`(`disbursementOfficerId`, `status`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_homeOutletId_fkey` FOREIGN KEY (`homeOutletId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_disbursementOfficerId_fkey` FOREIGN KEY (`disbursementOfficerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManagerRoute` ADD CONSTRAINT `ManagerRoute_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisbursementRoute` ADD CONSTRAINT `DisbursementRoute_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disbursement` ADD CONSTRAINT `Disbursement_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disbursement` ADD CONSTRAINT `Disbursement_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
