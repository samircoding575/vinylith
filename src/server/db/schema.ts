import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["member", "librarian", "admin"]);
export const itemTypeEnum = pgEnum("item_type", [
  "book",
  "toy",
  "notebook",
  "vinyl",
]);
export const conditionEnum = pgEnum("condition", [
  "mint",
  "near_mint",
  "good",
  "fair",
  "poor",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: itemTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  condition: conditionEnum("condition").notNull().default("good"),
  imageUrl: text("image_url"),
  // JSONB for type-specific attributes
  // book:  { isbn, author, genre, pages, publisher, year }
  // vinyl: { artist, label, year, genre, rpm, sleeveCondition }
  // toy:   { ageRating, manufacturer, material, category }
  // notebook: { pages, ruling, brand, size }
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
  // Serialized embedding vector (stored as JSON array of floats).
  // In production, switch to pgvector: vector("embedding", { dimensions: 1536 })
  embedding: jsonb("embedding").$type<number[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conditionLogs = pgTable("condition_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  condition: conditionEnum("condition").notNull(),
  notes: text("notes"),
  loggedBy: uuid("logged_by").references(() => users.id),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const borrowings = pgTable("borrowings", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  borrowedAt: timestamp("borrowed_at").defaultNow().notNull(),
  dueAt: timestamp("due_at").notNull(),
  returnedAt: timestamp("returned_at"),
});

export const itemsRelations = relations(items, ({ many }) => ({
  conditionLogs: many(conditionLogs),
  borrowings: many(borrowings),
}));

export const usersRelations = relations(users, ({ many }) => ({
  borrowings: many(borrowings),
}));

export const borrowingsRelations = relations(borrowings, ({ one }) => ({
  item: one(items, { fields: [borrowings.itemId], references: [items.id] }),
  user: one(users, { fields: [borrowings.userId], references: [users.id] }),
}));

export const conditionLogsRelations = relations(conditionLogs, ({ one }) => ({
  item: one(items, {
    fields: [conditionLogs.itemId],
    references: [items.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Borrowing = typeof borrowings.$inferSelect;
export type ConditionLog = typeof conditionLogs.$inferSelect;
