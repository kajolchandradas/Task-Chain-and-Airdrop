import { jsonb, text, timestamp, pgTable } from "drizzle-orm/pg-core";

/**
 * The panel service stores its evolving domain state as one versioned JSON
 * document for this first mobile release. Keeping the document in PostgreSQL
 * makes account activation, rewards, notifications, and support history
 * survive API restarts without coupling the mobile client to a migration-heavy
 * schema while the product is still being validated.
 */
export const panelState = pgTable("panel_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});