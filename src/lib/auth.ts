import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      permissions: string[]; // "module:action" format e.g. "dashboard:view"
    };
  }
  interface User {
    roles?: string[];
    permissions?: string[];
  }
  interface JWT {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Flatten roles and permissions
        const roles = user.roles.map((ur) => ur.role.name);
        const permissions = user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => `${rp.permission.module}:${rp.permission.action}`)
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles,
          permissions,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email!;
        token.name = user.name!;
        token.roles = (user as any).roles ?? [];
        token.permissions = (user as any).permissions ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.email = token.email!;
        session.user.name = token.name!;
        (session.user as any).roles = token.roles;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'netoptima-dev-secret-change-in-production',
};