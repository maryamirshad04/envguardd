import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/dashboard/page';
import { useDashboard } from '@/lib/DashboardContext';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/DashboardContext', () => ({
  useDashboard: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    companies: {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

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

jest.mock('@/components/Alert', () => {
  return function MockAlert({ variant, children, title }) {
    return (
      <div data-testid={`alert-${variant}`}>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    );
  };
});

jest.mock('@/components/Pagination', () => {
  return function MockPagination({ page, totalPages, onChange }) {
    return (
      <div data-testid="pagination">
        <button onClick={() => onChange(page + 1)}>Next</button>
      </div>
    );
  };
});

jest.mock('@/components/SearchInput', () => {
  return function MockSearchInput({ value, onChange, placeholder }) {
    return (
      <input
        data-testid="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

describe('DashboardPage', () => {
  const mockRouterPush = jest.fn();
  const mockRefreshCompanies = jest.fn();

  const mockCompanies = [
    { id: '1', name: 'Company A', slug: 'company-a', role: 'admin', created_at: '2023-01-01' },
    { id: '2', name: 'Company B', slug: 'company-b', role: 'member', created_at: '2023-02-01' },
    { id: '3', name: 'Company C', slug: 'company-c', role: 'admin', created_at: '2023-03-01' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useDashboard.mockReturnValue({
      companies: mockCompanies,
      refreshCompanies: mockRefreshCompanies,
    });
  });

  test('renders the dashboard with company list', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Your Teams')).toBeInTheDocument();
    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Company B')).toBeInTheDocument();
    expect(screen.getByText('Company C')).toBeInTheDocument();
    expect(screen.getByText('+ New Team')).toBeInTheDocument();
  });

  test('filters companies by search', async () => {
    render(<DashboardPage />);
    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'Company A');
    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.queryByText('Company B')).not.toBeInTheDocument();
    expect(screen.queryByText('Company C')).not.toBeInTheDocument();
  });

  test('opens create modal', async () => {
    render(<DashboardPage />);
    await userEvent.click(screen.getByText('+ New Team'));
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('New company')).toBeInTheDocument();
  });

  test('creates a new company', async () => {
    const newCompany = { company: { id: '4', name: 'New Company', slug: 'new-company' } };
    api.companies.create.mockResolvedValue(newCompany);
    render(<DashboardPage />);

    await userEvent.click(screen.getByText('+ New Team'));
    const input = screen.getByPlaceholderText('Company name');
    await userEvent.type(input, 'New Company');
    await userEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.companies.create).toHaveBeenCalledWith('New Company');
      expect(mockRefreshCompanies).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/new-company');
    });
  });

  test('shows error on create failure', async () => {
    api.companies.create.mockRejectedValue(new Error('Name taken'));
    render(<DashboardPage />);

    await userEvent.click(screen.getByText('+ New Team'));
    await userEvent.type(screen.getByPlaceholderText('Company name'), 'Existing');
    await userEvent.click(screen.getByText('Create'));

    const errorAlert = await screen.findByTestId('alert-error');
    expect(errorAlert).toHaveTextContent('Name taken');
  });

  test('opens edit modal for admin', async () => {
    render(<DashboardPage />);
    const editButtons = screen.getAllByLabelText(/Edit Company A/i);
    await userEvent.click(editButtons[0]);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Team')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Company A')).toBeInTheDocument();
  });

  test('renames company', async () => {
    api.companies.update.mockResolvedValue({});
    render(<DashboardPage />);

    const editButtons = screen.getAllByLabelText(/Edit Company A/i);
    await userEvent.click(editButtons[0]);
    const input = screen.getByDisplayValue('Company A');
    await userEvent.clear(input);
    await userEvent.type(input, 'Company A Renamed');
    await userEvent.click(screen.getByText('Save name'));

    await waitFor(() => {
      expect(api.companies.update).toHaveBeenCalledWith('company-a', 'Company A Renamed');
      expect(mockRefreshCompanies).toHaveBeenCalled();
    });
  });

  test('deletes company after confirmation', async () => {
    api.companies.remove.mockResolvedValue({});
    render(<DashboardPage />);

    const editButtons = screen.getAllByLabelText(/Edit Company A/i);
    await userEvent.click(editButtons[0]);
    await userEvent.click(screen.getByText('Delete this team'));
    expect(screen.getByText('Delete "Company A"?')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Yes, delete'));

    await waitFor(() => {
      expect(api.companies.remove).toHaveBeenCalledWith('company-a');
      expect(mockRefreshCompanies).toHaveBeenCalled();
    });
  });

  test('shows empty state when no companies', () => {
    useDashboard.mockReturnValue({
      companies: [],
      refreshCompanies: mockRefreshCompanies,
    });
    render(<DashboardPage />);
    expect(screen.getByText('No Team yet.')).toBeInTheDocument();
  });
});