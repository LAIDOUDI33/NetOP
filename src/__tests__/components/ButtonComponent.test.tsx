import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with text content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders as a button element by default', () => {
    render(<Button>Test</Button>);
    const el = screen.getByText('Test');
    expect(el.tagName).toBe('BUTTON');
  });

  it('has data-slot attribute set to button', () => {
    render(<Button>Test</Button>);
    const el = screen.getByText('Test');
    expect(el).toHaveAttribute('data-slot', 'button');
  });

  it('calls click handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not fire click handler when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    const btn = screen.getByText('Disabled');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies disabled styling classes', () => {
    render(<Button disabled>Disabled</Button>);
    const el = screen.getByText('Disabled');
    expect(el.className).toContain('disabled:opacity-50');
    expect(el.className).toContain('disabled:pointer-events-none');
  });

  it('applies default variant classes', () => {
    render(<Button>Default</Button>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('bg-primary');
    expect(el.className).toContain('text-primary-foreground');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const el = screen.getByText('Outline');
    expect(el.className).toContain('border');
    expect(el.className).toContain('bg-background');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const el = screen.getByText('Ghost');
    expect(el.className).toContain('hover:bg-accent');
  });

  it('applies size classes', () => {
    render(<Button size="sm">Small</Button>);
    const el = screen.getByText('Small');
    expect(el.className).toContain('h-8');
  });

  it('merges custom className with variant classes', () => {
    render(<Button className="extra-class">Custom</Button>);
    const el = screen.getByText('Custom');
    expect(el.className).toContain('extra-class');
    expect(el.className).toContain('bg-primary');
  });
});
