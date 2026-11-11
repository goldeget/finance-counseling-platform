import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  reference: text('reference').unique(),
  iv: text('iv').notNull(),
  ciphertext: text('ciphertext').notNull(),
});

export const submissionLimits = sqliteTable('submission_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  author: text('author').notNull(),
  source: text('source').notNull(),
  rating: integer('rating').notNull(),
  content: text('content').notNull(),
  reviewDate: text('review_date').notNull(),
  createdAt: text('created_at').notNull(),
});
