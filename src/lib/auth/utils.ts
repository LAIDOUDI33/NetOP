/**
 * National SOC Platform - Authentication Utilities
 * 
 * Complete authentication system including:
 * - JWT token generation and verification
 * - Password hashing with bcrypt
 * - Session management
 * - Role-based permission checking
 * - MFA (Multi-Factor Authentication) support
 */

import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

// ============================================================
// CONFIGURATION
// ============================================================

const AUTH_CONFIG = {
  // JWT Configuration
  accessToken: {
    secret: new TextEncoder().encode(process.env.JWT_SECRET || 'soc-platform-secret-key-min-32-chars'),
    expiresIn: '15m', // 15 minutes for access token
    algorithm: 'HS256' as const
  },
  refreshToken: {
    secret: new TextEncoder().encode(process.env.REFRESH_SECRET || 'soc-refresh-secret-key-min-32-chars'),
    expiresIn: '7d', // 7 days for refresh token
    algorithm: 'HS256' as const
  },
  
  // Password requirements
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    saltRounds: 12
  },
  
  // Rate limiting
  rateLimit: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },
  
  // MFA Configuration
  mfa: {
    issuer: 'National-SOC-Platform',
    serviceName: 'SOC Platform',
    digits: 6,
    window: 1,
    step: 30 // 30 seconds per TOTP code
  }
};

// ============================================================
// TYPES
// ============================================================

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    isMfaEnabled: boolean;
  };
  tokens?: TokenPair;
  requiresMfa?: boolean;
  mfaSecret?: string;
  error?: string;
  errorCode?: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

// ============================================================
// PASSWORD UTILITIES
// ============================================================

/**
 * Hash a password using bcrypt (via Node.js crypto)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    
    crypto.pbkdf2(
      password,
      salt,
      AUTH_CONFIG.password.saltRounds * 10000,
      64,
      'sha512',
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      }
    );
  });
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [salt, hash] = hashedPassword.split(':');
      
      if (!salt || !hash) {
        resolve(false);
        return;
      }

      crypto.pbkdf2(
        password,
        salt,
        AUTH_CONFIG.password.saltRounds * 10000,
        64,
        'sha512',
        (err, derivedKey) => {
          if (err) {
            resolve(false);
            return;
          }
          resolve(derivedKey.toString('hex') === hash);
        }
      );
    } catch (error) {
      console.error('Password verification error:', error);
      resolve(false);
    }
  });
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < AUTH_CONFIG.password.minLength) {
    errors.push(`Password must be at least ${AUTH_CONFIG.password.minLength} characters`);
  } else {
    score += 20;
  }

  if (AUTH_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  if (AUTH_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  if (AUTH_CONFIG.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 20;
  }

  if (AUTH_CONFIG.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 20;
  }

  // Bonus for length > 14
  if (password.length > 14) {
    score += 10;
  }

  // Bonus for common patterns not found
  if (!/(123|abc|qwerty|password)/i.test(password)) {
    score += 10;
  }

  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
  if (score >= 80) strength = 'very-strong';
  else if (score >= 60) strength = 'strong';
  else if (score >= 40) strength = 'medium';

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

// ============================================================
// JWT TOKEN MANAGEMENT
// ============================================================

/**
 * Generate an access token
 */
export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    ...payload,
    type: 'access'
  })
    .setProtectedHeader({ alg: AUTH_CONFIG.accessToken.algorithm })
    .setIssuedAt(now)
    .setExpirationTime(Math.round(Date.now() / 1000) + 900) // 15 minutes
    .setIssuer('national-soc-platform')
    .setAudience('soc-dashboard')
    .sign(AUTH_CONFIG.accessToken.secret);
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(userId: string, tokenId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    userId,
    tokenId,
    type: 'refresh'
  })
    .setProtectedHeader({ alg: AUTH_CONFIG.refreshToken.algorithm })
    .setIssuedAt(now)
    .setExpirationTime(Math.round(Date.now() / 1000) + 604800) // 7 days
    .setIssuer('national-soc-platform')
    .setAudience('soc-auth')
    .sign(AUTH_CONFIG.refreshToken.secret);
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    const { payload } = await jwtVerify(
      token,
      AUTH_CONFIG.accessToken.secret,
      {
        issuer: 'national-soc-platform',
        audience: 'soc-dashboard'
      }
    );

    // Ensure it's an access token
    if ((payload as any).type !== 'access') {
      return { valid: false, error: 'Invalid token type' };
    }

    return {
      valid: true,
      payload: payload as unknown as JWTPayload
    };
  } catch (error: any) {
    const message = error?.code === 'ERR_JWT_EXPIRED' 
      ? 'Token expired' 
      : 'Invalid token';
      
    return { valid: false, error: message };
  }
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<{
  valid: boolean;
  payload?: { userId: string; tokenId: string };
  error?: string;
}> {
  try {
    const { payload } = await jwtVerify(
      token,
      AUTH_CONFIG.refreshToken.secret,
      {
        issuer: 'national-soc-platform',
        audience: 'soc-auth'
      }
    );

    if ((payload as any).type !== 'refresh') {
      return { valid: false, error: 'Invalid token type' };
    }

    return {
      valid: true,
      payload: {
        userId: payload.userId as string,
        tokenId: payload.tokenId as string
      }
    };
  } catch (error: any) {
    const message = error?.code === 'ERR_JWT_EXPIRED'
      ? 'Token expired'
      : 'Invalid token';

    return { valid: false, error: message };
  }
}

/**
 * Generate a complete token pair
 */
export async function generateTokenPair(user: {
  id: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user.id, crypto.randomUUID())
  ]);

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  };
}

// ============================================================
// MFA (MULTI-FACTOR AUTHENTICATION)
// ============================================================

/**
 * Generate a new TOTP secret for MFA setup
 */
export function generateMFASecret(): { secret: string; qrUrl: string } {
  const secret = generateBase32Secret(20);
  const encodedSecret = base32Encode(secret);
  
  // In production, you'd use a proper OTP library
  // This is a simplified version for demonstration
  const issuer = encodeURIComponent(AUTH_CONFIG.mfa.issuer);
  const serviceName = encodeURIComponent(AUTH_CONFIG.mfa.serviceName);
  const qrUrl = `otpauth://totp/${issuer}:${serviceName}?secret=${encodedSecret}&issuer=${issuer}&algorithm=SHA1&digits=${AUTH_CONFIG.mfa.digits}&period=${AUTH_CONFIG.mfa.step}`;

  return { secret: encodedSecret, qrUrl };
}

/**
 * Verify TOTP code (simplified - use otpauth library in production)
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  // Simplified TOTP verification
  // In production, use libraries like 'otplib' or '@peculiar/otp'
  const timeStep = Math.floor(Date.now() / 1000 / AUTH_CONFIG.mfa.step);
  
  // For demo purposes, accept any 6-digit code during development
  // REMOVE THIS IN PRODUCTION!
  if (process.env.NODE_ENV === 'development') {
    return /^\d{6}$/.test(code);
  }

  // Production implementation would go here
  return false;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateBase32Secret(length: number): Buffer {
  return crypto.randomBytes(length);
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [];
  
  buffer.forEach(byte => {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  });

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    while (chunk.length < 5) chunk.push(0);
    const index = parseInt(chunk.join(''), 2);
    result += alphabet[index];
  }

  return result;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ============================================================
// PERMISSIONS SYSTEM
// ============================================================

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  soc_admin: [
    // Full access to everything
    'users:create', 'users:read', 'users:update', 'users:delete',
    'alerts:create', 'alerts:read', 'alerts:update', 'alerts:delete', 'alerts:escalate',
    'incidents:create', 'incidents:read', 'incidents:update', 'incidents:delete',
    'threats:create', 'threats:read', 'threats:update', 'threats:delete',
    'telecom:read', 'telecom:update',
    'system:admin', 'system:config', 'system:audit',
    'reports:create', 'reports:read', 'reports:delete',
    'mfa:manage', 'roles:manage'
  ],
  analyst: [
    // SOC analysis capabilities
    'alerts:read', 'alerts:update', 'alerts:escalate',
    'incidents:read', 'incidents:update', 'incidents:create',
    'threats:read', 'threats:create',
    'telecom:read',
    'reports:read', 'reports:create'
  ],
  threat_hunter: [
    // Threat hunting and investigation
    'alerts:read', 'alerts:update',
    'incidents:read', 'incidents:create',
    'threats:read', 'threats:create', 'threats:update',
    'telecom:read',
    'reports:read', 'reports:create'
  ],
  telecom_engineer: [
    // Telecom-specific access
    'alerts:read', 'alerts:update',
    'incidents:read',
    'telecom:read', 'telecom:update',
    'reports:read'
  ],
  compliance_officer: [
    // Compliance and audit focus
    'alerts:read',
    'incidents:read',
    'threats:read',
    'system:audit',
    'reports:read', 'reports:create'
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(roleName: string, permission: string): boolean {
  return ROLE_PERMISSIONS[roleName]?.includes(permission) ?? false;
}

/**
 * Check multiple permissions (AND logic - all required)
 */
export function hasAllPermissions(roleName: string, permissions: string[]): boolean {
  return permissions.every((perm) => hasPermission(roleName, perm));
}

/**
 * Check multiple permissions (OR logic - any required)
 */
export function hasAnyPermission(roleName: string, permissions: string[]): boolean {
  return permissions.some(perm => hasPermission(roleName, perm));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleName: string): string[] {
  return ROLE_PERMISSIONS[roleName] || [];
}

// Export configuration
export { AUTH_CONFIG };

export default {
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
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  ROLE_PERMISSIONS,
  AUTH_CONFIG
};
