import { z } from "zod";
import { desc, eq, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "@/server/trpc";
import { users } from "@/server/db/schema";

const ROLES = ["pending", "member", "librarian", "admin", "deactivated"] as const;

export const adminUsersRouter = createTRPCRouter({
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(ROLES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from changing their own role
      if (input.userId === (ctx.session.user.id as string)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot change your own role.",
        });
      }
      const [updated] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, name: users.name, role: users.role });
      return updated;
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === (ctx.session.user.id as string)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete yourself." });
      }
      const [deleted] = await ctx.db
        .delete(users)
        .where(eq(users.id, input.userId))
        .returning({ name: users.name });
      return { ok: true, name: deleted?.name };
    }),
});
