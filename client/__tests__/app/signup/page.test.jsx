import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import SignupPage from '@/app/signup/page';
import { api } from '@/lib/api';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    signup: jest.fn(),
    googleLogin: jest.fn(),
    resendVerification: jest.fn(),
  },
}));

// Mock child components to avoid external dependencies
jest.mock('@/components/Modal', () => {
  return function MockModal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        <div>{children}</div>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('@/components/GoogleSignInButton', () => {
  return function MockGoogleSignInButton({ onCredential }) {
    return (
      <button
        data-testid="google-signin"
        onClick={() => onCredential('mock-google-credential')}
      >
        Sign in with Google
      </button>
    );
  };
});

jest.mock('@/components/Alert', () => {
  return function MockAlert({ variant, children }) {
    return <div data-testid={`alert-${variant}`}>{children}</div>;
  };
});

jest.mock('@/components/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner" />;
  };
});

describe('SignupPage', () => {
  const mockRouterPush = jest.fn();
  const mockSearchParamsGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useSearchParams.mockReturnValue({
      get: mockSearchParamsGet,
    });
  });

  test('renders signup form', () => {
    render(<SignupPage />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  test('shows email validation error on blur', async () => {
    render(<SignupPage />);
    const emailInput = screen.getByLabelText('Email');
    await userEvent.type(emailInput, 'invalid');
    fireEvent.blur(emailInput);
    // The error should appear inside an Alert with variant error
    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('please include @ in the email address');
  });

  test('shows password validation error on blur', async () => {
    render(<SignupPage />);
    const passwordInput = screen.getByLabelText('Password');
    await userEvent.type(passwordInput, 'short');
    fireEvent.blur(passwordInput);
    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Password must be at least 8 characters long');
  });

  test('submits form with valid email and password', async () => {
    api.signup.mockResolvedValue({});
    mockSearchParamsGet.mockReturnValue('/dashboard');
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(api.signup).toHaveBeenCalledWith('test@example.com', 'Password123!');
      // Should show verification sent screen
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  test('shows error on signup failure', async () => {
    api.signup.mockRejectedValue(new Error('Email already exists'));
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Create account/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Email already exists');
  });

  test('resend verification email', async () => {
    api.signup.mockResolvedValue({});
    api.resendVerification.mockResolvedValue({});
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await screen.findByText('Check your email');
    const resendButton = screen.getByRole('button', { name: /Didn't get the email\? Resend/i });
    await userEvent.click(resendButton);

    await waitFor(() => {
      expect(api.resendVerification).toHaveBeenCalledWith('test@example.com');
      // Success message appears inside an Alert with variant success
      expect(screen.getByTestId('alert-success')).toHaveTextContent('Verification email resent. Check your inbox.');
    });
  });

  test('Google sign-in redirects on success', async () => {
    api.googleLogin.mockResolvedValue({});
    mockSearchParamsGet.mockReturnValue('/dashboard');
    render(<SignupPage />);

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    await waitFor(() => {
      expect(api.googleLogin).toHaveBeenCalledWith('mock-google-credential');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('Google sign-in shows error on failure', async () => {
    api.googleLogin.mockRejectedValue(new Error('Google auth failed'));
    render(<SignupPage />);

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Google auth failed');
  });

  test('shows 2FA modal when show2fa param is present', async () => {
    mockSearchParamsGet
      .mockImplementation((key) => {
        if (key === 'show2fa') return '1';
        return null;
      });
    render(<SignupPage />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Secure your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set up now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip for now/i })).toBeInTheDocument();
  });

  test('clicking "Set up now" redirects to settings', async () => {
    mockSearchParamsGet
      .mockImplementation((key) => {
        if (key === 'show2fa') return '1';
        return '/dashboard';
      });
    render(<SignupPage />);
    const setupButton = screen.getByRole('button', { name: /Set up now/i });
    await userEvent.click(setupButton);
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/settings?setup2fa=1');
  });

  test('clicking "Skip for now" redirects to dashboard', async () => {
    mockSearchParamsGet
      .mockImplementation((key) => {
        if (key === 'show2fa') return '1';
        if (key === 'redirect') return '/dashboard';
        return null;
      });
    render(<SignupPage />);
    const skipButton = screen.getByRole('button', { name: /Skip for now/i });
    await userEvent.click(skipButton);
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });
});