import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    render(<Badge>Test</Badge>);
    const el = screen.getByText('Test');
    expect(el.tagName).toBe('SPAN');
  });

  it('has data-slot attribute set to badge', () => {
    render(<Badge>Test</Badge>);
    const el = screen.getByText('Test');
    expect(el).toHaveAttribute('data-slot', 'badge');
  });

  it('applies default variant classes', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('bg-primary');
    expect(el.className).toContain('text-primary-foreground');
  });

  it('applies secondary variant classes', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const el = screen.getByText('Secondary');
    expect(el.className).toContain('bg-secondary');
    expect(el.className).toContain('text-secondary-foreground');
  });

  it('applies destructive variant classes', () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const el = screen.getByText('Destructive');
    expect(el.className).toContain('bg-destructive');
    expect(el.className).toContain('text-white');
  });

  it('applies outline variant classes', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const el = screen.getByText('Outline');
    expect(el.className).toContain('text-foreground');
  });

  it('merges custom className with variant classes', () => {
    render(<Badge className="extra-class">Custom</Badge>);
    const el = screen.getByText('Custom');
    expect(el.className).toContain('extra-class');
    expect(el.className).toContain('bg-primary');
  });
});
