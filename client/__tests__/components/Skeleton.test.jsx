import { render } from '@testing-library/react';
import { Skeleton, CardGridSkeleton, ProjectSkeleton } from '@/components/Skeleton';

describe('Skeleton', () => {
  test('renders with default class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  test('renders with custom className', () => {
    const { container } = render(<Skeleton className="h-10" />);
    expect(container.firstChild).toHaveClass('h-10');
  });

  test('CardGridSkeleton renders correct number of skeletons', () => {
    const { container } = render(<CardGridSkeleton count={2} />);
    const items = container.querySelectorAll('.rounded-sm.border.border-line');
    expect(items).toHaveLength(2);
  });

  test('ProjectSkeleton renders without crashing', () => {
    const { container } = render(<ProjectSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});