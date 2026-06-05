import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.discordUserId = account.providerAccountId;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const discordUserId =
          typeof token.discordUserId === "string" ? token.discordUserId : token.sub;
        session.user.id = discordUserId ?? session.user.id;
      }

      return session;
    },
  },
});
