import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import ResetPasswordPage from '@/app/reset-password/[token]/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    resetPassword: jest.fn(),
  },
}));

jest.mock('@/components/Alert', () => {
  return function MockAlert({ variant, children }) {
    return <div data-testid={`alert-${variant}`}>{children}</div>;
  };
});

describe('ResetPasswordPage', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useParams.mockReturnValue({ token: 'abc123' });
  });

  test('renders form', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText('Set a new password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update password/i })).toBeInTheDocument();
  });

  test('shows error if passwords do not match', async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Passwords do not match');
  });

  test('shows error if password too short', async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Password must be at least 8 characters');
  });

  test('successfully resets password and redirects', async () => {
    api.resetPassword.mockResolvedValue({});
    jest.useFakeTimers();

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }));

    // Wait for the success message to appear
    await waitFor(
      () => {
        expect(screen.getByText('Password updated')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(api.resetPassword).toHaveBeenCalledWith('abc123', 'NewPassword123!');

    // Advance timers to trigger the redirect after 2 seconds
    jest.advanceTimersByTime(2000);
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
    jest.useRealTimers();
  }, 15000);

  test('shows error on reset failure', async () => {
    api.resetPassword.mockRejectedValue(new Error('Invalid or expired token'));
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'NewPassword123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Invalid or expired token');
  }, 15000);
});