import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "member" | "librarian" | "admin";
    };
  }
  interface User {
    role?: "member" | "librarian" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
