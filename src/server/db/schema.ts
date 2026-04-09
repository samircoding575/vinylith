import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  boolean,
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

// ── Users ──────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Items ──────────────────────────────────────────────────────────────────────
export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: itemTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  condition: conditionEnum("condition").notNull().default("good"),
  imageUrl: text("image_url"),
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
  embedding: jsonb("embedding").$type<number[] | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Condition logs ─────────────────────────────────────────────────────────────
export const conditionLogs = pgTable("condition_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  condition: conditionEnum("condition").notNull(),
  notes: text("notes"),
  loggedBy: uuid("logged_by").references(() => users.id),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// ── Borrowings ─────────────────────────────────────────────────────────────────
export const borrowings = pgTable("borrowings", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowedAt: timestamp("borrowed_at").defaultNow().notNull(),
  dueAt: timestamp("due_at").notNull(),
  returnedAt: timestamp("returned_at"),
});

// ── Late fees ──────────────────────────────────────────────────────────────────
// $0.25 per day overdue, capped at $10.00 (= 1000 cents)
export const lateFees = pgTable("late_fees", {
  id: uuid("id").defaultRandom().primaryKey(),
  borrowingId: uuid("borrowing_id").notNull().references(() => borrowings.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),            // e.g. 250 = $2.50
  paidAt: timestamp("paid_at"),                             // null = unpaid
  stripePaymentIntentId: text("stripe_payment_intent_id"),  // set after Stripe confirms
  stripeSessionId: text("stripe_session_id"),               // checkout session id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Password reset tokens ──────────────────────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),  // random 64-char hex, hashed in DB
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Email notifications log ────────────────────────────────────────────────────
export const emailLogs = pgTable("email_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  type: text("type").notNull(),  // "borrow_confirmation" | "due_reminder" | "overdue" | "password_reset"
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  success: boolean("success").notNull().default(true),
  error: text("error"),
});

// ── Relations ──────────────────────────────────────────────────────────────────
export const itemsRelations = relations(items, ({ many }) => ({
  conditionLogs: many(conditionLogs),
  borrowings: many(borrowings),
}));

export const usersRelations = relations(users, ({ many }) => ({
  borrowings: many(borrowings),
  lateFees: many(lateFees),
  passwordResetTokens: many(passwordResetTokens),
}));

export const borrowingsRelations = relations(borrowings, ({ one, many }) => ({
  item: one(items, { fields: [borrowings.itemId], references: [items.id] }),
  user: one(users, { fields: [borrowings.userId], references: [users.id] }),
  lateFees: many(lateFees),
}));

export const conditionLogsRelations = relations(conditionLogs, ({ one }) => ({
  item: one(items, { fields: [conditionLogs.itemId], references: [items.id] }),
}));

export const lateFeesRelations = relations(lateFees, ({ one }) => ({
  borrowing: one(borrowings, { fields: [lateFees.borrowingId], references: [borrowings.id] }),
  user: one(users, { fields: [lateFees.userId], references: [users.id] }),
}));

// ── Types ──────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Borrowing = typeof borrowings.$inferSelect;
export type ConditionLog = typeof conditionLogs.$inferSelect;
export type LateFee = typeof lateFees.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
