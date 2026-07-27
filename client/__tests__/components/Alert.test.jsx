import { render, screen, fireEvent } from '@testing-library/react';
import Alert from '@/components/Alert';

describe('Alert component', () => {
  it('renders children', () => {
    render(<Alert>This is an alert</Alert>);
    expect(screen.getByText('This is an alert')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title="Important">Something happened</Alert>);
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('applies correct styles for each variant', () => {
  const variants = ['success', 'error', 'warning', 'info'];
  variants.forEach((v) => {
    const { container } = render(<Alert variant={v}>test</Alert>);
    const className = container.firstChild.className;
    if (v === 'success') {
      expect(className).toMatch(/border-signal/);
    } else if (v === 'error') {
      expect(className).toMatch(/border-alert/);
    } else if (v === 'warning') {
      expect(className).toMatch(/border-amber-400/);
    } else if (v === 'info') {
      expect(className).toMatch(/border-sky-400/);
    }
  });
});

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<Alert onClose={onClose}>Dismiss me</Alert>);
    const button = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(button);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders glyph icon for each variant', () => {
    const variants = ['success', 'error', 'warning', 'info'];
    variants.forEach((v) => {
      const { container } = render(<Alert variant={v}>test</Alert>);
      const glyph = container.querySelector('[aria-hidden="true"]');
      expect(glyph).toBeInTheDocument();
    });
  });
});