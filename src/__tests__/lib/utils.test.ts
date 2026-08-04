import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names from strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('deduplicates tailwind classes with tailwind-merge', () => {
    // twMerge should resolve conflicting tailwind classes — last one wins
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges padding shorthand correctly', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles object-style class inputs', () => {
    expect(cn({ 'text-red': true, 'text-blue': false })).toBe('text-red');
  });

  it('handles array-style class inputs', () => {
    expect(cn(['foo', 'bar', 'baz'])).toBe('foo bar baz');
  });

  it('handles mixed input types', () => {
    expect(cn('base', { active: true, disabled: false }, ['extra'])).toBe(
      'base active extra'
    );
  });

  it('handles undefined and null values gracefully', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});
