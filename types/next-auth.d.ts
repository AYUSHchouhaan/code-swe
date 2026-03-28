import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    githubLogin?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    githubLogin?: string;
  }
}
