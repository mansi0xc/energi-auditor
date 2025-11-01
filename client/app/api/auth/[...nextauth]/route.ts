import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { NextRequest } from "next/server"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "@energi.team"

      // Check if user email ends with the allowed domain
      if (user.email && user.email.endsWith(ALLOWED_DOMAIN)) {
        return true
      }

      // Reject sign-in - NextAuth will redirect to error page with AccessDenied error
      return false
    },
    async session({ session, token }) {
      // Add any additional session data if needed
      return session
    },
    async jwt({ token, user, account }) {
      // Add any additional token data if needed
      return token
    },
    async redirect({ url, baseUrl }) {
      try {
        // Always send users to the home page after auth
        if (url.startsWith("/")) {
          return baseUrl
        }
        const dest = new URL(url)
        if (dest.origin === baseUrl) {
          return dest.toString()
        }
      } catch {}
      return baseUrl
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
