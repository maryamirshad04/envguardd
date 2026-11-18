import { render, screen } from '@testing-library/react';
import Navbar from '@/components/Navbar';

describe('Navbar', () => {
  test('renders logo and navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('envguard')).toBeInTheDocument();
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /Get started/i })).toHaveAttribute('href', '/signup');
  });
});