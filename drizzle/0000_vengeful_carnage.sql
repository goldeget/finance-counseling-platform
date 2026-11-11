CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`iv` text NOT NULL,
	`ciphertext` text NOT NULL
);
