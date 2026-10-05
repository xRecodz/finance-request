-- CreateTable
CREATE TABLE `BusinessRole` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `supervisorLabel` VARCHAR(191) NOT NULL DEFAULT 'Manager',
    `defaultTrack` ENUM('DIREKTUR', 'FINANCE') NOT NULL DEFAULT 'FINANCE',
    `defaultDestination` VARCHAR(191) NOT NULL DEFAULT 'HO',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusinessRole_code_key`(`code`),
    INDEX `BusinessRole_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing divisions plus Yayasan. IT/Admin may change these values later in Portal IT.
INSERT INTO `BusinessRole` (`id`, `code`, `name`, `supervisorLabel`, `defaultTrack`, `defaultDestination`, `isActive`, `sortOrder`, `updatedAt`) VALUES
  ('business-role-marketing', 'MARKETING', 'Marketing', 'Manager', 'FINANCE', 'HO', true, 10, CURRENT_TIMESTAMP(3)),
  ('business-role-ga', 'GA', 'GA', 'Manager', 'FINANCE', 'HO', true, 20, CURRENT_TIMESTAMP(3)),
  ('business-role-hrd', 'HRD', 'HRD', 'Manager', 'FINANCE', 'HO', true, 30, CURRENT_TIMESTAMP(3)),
  ('business-role-it', 'IT', 'IT', 'Manager', 'FINANCE', 'HO', true, 40, CURRENT_TIMESTAMP(3)),
  ('business-role-accounting', 'ACCOUNTING', 'Accounting', 'Manager', 'FINANCE', 'HO', true, 50, CURRENT_TIMESTAMP(3)),
  ('business-role-audit', 'AUDIT', 'Audit', 'Manager', 'FINANCE', 'HO', true, 60, CURRENT_TIMESTAMP(3)),
  ('business-role-finance', 'FINANCE', 'Finance', 'Manager', 'FINANCE', 'HO', true, 70, CURRENT_TIMESTAMP(3)),
  ('business-role-ic', 'IC', 'IC', 'Manager', 'FINANCE', 'HO', true, 80, CURRENT_TIMESTAMP(3)),
  ('business-role-operasional', 'OPERASIONAL', 'Operasional', 'Manager', 'FINANCE', 'OUTLET', true, 90, CURRENT_TIMESTAMP(3)),
  ('business-role-yayasan', 'YAYASAN', 'Yayasan', 'Mengetahui', 'FINANCE', 'HO', true, 100, CURRENT_TIMESTAMP(3));
