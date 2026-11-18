import React, { useContext } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/dashboard/layout';
import { api } from '@/lib/api';
import { DashboardContext } from '@/lib/DashboardContext';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    me: jest.fn(),
    companies: {
      list: jest.fn(),
    },
    logout: jest.fn(),
  },
}));

jest.mock('@/components/DashboardNavbar', () => {
  return function MockDashboardNavbar() {
    return <div data-testid="dashboard-navbar">Navbar</div>;
  };
});

describe('DashboardLayout', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
  });

  test('shows loading state initially', () => {
    api.me.mockImplementation(() => new Promise(() => {}));
    render(
      <DashboardLayout>
        <div>Children</div>
      </DashboardLayout>
    );
    // The loading state renders skeleton elements, not "Loading"
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  test('redirects to login on auth failure', async () => {
    api.me.mockRejectedValue(new Error('Unauthorized'));
    api.companies.list.mockResolvedValue({ companies: [] });

    render(
      <DashboardLayout>
        <div>Children</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login');
    });
  });

  test('renders children and navbar when authenticated', async () => {
    const mockUser = { email: 'test@example.com' };
    const mockCompanies = [{ id: '1', name: 'Company A', slug: 'company-a', role: 'admin' }];
    api.me.mockResolvedValue({ user: mockUser });
    api.companies.list.mockResolvedValue({ companies: mockCompanies });

    render(
      <DashboardLayout>
        <div data-testid="child">Children</div>
      </DashboardLayout>
    );

    await screen.findByTestId('dashboard-navbar');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('provides dashboard context with user and companies', async () => {
    const mockUser = { email: 'test@example.com' };
    const mockCompanies = [{ id: '1', name: 'Company A', slug: 'company-a', role: 'admin' }];
    api.me.mockResolvedValue({ user: mockUser });
    api.companies.list.mockResolvedValue({ companies: mockCompanies });

    let contextValue;
    const Consumer = () => {
      const ctx = useContext(DashboardContext);
      contextValue = ctx;
      return null;
    };

    render(
      <DashboardLayout>
        <Consumer />
      </DashboardLayout>
    );

    // Wait for the navbar to appear (meaning auth succeeded)
    await screen.findByTestId('dashboard-navbar');

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });
    expect(contextValue).toEqual({
      user: mockUser,
      companies: mockCompanies,
      refreshCompanies: expect.any(Function),
      logout: expect.any(Function),
    });
  });

  test('logout calls api.logout and redirects', async () => {
    api.me.mockResolvedValue({ user: {} });
    api.companies.list.mockResolvedValue({ companies: [] });
    api.logout.mockResolvedValue({});

    let logoutFn;
    const LogoutTester = () => {
      const { logout } = useContext(DashboardContext);
      logoutFn = logout;
      return null;
    };

    render(
      <DashboardLayout>
        <LogoutTester />
      </DashboardLayout>
    );

    await screen.findByTestId('dashboard-navbar');
    await waitFor(() => {
      expect(logoutFn).toBeDefined();
    });

    await logoutFn();
    expect(api.logout).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });
});