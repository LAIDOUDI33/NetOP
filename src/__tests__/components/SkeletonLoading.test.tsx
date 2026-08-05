import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

// A small test component that uses Skeleton to simulate a loading state
function LoadingCard() {
  return (
    <div data-testid="loading-card">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <h3 className="text-sm font-medium">Loading Card</h3>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

describe('SkeletonLoading', () => {
  it('renders skeleton elements with correct base classes', () => {
    render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('rounded-md');
    expect(el.className).toContain('bg-accent');
  });

  it('applies custom className alongside base classes', () => {
    render(<Skeleton data-testid="skeleton" className="h-8 w-64" />);
    const el = screen.getByTestId('skeleton');
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('w-64');
    expect(el.className).toContain('animate-pulse');
  });

  it('renders as a div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');
    expect(el.tagName).toBe('DIV');
  });

  it('has data-slot attribute set to skeleton', () => {
    render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');
    expect(el).toHaveAttribute('data-slot', 'skeleton');
  });

  it('renders a loading card with multiple skeleton placeholders', () => {
    render(<LoadingCard />);
    // Should have the title
    expect(screen.getByText('Loading Card')).toBeInTheDocument();
    // Should have 3 skeleton divs
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(3);
  });
});
