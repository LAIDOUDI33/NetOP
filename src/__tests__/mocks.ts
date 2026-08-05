import { vi } from 'vitest';

// Mock useT hook
vi.mock('@/lib/i18n', () => ({
  useT: () => (key: string) => key,
}));

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
