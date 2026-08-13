import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { ALL_MODULES, ALL_ACTIONS, ROLE_DEFAULTS } from './rbac-constants';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: string[];
      permissions: string[];
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
  }
}

// Resolve permissions from role names (no DB query needed)
function resolvePermissions(roleNames: string[]): string[] {
  const perms = new Set<string>();
  for (const roleName of roleNames) {
    const defaults = ROLE_DEFAULTS[roleName] ?? [];
    for (const permStr of defaults) {
      if (permStr === '*:*') {
        for (const mod of ALL_MODULES) for (const action of ALL_ACTIONS) perms.add(`${mod}:${action}`);
      } else {
        const [mod, action] = permStr.split(':');
        if (action === '*') { for (const a of ALL_ACTIONS) perms.add(`${mod}:${a}`); }
        else { perms.add(permStr); }
      }
    }
  }
  return Array.from(perms);
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
    maxAge: 8 * 60 * 60, // 8 hours
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email!;
        token.name = user.name!;
        token.roles = (user as any).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.email = token.email!;
        session.user.name = token.name!;
        const roles = (token.roles as string[]) ?? [];
        (session.user as any).roles = roles;
        (session.user as any).permissions = resolvePermissions(roles);
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};