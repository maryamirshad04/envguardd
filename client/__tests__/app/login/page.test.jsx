import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from '@/app/login/page';
import { api } from '@/lib/api';

// Mocks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    verifyLogin2fa: jest.fn(),
    googleLogin: jest.fn(),
  },
}));

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

describe('LoginPage', () => {
  const mockRouterPush = jest.fn();
  const mockSearchParamsGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useSearchParams.mockReturnValue({
      get: mockSearchParamsGet,
    });
  });

  test('renders login form', () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    render(<LoginPage />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument();
  });

  test('submits form with email and password', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockResolvedValue({ user: {} });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error on failed login', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Invalid credentials');
  });

  test('shows 2FA input when login requires 2FA', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockResolvedValue({ requires2fa: true, tempToken: 'temp123' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await screen.findByText('Enter your code');
    expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
  });

  test('verifies 2FA code and redirects', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockResolvedValue({ requires2fa: true, tempToken: 'temp123' });
    api.verifyLogin2fa.mockResolvedValue({});
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await screen.findByText('Enter your code');
    await userEvent.type(screen.getByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify/i }));

    await waitFor(() => {
      expect(api.verifyLogin2fa).toHaveBeenCalledWith('temp123', '123456');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error on 2FA failure', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockResolvedValue({ requires2fa: true, tempToken: 'temp123' });
    api.verifyLogin2fa.mockRejectedValue(new Error('Invalid code'));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await screen.findByText('Enter your code');
    await userEvent.type(screen.getByPlaceholderText('123456'), '000000');
    await userEvent.click(screen.getByRole('button', { name: /Verify/i }));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Invalid code');
  });

  test('back button on 2FA goes back', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.login.mockResolvedValue({ requires2fa: true, tempToken: 'temp123' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await screen.findByText('Enter your code');
    const backButton = screen.getByRole('button', { name: /Back/i });
    await userEvent.click(backButton);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Enter your code')).not.toBeInTheDocument();
  });

  test('Google sign-in redirects on success', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.googleLogin.mockResolvedValue({});
    render(<LoginPage />);

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    await waitFor(() => {
      expect(api.googleLogin).toHaveBeenCalledWith('mock-google-credential');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('Google sign-in shows error on failure', async () => {
    mockSearchParamsGet.mockReturnValue('/dashboard');
    api.googleLogin.mockRejectedValue(new Error('Google auth failed'));
    render(<LoginPage />);

    const googleButton = screen.getByTestId('google-signin');
    await userEvent.click(googleButton);

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Google auth failed');
  });
});