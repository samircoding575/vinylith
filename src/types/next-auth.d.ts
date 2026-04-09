import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "pending" | "member" | "librarian" | "admin" | "deactivated";
    };
  }
  interface User {
    role?: "pending" | "member" | "librarian" | "admin" | "deactivated";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
