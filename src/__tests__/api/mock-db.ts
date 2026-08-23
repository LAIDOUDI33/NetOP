/**
 * Shared helpers for API route tests.
 * The mock DB must be defined inline in vi.hoisted per file (vitest hoisting limitation).
 * This file exports only non-mocked helpers.
 */
import { NextRequest } from 'next/server';

/** Default date used by mock records */
export const NOW = new Date('2025-01-15T12:00:00.000Z');

/** ISO string of NOW */
export const NOW_ISO = NOW.toISOString();

/** Helper: build a NextRequest with query params */
export function makeNextRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}
