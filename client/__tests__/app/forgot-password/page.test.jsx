import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/app/forgot-password/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    forgotPassword: jest.fn(),
  },
}));

jest.mock('@/components/Alert', () => {
  return function MockAlert({ variant, children }) {
    return <div data-testid={`alert-${variant}`}>{children}</div>;
  };
});

describe('ForgotPasswordPage', () => {
  test('renders form', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send reset link/i })).toBeInTheDocument();
  });

  test('submits email and shows success', async () => {
    api.forgotPassword.mockResolvedValue({});
    render(<ForgotPasswordPage />);

    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    await screen.findByText('Check your email');
    expect(api.forgotPassword).toHaveBeenCalledWith('test@example.com');
    expect(screen.getByTestId('alert-success')).toHaveTextContent(
      /If an account exists for test@example.com/
    );
  });

  test('shows error on failure', async () => {
    api.forgotPassword.mockRejectedValue(new Error('User not found'));
    render(<ForgotPasswordPage />);

    await userEvent.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /Send reset link/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('User not found');
  });
});