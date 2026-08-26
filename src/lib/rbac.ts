import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { ALL_MODULES, ALL_ACTIONS, ROLES, ROLE_DEFAULTS, MODULE_VIEW_MAP } from './rbac-constants';

export { MODULE_VIEW_MAP, ROLES, ALL_MODULES, ALL_ACTIONS };
export type { RoleName } from './rbac-constants';

// Get current user session on server side
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

// Check if current user has a specific permission
export async function hasPermission(module: string, action: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const perms = user.permissions as string[];
  if (perms.includes('*:*')) return true;
  if (perms.includes(`${module}:*`)) return true;
  return perms.includes(`${module}:${action}`);
}

// Check if current user has any of the given permissions
export async function hasAnyPermission(permissions: string[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const perms = user.permissions as string[];
  if (perms.includes('*:*')) return true;
  return permissions.some((p) => {
    const [mod, act] = p.split(':');
    if (perms.includes(`${mod}:*`)) return true;
    return perms.includes(p);
  });
}

// Get allowed views for current user
export async function getAllowedViews(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const perms = user.permissions as string[];
  if (perms.includes('*:*')) {
    return Object.values(MODULE_VIEW_MAP).flat();
  }

  const allowedViews = new Set<string>();
  for (const [mod, views] of Object.entries(MODULE_VIEW_MAP)) {
    if (perms.includes(`${mod}:*`) || perms.includes(`${mod}:view`)) {
      views.forEach((v) => allowedViews.add(v));
    }
  }
  return Array.from(allowedViews);
}

// Seed roles and permissions (call once during setup)
export async function seedRbac() {
  // Create permissions using module_action unique constraint
  const permIdMap: Record<string, string> = {};
  for (const mod of ALL_MODULES) {
    for (const action of ALL_ACTIONS) {
      const key = `${mod}:${action}`;
      let perm = await db.permission.findUnique({ where: { module_action: { module: mod, action } } });
      if (!perm) {
        perm = await db.permission.create({ data: { module: mod, action } });
      }
      permIdMap[key] = perm.id;
    }
  }

  // Create roles with permissions
  for (const [roleName, roleDef] of Object.entries(ROLES)) {
    const role = await db.role.upsert({
      where: { name: roleName },
      update: { displayName: roleDef.displayName, description: roleDef.description, isSystem: true },
      create: { name: roleName, displayName: roleDef.displayName, description: roleDef.description, isSystem: true },
    });

    const permStrings = ROLE_DEFAULTS[roleName] ?? [];
    for (const permStr of permStrings) {
      const keysToGrant: string[] = [];
      if (permStr === '*:*') {
        for (const mod of ALL_MODULES) {
          for (const action of ALL_ACTIONS) {
            keysToGrant.push(`${mod}:${action}`);
          }
        }
      } else {
        const [mod, action] = permStr.split(':');
        if (action === '*') {
          for (const a of ALL_ACTIONS) {
            keysToGrant.push(`${mod}:${a}`);
          }
        } else {
          keysToGrant.push(permStr);
        }
      }

      for (const key of keysToGrant) {
        const permissionId = permIdMap[key];
        if (!permissionId) continue;
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
      }
    }
  }

  // Create default admin user
  const adminEmail = 'admin@netoptima-dz.local';
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminRole = await db.role.findUnique({ where: { name: 'superadmin' } });
    const user = await db.user.create({
      data: { email: adminEmail, name: 'System Administrator', passwordHash, department: 'System' },
    });
    if (adminRole) {
      await db.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
    }
  }

  // Create demo users for each role
  const demoUsers = [
    { email: 'noc@netoptima-dz.local', name: 'NOC Manager', role: 'noc_manager', dept: 'NOC' },
    { email: 'rf@netoptima-dz.local', name: 'RF Engineer', role: 'rf_engineer', dept: 'RF Optimization' },
    { email: 'nop@netoptima-dz.local', name: 'NOP Engineer', role: 'nop_engineer', dept: 'Network Ops' },
    { email: 'field@netoptima-dz.local', name: 'Field Technician', role: 'field_tech', dept: 'Field Operations' },
    { email: 'viewer@netoptima-dz.local', name: 'Viewer', role: 'view_only', dept: 'Management' },
  ];

  for (const du of demoUsers) {
    const existing = await db.user.findUnique({ where: { email: du.email } });
    if (!existing) {
      const demoPassword = process.env.DEMO_PASSWORD || 'demo123';
      const passwordHash = await bcrypt.hash(demoPassword, 10);
      const role = await db.role.findUnique({ where: { name: du.role } });
      const user = await db.user.create({
        data: { email: du.email, name: du.name, passwordHash, department: du.dept },
      });
      if (role) {
        await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }
    }
  }
}