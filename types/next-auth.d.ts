import type { UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { RoleName } from "../lib/auth/roles";

declare module "next-auth" {
  interface User {
    id: string;
    roles: RoleName[];
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      roles: RoleName[];
      status: UserStatus;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: RoleName[];
    status?: UserStatus;
  }
}
