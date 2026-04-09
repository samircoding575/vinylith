import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "@/server/trpc";
import { users } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { enforceRateLimit, getClientKey } from "@/server/rate-limit";

export const usersRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email().max(200),
        password: z.string().min(6).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = getClientKey(ctx.headers);
      // 5 registrations per IP per hour
      enforceRateLimit(`register:${ip}`, {
        limit: 5,
        windowMs: 60 * 60 * 1000,
      });

      const [existing] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      const [created] = await ctx.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          role: "pending", // requires admin approval before borrowing
        })
        .returning();
      return { id: created.id, email: created.email, name: created.name, role: created.role };
    }),
});
