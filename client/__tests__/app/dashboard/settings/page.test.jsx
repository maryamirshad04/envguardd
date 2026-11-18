import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import SettingsPage from '@/app/dashboard/settings/page';
import { useDashboard } from '@/lib/DashboardContext';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/DashboardContext', () => ({
  useDashboard: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    updateEmail: jest.fn(),
    twoFactor: {
      status: jest.fn(),
      setup: jest.fn(),
      verify: jest.fn(),
      disable: jest.fn(),
    },
  },
}));

jest.mock('@/components/Spinner', () => ({
  __esModule: true,
  default: () => <div data-testid="spinner" />,
}));

jest.mock('@/components/Alert', () => ({
  __esModule: true,
  default: ({ variant, children, title }) => (
    <div data-testid={`alert-${variant}`}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  ),
}));

afterEach(() => {
  jest.useRealTimers();
});

describe('SettingsPage', () => {
  const mockRouterPush = jest.fn();
  const mockLogout = jest.fn();
  const mockSearchParamsGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useSearchParams.mockReturnValue({ get: mockSearchParamsGet });
    useDashboard.mockReturnValue({
      user: { email: 'test@example.com' },
      logout: mockLogout,
    });
    api.twoFactor.status.mockResolvedValue({ enabled: false });
    api.twoFactor.setup.mockResolvedValue({ qrCodeDataUrl: 'qr', secret: 'SECRET' });
  });

  const renderAndWait = async () => {
    render(<SettingsPage />);
    await screen.findByText(/Off|On/, {}, { timeout: 5000 });
  };

  test('renders settings page with email and 2FA', async () => {
    await renderAndWait();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Two-factor authentication')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Set up two-factor authentication')).toBeInTheDocument();
  });

  test('updates email and logs out', async () => {
    api.updateEmail.mockResolvedValue({});
    await renderAndWait();

    const emailInput = screen.getByDisplayValue('test@example.com');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'new@example.com');
    await userEvent.click(screen.getByText('Save'));

    const alert = await screen.findByTestId('alert-success', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/Email updated/);
    expect(api.updateEmail).toHaveBeenCalledWith('new@example.com');

    await waitFor(
      () => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith('/login');
      },
      { timeout: 5000 }
    );
  }, 20000);

  test('shows email update error', async () => {
    api.updateEmail.mockRejectedValue(new Error('Email taken'));
    await renderAndWait();

    await userEvent.clear(screen.getByDisplayValue('test@example.com'));
    await userEvent.type(screen.getByDisplayValue(''), 'taken@example.com');
    await userEvent.click(screen.getByText('Save'));

    const errorAlert = await screen.findByTestId('alert-error', {}, { timeout: 5000 });
    expect(errorAlert).toHaveTextContent('Email taken');
  }, 20000);

  test('starts 2FA setup', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText('Set up two-factor authentication'));
    await screen.findByAltText('Two-factor setup QR code');
    expect(screen.getByText(/Scan this with your authenticator app/i)).toBeInTheDocument();
    expect(screen.getByText('SECRET')).toBeInTheDocument();
    const img = screen.getByAltText('Two-factor setup QR code');
    expect(img).toHaveAttribute('src', 'qr');
  }, 20000);

  test('verifies 2FA code and enables', async () => {
    api.twoFactor.verify.mockResolvedValue({});
    await renderAndWait();
    fireEvent.click(screen.getByText('Set up two-factor authentication'));
    const codeInput = await screen.findByPlaceholderText('123456', {}, { timeout: 5000 });
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & enable'));

    await waitFor(() => {
      expect(api.twoFactor.verify).toHaveBeenCalledWith('123456');
      expect(screen.getByText('On')).toBeInTheDocument();
    });
  }, 20000);

  test('disables 2FA with password', async () => {
    api.twoFactor.status.mockResolvedValue({ enabled: true });
    api.twoFactor.disable.mockResolvedValue({});
    await renderAndWait();

    const disableButton = await screen.findByText('Disable two-factor authentication');
    fireEvent.click(disableButton);
    const passwordInput = await screen.findByTestId('2fa-disable-password');
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByText('Disable 2FA'));

    await waitFor(() => {
      expect(api.twoFactor.disable).toHaveBeenCalledWith('mypassword');
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  }, 20000);

  test('shows error on 2FA disable', async () => {
    api.twoFactor.status.mockResolvedValue({ enabled: true });
    api.twoFactor.disable.mockRejectedValue(new Error('Wrong password'));
    await renderAndWait();

    const disableButton = await screen.findByText('Disable two-factor authentication');
    fireEvent.click(disableButton);
    const passwordInput = await screen.findByTestId('2fa-disable-password');
    fireEvent.change(passwordInput, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Disable 2FA'));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Wrong password');
  }, 20000);

  test('auto-starts 2FA setup when query param is present', async () => {
    mockSearchParamsGet.mockImplementation((key) => {
      if (key === 'setup2fa') return '1';
      return null;
    });
    api.twoFactor.status.mockResolvedValue({ enabled: false });
    render(<SettingsPage />);
    const img = await screen.findByAltText('Two-factor setup QR code', {}, { timeout: 5000 });
    expect(img).toBeInTheDocument();
  }, 20000);
});