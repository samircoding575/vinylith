import { createTRPCRouter } from "@/server/trpc";
import { itemsRouter } from "./routers/items";
import { borrowingsRouter } from "./routers/borrowings";
import { usersRouter } from "./routers/users";
import { searchRouter } from "./routers/search";

export const appRouter = createTRPCRouter({
  items: itemsRouter,
  borrowings: borrowingsRouter,
  users: usersRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
