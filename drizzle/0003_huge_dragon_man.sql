CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`source` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`review_date` text NOT NULL,
	`created_at` text NOT NULL
);
