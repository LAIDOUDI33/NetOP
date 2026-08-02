/**
 * National SOC Platform - Authentication Page
 * 
 * Complete authentication UI with:
 * - Login form
 * - Registration form  
 * - MFA verification
 * - Password strength indicator
 * - Session management
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface AuthFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  mfaCode: string;
}

interface AuthState {
  mode: 'login' | 'register' | 'mfa';
  loading: boolean;
  error: string | null;
  success: string | null;
  user?: any;
  requiresMfa?: boolean;
}

interface PasswordStrength {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export default function AuthPage() {
  const router = useRouter();
  
  // State management
  const [authState, setAuthState] = useState<AuthState>({
    mode: 'login',
    loading: false,
    error: null,
    success: null
  });
  
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    mfaCode: ''
  });
  
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{email?: string; username?: string; password: string} | null>(null);

  // Check password strength (client-side validation) - defined before use
  const checkPasswordStrength = useCallback((password: string) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    const errors: string[] = [];
    let score = 0;

    if (password.length < 12) errors.push('At least 12 characters');
    else score += 20;

    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    else score += 20;

    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    else score += 20;

    if (!/[0-9]/.test(password)) errors.push('One number');
    else score += 20;

    if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
    else score += 20;

    // Determine strength level
    let strength: PasswordStrength['strength'] = 'weak';
    if (score >= 80) strength = 'very-strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';

    setPasswordStrength({
      isValid: errors.length === 0,
      errors,
      strength
    });
  }, []);

  // Check for existing session on mount - defined before use
  const checkExistingSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('soc_access_token');
      if (token) {
        const response = await fetch('/api/auth?action=me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      // No valid session, show login form
    }
  }, [router]);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  // Handle input changes
  const handleInputChange = useCallback((field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check password strength when password changes
    if (field === 'password') {
      checkPasswordStrength(value);
    }
    
    // Clear errors on input
    if (authState.error) {
      setAuthState(prev => ({ ...prev, error: null }));
    }
  }, [authState.error]);

  // Handle login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: formData.email || undefined,
          username: formData.username || undefined,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.requiresMfa) {
          // Switch to MFA mode
          setPendingCredentials({
            email: formData.email || undefined,
            username: formData.username || undefined,
            password: formData.password
          });
          setAuthState({
            mode: 'mfa',
            loading: false,
            error: null,
            success: null,
            requiresMfa: true
          });
        } else {
          // Login successful, store tokens
          storeTokens(data.tokens);
          
          setAuthState({
            mode: 'login',
            loading: false,
            error: null,
            success: 'Login successful! Redirecting...',
            user: data.user
          });

          // Redirect to dashboard after short delay
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Network error. Please try again.'
      }));
    }
  };

  // Handle MFA verification
  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          ...pendingCredentials,
          mfaCode: formData.mfaCode
        })
      });

      const data = await response.json();

      if (data.success) {
        storeTokens(data.tokens);
        
        setAuthState({
          mode: 'login',
          loading: false,
          error: null,
          success: 'Authentication successful!',
          user: data.user
        });

        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'MFA verification failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Verification failed. Please try again.'
      }));
    }
  };

  // Handle registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Passwords do not match'
      }));
      return;
    }

    // Validate password strength
    if (passwordStrength && !passwordStrength.isValid) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Password does not meet requirements'
      }));
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: formData.email,
          username: formData.username,
          password: formData.password,
          name: formData.name
        })
      });

      const data = await response.json();

      if (data.success) {
        storeTokens(data.tokens);
        
        setAuthState({
          mode: 'login',
          loading: false,
          error: null,
          success: 'Registration successful! Welcome to National SOC Platform.',
          user: data.user
        });

        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Registration failed'
        }));
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Registration failed. Please try again.'
      }));
    }
  };

  // Store auth tokens
  const storeTokens = (tokens: any) => {
    localStorage.setItem('soc_access_token', tokens.accessToken);
    localStorage.setItem('soc_refresh_token', tokens.refreshToken);
    localStorage.setItem('soc_token_expires', tokens.expiresAt);
  };

  // Toggle between login and register modes
  const toggleMode = () => {
    setAuthState(prev => ({
      ...prev,
      mode: prev.mode === 'login' ? 'register' : 'login',
      error: null,
      success: null
    }));
    setFormData({
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      mfaCode: ''
    });
    setPasswordStrength(null);
  };

  // Get strength color and label
  const getStrengthInfo = (strength: string) => {
    switch (strength) {
      case 'very-strong':
        return { color: '#10b981', label: 'Very Strong', width: '100%' };
      case 'strong':
        return { color: '#3b82f6', label: 'Strong', width: '75%' };
      case 'medium':
        return { color: '#f59e0b', label: 'Medium', width: '50%' };
      default:
        return { color: '#ef4444', label: 'Weak', width: '25%' };
    }
  };

  return (
    <div className="auth-container">
      {/* Background Pattern */}
      <div className="auth-background">
        <div className="auth-grid-pattern"></div>
        <div className="auth-gradient-overlay"></div>
      </div>

      {/* Main Content */}
      <div className="auth-content">
        {/* Logo & Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 24L18 30L28 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="14" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h1>National SOC Platform</h1>
          <p>Security Operations Center Dashboard</p>
        </div>

        {/* Authentication Forms */}
        <div className="auth-form-container">
          {/* Error Message */}
          {authState.error && (
            <div className="auth-message error">
              <span className="message-icon">⚠️</span>
              <span>{authState.error}</span>
            </div>
          )}

          {/* Success Message */}
          {authState.success && (
            <div className="auth-message success">
              <span className="message-icon">✅</span>
              <span>{authState.success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authState.mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <h2>Welcome Back</h2>
              <p className="form-subtitle">Sign in to access your dashboard</p>

              <div className="form-group">
                <label htmlFor="email-username">Email or Username</label>
                <input
                  id="email-username"
                  type="text"
                  value={formData.email || formData.username}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('@')) {
                      handleInputChange('email', val);
                      handleInputChange('username', '');
                    } else {
                      handleInputChange('username', val);
                      handleInputChange('email', '');
                    }
                  }}
                  placeholder="Enter email or username"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className={`btn-primary ${authState.loading ? 'loading' : ''}`}
                disabled={authState.loading}
              >
                {authState.loading ? (
                  <>
                    <span className="spinner"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button 
                type="button" 
                className="btn-secondary"
                onClick={toggleMode}
              >
                Create New Account
              </button>

              <p className="demo-hint">
                Demo credentials: any username / any password (development mode)
              </p>
            </form>
          )}

          {/* REGISTER FORM */}
          {authState.mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <h2>Create Account</h2>
              <p className="form-subtitle">Join the National SOC Platform team</p>

              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="you@organization.dz"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-username">Username</label>
                <input
                  id="reg-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Choose a username (3-30 chars)"
                  required
                  pattern="[a-zA-Z0-9_]{3,30}"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <div className="password-input">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwordStrength && formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill"
                        style={{
                          width: getStrengthInfo(passwordStrength.strength).width,
                          background: getStrengthInfo(passwordStrength.strength).color
                        }}
                      ></div>
                    </div>
                    <div className="strength-info">
                      <span style={{ color: getStrengthInfo(passwordStrength.strength).color }}>
                        {getStrengthInfo(passwordStrength.strength).label}
                      </span>
                      {!passwordStrength.isValid && (
                        <span className="strength-errors">
                          {passwordStrength.errors[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button 
                type="submit" 
                className={`btn-primary ${authState.loading ? 'loading' : ''}`}
                disabled={authState.loading || (passwordStrength !== null && !passwordStrength?.isValid)}
              >
                {authState.loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <button 
                type="button" 
                className="btn-secondary"
                onClick={toggleMode}
              >
                Sign In to Existing Account
              </button>
            </form>
          )}

          {/* MFA VERIFICATION FORM */}
          {authState.mode === 'mfa' && (
            <form onSubmit={handleMFAVerify} className="auth-form mfa-form">
              <div className="mfa-icon">🔐</div>
              <h2>Two-Factor Authentication</h2>
              <p className="form-subtitle">
                Enter the 6-digit code from your authenticator app
              </p>

              <div className="form-group">
                <label htmlFor="mfa-code">Authentication Code</label>
                <input
                  id="mfa-code"
                  type="text"
                  value={formData.mfaCode}
                  onChange={(e) => handleInputChange('mfaCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="mfa-code-input"
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className={`btn-primary ${authState.loading ? 'loading' : ''}`}
                disabled={authState.loading || formData.mfaCode.length !== 6}
              >
                {authState.loading ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <button 
                type="button" 
                className="btn-text"
                onClick={() => setAuthState({ mode: 'login', loading: false, error: null, success: null })}
              >
                ← Back to sign in
              </button>

              <p className="demo-hint">
                Development mode: Any 6-digit code will work
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <p>
            © 2026 National SOC Platform •{' '}
            <a href="#">Privacy Policy</a> •{' '}
            <a href="#">Terms of Service</a>
          </p>
          <p className="version-info">v2.0.0 | Phase 13 Complete</p>
        </div>
      </div>

      {/* Inline Styles */}
      <style jsx global>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Background */
        .auth-background {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }

        .auth-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .auth-gradient-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), transparent 70%);
        }

        /* Content */
        .auth-content {
          width: 100%;
          max-width: 420px;
          padding: 24px;
        }

        /* Header */
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          margin-bottom: 16px;
        }

        .auth-logo svg {
          width: 36px;
          height: 36px;
        }

        .auth-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .auth-header p {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }

        /* Form Container */
        .auth-form-container {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
        }

        /* Messages */
        .auth-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .auth-message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .auth-message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }

        /* Form Styles */
        .auth-form h2 {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .form-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 24px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 6px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input::placeholder {
          color: #64748b;
        }

        /* Password Input */
        .password-input {
          position: relative;
        }

        .password-input input {
          padding-right: 45px;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .toggle-password:hover {
          opacity: 1;
        }

        /* Password Strength */
        .password-strength {
          margin-top: 8px;
        }

        .strength-bar {
          height: 4px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .strength-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          font-size: 12px;
        }

        .strength-errors {
          color: #fca5a5;
        }

        /* Form Options */
        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #94a3b8;
        }

        .remember-me input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #3b82f6;
        }

        .forgot-link {
          font-size: 13px;
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #60a5fa;
        }

        /* Buttons */
        .btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          color: #cbd5e1;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(148, 163, 184, 0.5);
        }

        .btn-text {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .btn-text:hover {
          color: #cbd5e1;
        }

        /* Divider */
        .auth-divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: calc(50% - 30px);
          height: 1px;
          background: rgba(148, 163, 184, 0.2);
        }

        .auth-divider::before { left: 0; }
        .auth-divider::after { right: 0; }

        .auth-divider span {
          background: rgba(15, 23, 42, 0.6);
          padding: 0 12px;
          font-size: 13px;
          color: #64748b;
        }

        /* MFA Form */
        .mfa-icon {
          font-size: 48px;
          text-align: center;
          margin-bottom: 16px;
        }

        .mfa-code-input {
          text-align: center;
          font-size: 24px;
          letter-spacing: 8px;
          font-family: monospace;
        }

        /* Demo Hint */
        .demo-hint {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin-top: 16px;
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 6px;
        }

        /* Spinner */
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .auth-footer {
          text-align: center;
          margin-top: 32px;
        }

        .auth-footer p {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0;
        }

        .auth-footer a {
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s;
        }

        .auth-footer a:hover {
          color: #94a3b8;
        }

        .version-info {
          font-size: 11px !important;
          color: #475569 !important;
        }
      `}</style>
    </div>
  );
}
