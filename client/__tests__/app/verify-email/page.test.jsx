import { render, screen, act } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import VerifyEmailPage from '@/app/verify-email/[token]/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    verifyEmail: jest.fn(),
  },
}));

describe('VerifyEmailPage', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    // Default: valid token
    useParams.mockReturnValue({ token: 'token123' });
    api.verifyEmail.mockResolvedValue({ message: 'Email verified' });
  });

  test('shows loading spinner initially', async () => {
    api.verifyEmail.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<VerifyEmailPage />);
    });
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText(/Verifying your email/i)).toBeInTheDocument();
  });

  test('shows success message on successful verification', async () => {
    await act(async () => {
      render(<VerifyEmailPage />);
    });
    // Check the success heading
    const heading = await screen.findByRole('heading', { name: /Email verified!/i });
    expect(heading).toBeInTheDocument();
    // Check the redirect message
    expect(screen.getByText(/Redirecting you to set up 2FA/i)).toBeInTheDocument();
  });

  test('shows error on invalid token', async () => {
    api.verifyEmail.mockRejectedValue(new Error('Invalid token'));
    await act(async () => {
      render(<VerifyEmailPage />);
    });

    const errorAlert = await screen.findByText(/Invalid token/i);
    expect(errorAlert).toBeInTheDocument();
    // The button text is "Try again"
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  test('shows error when token is missing', async () => {
    useParams.mockReturnValue({});
    api.verifyEmail.mockRejectedValue(new Error('Invalid token'));
    await act(async () => {
      render(<VerifyEmailPage />);
    });

    const errorAlert = await screen.findByText(/Invalid token/i);
    expect(errorAlert).toBeInTheDocument();
  });
});