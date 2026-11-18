import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import CliLoginPage from '@/app/cli-login/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    me: jest.fn(),
    cli: { approve: jest.fn() },
  },
}));

function matchesExactText(expectedText) {
  const normalize = (text) => text.replace(/\s+/g, ' ').trim();
  return (_content, element) => {
    if (!element) return false;
    const hasText = (node) => normalize(node.textContent) === normalize(expectedText);
    const nodeHasText = hasText(element);
    const childrenDontHaveText = Array.from(element.children).every((child) => !hasText(child));
    return nodeHasText && childrenDontHaveText;
  };
}

describe('CliLoginPage', () => {
  const mockRouterPush = jest.fn();
  const mockSearchParamsGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    api.me.mockResolvedValue({});
    useRouter.mockReturnValue({ push: mockRouterPush });
    useSearchParams.mockReturnValue({
      get: mockSearchParamsGet,
    });
  });

  test('shows missing code when no code param', async () => {
    mockSearchParamsGet.mockReturnValue(null);
    render(<CliLoginPage />);
    await screen.findByText('Missing code');

    const expectedText =
      'This page is meant to be opened by the envguard login CLI command, which includes a pairing code in the link.';
    expect(await screen.findByText(matchesExactText(expectedText))).toBeInTheDocument();
  });

  test('shows loading while checking auth', async () => {
    mockSearchParamsGet.mockReturnValue('ABCDEF');
    api.me.mockImplementation(() => new Promise(() => {}));
    render(<CliLoginPage />);
    expect(screen.getByText('Checking your session…')).toBeInTheDocument();
  });

  test('shows login/signup when not logged in', async () => {
    mockSearchParamsGet.mockReturnValue('ABCDEF');
    api.me.mockRejectedValue(new Error('Not authenticated'));
    render(<CliLoginPage />);
    await screen.findByText('Log in to connect your CLI');

    expect(await screen.findByText(matchesExactText('Pairing code: ABCDEF'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log in/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/login?redirect=')
    );
    expect(screen.getByRole('link', { name: /Sign up/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/signup?redirect=')
    );
  });

  test('shows approve button when logged in', async () => {
    mockSearchParamsGet.mockReturnValue('ABCDEF');
    api.me.mockResolvedValue({ user: { email: 'test@example.com' } });
    render(<CliLoginPage />);
    await screen.findByText('Connect this device');
    expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
  });

  test('approve success', async () => {
    mockSearchParamsGet.mockReturnValue('ABCDEF');
    api.me.mockResolvedValue({});
    api.cli.approve.mockResolvedValue({});
    render(<CliLoginPage />);
    await screen.findByText('Connect this device');

    const approveButton = screen.getByRole('button', { name: /Approve/i });
    await userEvent.click(approveButton);

    await screen.findByText("You're all set");
    expect(screen.getByText(/Your CLI is now connected/i)).toBeInTheDocument();
    expect(api.cli.approve).toHaveBeenCalledWith('ABCDEF');
  });

  test('approve error shows alert', async () => {
    mockSearchParamsGet.mockReturnValue('ABCDEF');
    api.me.mockResolvedValue({});
    api.cli.approve.mockRejectedValue(new Error('Invalid code'));
    render(<CliLoginPage />);
    await screen.findByText('Connect this device');

    const approveButton = screen.getByRole('button', { name: /Approve/i });
    await userEvent.click(approveButton);

    const errorAlert = await screen.findByText('Invalid code');
    expect(errorAlert).toBeInTheDocument();
  });
});