ALTER TABLE `applications` ADD `reference` text;--> statement-breakpoint
CREATE UNIQUE INDEX `applications_reference_unique` ON `applications` (`reference`);