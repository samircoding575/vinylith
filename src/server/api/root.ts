import { createTRPCRouter } from "@/server/trpc";
import { itemsRouter } from "./routers/items";
import { borrowingsRouter } from "./routers/borrowings";
import { usersRouter } from "./routers/users";
import { searchRouter } from "./routers/search";
import { adminRouter } from "./routers/admin";
import { paymentsRouter } from "./routers/payments";
import { authRouter } from "./routers/auth";
import { waitlistRouter } from "./routers/waitlist";
import { adminUsersRouter } from "./routers/adminUsers";

export const appRouter = createTRPCRouter({
  items: itemsRouter,
  borrowings: borrowingsRouter,
  users: usersRouter,
  search: searchRouter,
  admin: adminRouter,
  adminUsers: adminUsersRouter,
  payments: paymentsRouter,
  auth: authRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
