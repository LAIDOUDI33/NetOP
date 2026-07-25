/**
 * National SOC Platform - Authentication API
 * 
 * Complete authentication endpoints:
 * - POST /api/auth/login - User login with credentials
 * - POST /api/auth/register - New user registration
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Invalidate session
 * - GET /api/auth/me - Get current user info
 * - POST /api/auth/mfa/enable - Enable MFA for user
 * - POST /api/auth/mfa/verify - Verify MFA code
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  generateMFASecret,
  verifyTOTPCode,
  extractTokenFromHeader,
  generateSecureToken,
  AUTH_CONFIG,
  type AuthResult,
  type JWTPayload
} from '@/lib/auth/utils';

// Rate limiting store (in-memory, use Redis in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();

/**
 * Check rate limiting for login attempts
 */
function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutRemaining?: number } {
  const now = new Date();
  const record = loginAttempts.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: AUTH_CONFIG.rateLimit.maxAttempts };
  }

  // Check if currently locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemaining: Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000)
    };
  }

  // Reset if window has passed (15 minutes)
  if (now.getTime() - record.lastAttempt.getTime() > AUTH_CONFIG.rateLimit.lockoutDuration) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remainingAttempts: AUTH_CONFIG.rateLimit.maxAttempts - 1 };
  }

  return { allowed: true, remainingAttempts: AUTH_CONFIG.rateLimit.maxAttempts - record.count };
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
  const now = new Date();
  const record = loginAttempts.get(identifier);

  if (!record) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return;
  }

  const newCount = record.count + 1;

  if (newCount >= AUTH_CONFIG.rateLimit.maxAttempts) {
    // Lock out
    const lockoutEnd = new Date(now.getTime() + AUTH_CONFIG.rateLimit.lockoutDuration);
    loginAttempts.set(identifier, { count: newCount, lastAttempt: now, lockedUntil: lockoutEnd });
  } else {
    loginAttempts.set(identifier, { count: newCount, lastAttempt: now });
  }
}

/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

// ============================================================
// LOGIN ENDPOINT
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'login':
        return await handleLogin(data, request);
      
      case 'register':
        return await handleRegister(data);
      
      case 'refresh':
        return await handleRefresh(data);
      
      case 'logout':
        return await handleLogout(request);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also handle GET for /me endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  
  if (searchParams.get('action') === 'me') {
    return await handleGetMe(request);
  }
  
  return NextResponse.json(
    { success: false, error: 'Invalid action' },
    { status: 400 }
  );
}

// ============================================================
// HANDLER FUNCTIONS
// ============================================================

async function handleLogin(data: {
  email?: string;
  username?: string;
  password: string;
  mfaCode?: string;
}, request: NextRequest): Promise<NextResponse> {
  const { email, username, password, mfaCode } = data;

  // Validate input
  if (!password || (!email && !username)) {
    return NextResponse.json(
      { success: false, error: 'Email/username and password are required' },
      { status: 400 }
    );
  }

  // Check rate limiting
  const identifier = email || username!;
  const rateCheck = checkRateLimit(identifier);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many login attempts',
        errorCode: 'RATE_LIMITED',
        lockoutRemaining: rateCheck.lockoutRemaining
      },
      { status: 429 }
    );
  }

  // Find user - use fresh Prisma client to avoid caching issues
  const freshPrisma = new PrismaClient();
  const user = await freshPrisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : [])
      ]
    },
    include: {
      role: {
        select: { id: true, name: true }
      }
    }
  });

  if (!user) {
    await freshPrisma.$disconnect();
    recordFailedAttempt(identifier);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
        remainingAttempts: rateCheck.remainingAttempts - 1
      },
      { status: 401 }
    );
  }

  // Check if account is active
  if (!user.isActive) {
    return NextResponse.json(
      { success: false, error: 'Account is disabled', errorCode: 'ACCOUNT_DISABLED' },
      { status: 403 }
    );
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    recordFailedAttempt(identifier);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
        remainingAttempts: rateCheck.remainingAttempts - 1
      },
      { status: 401 }
    );
  }

  // Check MFA if enabled
  if (user.isMfaEnabled && user.mfaSecret) {
    if (!mfaCode) {
      // Return that MFA is required
      clearFailedAttempts(identifier);
      
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        message: 'MFA code required'
      });
    }

    // Verify MFA code
    const mfaValid = verifyTOTPCode(user.mfaSecret, mfaCode);
    
    if (!mfaValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid MFA code', errorCode: 'INVALID_MFA' },
        { status: 401 }
      );
    }
  }

  // Disconnect fresh Prisma client
  await freshPrisma.$disconnect();

  // Clear failed attempts on success
  clearFailedAttempts(identifier);

  // Generate tokens
  const permissions = parsePermissions(user.role.permissions);
  const tokens = await generateTokenPair({
    userId: user.id,
    email: user.email,
    username: user.username,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions
  });


  // Create session record - use fresh Prisma client
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  await freshPrisma.session.create({
    data: {
      token: generateSecureToken(64),
      refreshToken: tokens.refreshToken,
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }
  });

  // Update last login - use fresh Prisma client
  await freshPrisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // Disconnect fresh client
  await freshPrisma.$disconnect();

  // Create audit log entry
  await createAuditLog(user.id, 'LOGIN', 'User', user.id, 'SUCCESS');

  return NextResponse.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role.name,
      isMfaEnabled: user.isMfaEnabled
    },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString()
    }
  });
}

async function handleRegister(data: {
  email: string;
  username: string;
  password: string;
  name: string;
  roleId?: string;
}): Promise<NextResponse> {
  const { email, username, password, name, roleId } = data;

  // Validate required fields
  if (!email || !username || !password || !name) {
    return NextResponse.json(
      { success: false, error: 'All fields are required: email, username, password, name' },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Invalid email format' },
      { status: 400 }
    );
  }

  // Validate username format (alphanumeric with underscores)
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return NextResponse.json(
      { success: false, error: 'Username must be 3-30 characters (letters, numbers, underscores)' },
      { status: 400 }
    );
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      },
      { status: 400 }
    );
  }

  // Check if user already exists
  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email }, { username }]
    }
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'Email' : 'Username';
    return NextResponse.json(
      { success: false, error: `${field} already exists`, errorCode: 'DUPLICATE_USER' },
      { status: 409 }
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Get or use specified role
  let targetRoleId = roleId;
  
  if (!targetRoleId) {
    // Default to analyst role for new registrations
    const defaultRole = await db.role.findFirst({
      where: { name: 'analyst' }
    });
    targetRoleId = defaultRole?.id || '';
  }

  // Create user
  const user = await db.user.create({
    data: {
      email,
      username,
      passwordHash: hashedPassword,
      name,
      roleId: targetRoleId,
      isActive: true,
      isMfaEnabled: false
    },
    include: {
      role: { select: { name: true } }
    }
  });

  // Generate initial tokens
  const permissions = getRolePermissions(user.role.name);
  const tokens = await generateTokenPair({
    userId: user.id,
    email: user.email,
    username: user.username,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions
  });

  // Create session
  const ipAddress = 'registration';
  const userAgent = 'registration';

  await db.session.create({
    data: {
      token: generateSecureToken(64),
      refreshToken: tokens.refreshToken,
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // Create audit log
  await createAuditLog(user.id, 'REGISTER', 'User', user.id, 'SUCCESS');

  return NextResponse.json({
    success: true,
    message: 'Registration successful',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role.name,
      isMfaEnabled: false
    },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString()
    }
  }, { status: 201 });
}

async function handleRefresh(data: {
  refreshToken: string;
}): Promise<NextResponse> {
  const { refreshToken } = data;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: 'Refresh token is required' },
      { status: 400 }
    );
  }

  // Verify refresh token
  const verification = await verifyRefreshToken(refreshToken);

  if (!verification.valid) {
    return NextResponse.json(
      { success: false, error: verification.error || 'Invalid refresh token', errorCode: 'INVALID_TOKEN' },
      { status: 401 }
    );
  }

  // Find session
  const session = await db.session.findFirst({
    where: {
      refreshToken,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: {
          role: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!session || !session.user.isActive) {
    return NextResponse.json(
      { success: false, error: 'Session not found or expired', errorCode: 'SESSION_EXPIRED' },
      { status: 401 }
    );
  }

  // Generate new token pair
  const permissions = parsePermissions(session.user.role.permissions);
  const tokens = await generateTokenPair({
    userId: session.user.id,
    email: session.user.email,
    username: session.user.username,
    roleId: session.user.roleId,
    roleName: session.user.role.name,
    permissions
  });

  // Update session with new refresh token
  await db.session.update({
    where: { id: session.id },
    data: {
      refreshToken: tokens.refreshToken,
      lastActivity: new Date(),
      updatedAt: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString()
    }
  });
}

async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    // Verify and invalidate session
    const verification = await verifyAccessToken(token);
    
    if (verification.valid && verification.payload) {
      await db.session.updateMany({
        where: {
          userId: verification.payload.userId,
          isActive: true
        },
        data: {
          isActive: false,
          terminatedAt: new Date()
        }
      });

      await createAuditLog(verification.payload.userId, 'LOGOUT', 'Session', null, 'SUCCESS');
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });
}

async function handleGetMe(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const verification = await verifyAccessToken(token);

  if (!verification.valid || !verification.payload) {
    return NextResponse.json(
      { success: false, error: verification.error || 'Invalid token' },
      { status: 401 }
    );
  }

  // Fetch full user data
  const user = await db.user.findUnique({
    where: { id: verification.payload.userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      isActive: true,
      isMfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
          description: true
        }
      },
      _count: {
        select: {
          incidents: {
            where: { status: { notIn: ['RESOLVED', 'CLOSED'] } }
          },
          tasks: {
            where: { status: 'PENDING' }
          }
        }
      }
    }
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { success: false, error: 'User not found or inactive' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      ...user,
      permissions: verification.payload.permissions,
      activeIncidents: user._count.incidents,
      pendingTasks: user._count.tasks
    }
  });
}

// ============================================================
// MFA ENDPOINTS (Separate routes would be cleaner, but included here)
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const verification = await verifyAccessToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    switch (action) {
      case 'enable-mfa':
        return await handleEnableMFA(verification.payload.userId);
      
      case 'verify-mfa':
        return await handleVerifyMFA(verification.payload.userId, data.code);
      
      case 'disable-mfa':
        return await handleDisableMFA(verification.payload.userId, data.password);
      
      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MFA error:', error);
    return NextResponse.json({ success: false, error: 'MFA operation failed' }, { status: 500 });
  }
}

async function handleEnableMFA(userId: string): Promise<NextResponse> {
  const { secret, qrUrl } = generateMFASecret();

  // Store secret temporarily (not yet enabled)
  // In production, you'd store this encrypted
  
  return NextResponse.json({
    success: true,
    mfaSecret: secret,
    qrUrl,
    instructions: 'Scan this QR code with your authenticator app, then verify with a code to enable MFA'
  });
}

async function handleVerifyMFA(userId: string, code: string): Promise<NextResponse> {
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ success: false, error: 'Valid 6-digit code required' }, { status: 400 });
  }

  // In production, verify against stored secret
  // For demo, accept any valid format code in development
  if (process.env.NODE_ENV === 'development') {
    // Enable MFA for user
    await db.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true }
    });

    return NextResponse.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  }

  return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
}

async function handleDisableMFA(userId: string, password: string): Promise<NextResponse> {
  if (!password) {
    return NextResponse.json({ success: false, error: 'Password required to disable MFA' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  await db.user.update({
    where: { id: userId },
    data: { isMfaEnabled: false, mfaSecret: null }
  });

  return NextResponse.json({
    success: true,
    message: 'MFA disabled successfully'
  });
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parsePermissions(permissionsJson: string | null): string[] {
  if (!permissionsJson) return [];
  
  try {
    const parsed = JSON.parse(permissionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getRolePermissions(roleName: string): string[] {
  const { ROLE_PERMISSIONS } = require('@/lib/auth/utils');
  return ROLE_PERMISSIONS[roleName] || [];
}

async function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  resourceId: string | null,
  outcome: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        outcome: outcome as any,
        category: 'AUTHENTICATION',
        ipAddress: 'system',
        errorMessage: null
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
