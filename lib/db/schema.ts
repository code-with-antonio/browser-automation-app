import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Starter schema. Replace/extend these tables with your real domain model.
 *
 * `casing: "snake_case"` (set in drizzle.config.ts and the db client) means you
 * write camelCase in TypeScript and Drizzle maps it to snake_case columns —
 * so `clerkId` here becomes the `clerk_id` column.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
