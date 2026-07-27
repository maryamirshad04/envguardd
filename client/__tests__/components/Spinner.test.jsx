import { render } from '@testing-library/react';
import Spinner from '@/components/Spinner';

describe('Spinner', () => {
  test('renders with default class', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
    expect(svg).toHaveClass('h-4 w-4');
  });

  test('renders with custom class', () => {
    const { container } = render(<Spinner className="h-8 w-8 text-signal" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8 w-8');
    expect(svg).toHaveClass('text-signal');
  });
});