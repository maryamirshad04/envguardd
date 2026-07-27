import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import DashboardNavbar from '@/components/DashboardNavbar';
import { useDashboard } from '@/lib/DashboardContext';
import { api } from '@/lib/api';

// Mock next/link to avoid navigation and to expose href
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/DashboardContext', () => ({
  useDashboard: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    companies: {
      create: jest.fn(),
    },
  },
}));

// Mock Modal and Spinner
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

jest.mock('@/components/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner" />;
  };
});

describe('DashboardNavbar', () => {
  const mockRouterPush = jest.fn();
  const mockRefreshCompanies = jest.fn();
  const mockLogout = jest.fn();

  const mockCompanies = [
    { id: 'comp1', name: 'Acme Inc', role: 'admin' },
    { id: 'comp2', name: 'Beta Corp', role: 'member' },
  ];

  const mockUser = { email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useParams.mockReturnValue({ companyId: 'comp1' });
    useDashboard.mockReturnValue({
      user: mockUser,
      companies: mockCompanies,
      refreshCompanies: mockRefreshCompanies,
      logout: mockLogout,
    });
  });

  test('renders navbar with company name and user initial', () => {
    render(<DashboardNavbar />);
    expect(screen.getByText('envguard')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  test('company switcher opens and shows companies', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('Acme Inc'));
    expect(screen.getByText('Beta Corp')).toBeInTheDocument();
    expect(screen.getByText('+ New Team')).toBeInTheDocument();
  });

  test('clicking company name navigates to that company', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('Acme Inc'));
    const betaLink = screen.getByText('Beta Corp');
    expect(betaLink.closest('a')).toHaveAttribute('href', '/dashboard/comp2');
  });

  test('clicking + New Team opens modal', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('Acme Inc'));
    await userEvent.click(screen.getByText('+ New Team'));

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('New Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Team name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });

  test('creates new company and redirects', async () => {
    const newCompany = { id: 'comp3', name: 'New Team' };
    api.companies.create.mockResolvedValue({ company: newCompany });
    render(<DashboardNavbar />);

    await userEvent.click(screen.getByText('Acme Inc'));
    await userEvent.click(screen.getByText('+ New Team'));

    await userEvent.type(screen.getByPlaceholderText('Team name'), 'New Team');
    await userEvent.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(api.companies.create).toHaveBeenCalledWith('New Team');
      expect(mockRefreshCompanies).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/comp3');
    });
  });

  test('user menu opens and shows email', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('T'));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  test('Settings link has correct href', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('T'));
    const settingsLink = screen.getByText('Settings');
    expect(settingsLink.closest('a')).toHaveAttribute('href', '/dashboard/settings');
  });

  test('clicking Logout calls logout function', async () => {
    render(<DashboardNavbar />);
    await userEvent.click(screen.getByText('T'));
    const logoutButton = screen.getByText('Log out');
    await userEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalled();
  });
});