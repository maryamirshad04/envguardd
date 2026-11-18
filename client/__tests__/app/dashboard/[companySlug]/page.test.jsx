import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import CompanyDetailPage from '@/app/dashboard/[companySlug]/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    companies: {
      get: jest.fn(),
      projects: {
        list: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
      },
      members: jest.fn(),
      invites: {
        list: jest.fn(),
        create: jest.fn(),
        revoke: jest.fn(),
      },
    },
  },
}));

// Mocks for child components
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
    return <div data-testid="pagination">Pagination</div>;
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

jest.mock('@/components/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton">Skeleton</div>,
  CardGridSkeleton: () => <div data-testid="card-grid-skeleton">CardGridSkeleton</div>,
}));

describe('CompanyDetailPage', () => {
  const mockRouterPush = jest.fn();

  const mockCompany = {
    id: '1',
    name: 'Test Company',
    slug: 'test-company',
    role: 'admin',
  };

  const mockProjects = [
    { id: 'p1', name: 'Project 1', slug: 'project-1', created_at: '2023-01-01' },
    { id: 'p2', name: 'Project 2', slug: 'project-2', created_at: '2023-02-01' },
  ];

  const mockMembers = [
    { id: 'm1', email: 'member1@example.com', role: 'admin' },
    { id: 'm2', email: 'member2@example.com', role: 'member' },
  ];

  const mockInvites = [
    { id: 'i1', email: 'invitee@example.com', role: 'member' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ push: mockRouterPush });
    useParams.mockReturnValue({ companySlug: 'test-company' });

    api.companies.get.mockResolvedValue({ company: mockCompany });
    api.companies.projects.list.mockResolvedValue({ projects: mockProjects });
    api.companies.members.mockResolvedValue({ members: mockMembers });
    api.companies.invites.list.mockResolvedValue({ invites: mockInvites });
  });

  test('shows loading state', () => {
    api.companies.get.mockImplementation(() => new Promise(() => {}));
    render(<CompanyDetailPage />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('redirects to dashboard if company not found', async () => {
    api.companies.get.mockRejectedValue(new Error('not found'));
    render(<CompanyDetailPage />);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('renders company details and projects tab', async () => {
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await screen.findByText('Project 1');
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Invite')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
    expect(screen.getByText('+ New project')).toBeInTheDocument();
  });

  test('switches to team tab', async () => {
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await userEvent.click(screen.getByText('Invite'));
    expect(screen.getByText('Invite someone')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('member1@example.com')).toBeInTheDocument();
    expect(screen.getByText('member2@example.com')).toBeInTheDocument();
    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
  });

  test('creates a new project', async () => {
    const newProject = { project: { id: 'p3', name: 'New Project', slug: 'new-project' } };
    api.companies.projects.create.mockResolvedValue(newProject);
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');

    await userEvent.click(screen.getByText('+ New project'));
    await userEvent.type(screen.getByPlaceholderText('Project name'), 'New Project');
    await userEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.companies.projects.create).toHaveBeenCalledWith('test-company', 'New Project');
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });
  });

  test('renames a project', async () => {
    api.companies.projects.update.mockResolvedValue({
      project: { id: 'p1', name: 'Project 1 Renamed', slug: 'project-1' },
    });
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await screen.findByText('Project 1');
    const editButtons = await screen.findAllByLabelText(/Edit Project 1/i);
    await userEvent.click(editButtons[0]);
    const input = screen.getByDisplayValue('Project 1');
    await userEvent.clear(input);
    await userEvent.type(input, 'Project 1 Renamed');
    await userEvent.click(screen.getByText('Save name'));

    await waitFor(() => {
      expect(api.companies.projects.update).toHaveBeenCalledWith('test-company', 'project-1', 'Project 1 Renamed');
      expect(screen.getByText('Project 1 Renamed')).toBeInTheDocument();
    });
  });

  test('deletes a project after confirmation', async () => {
    api.companies.projects.remove.mockResolvedValue({});
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await screen.findByText('Project 1');
    const editButtons = await screen.findAllByLabelText(/Edit Project 1/i);
    await userEvent.click(editButtons[0]);
    await userEvent.click(screen.getByText('Delete this project'));
    expect(screen.getByText((content) => content.includes('Delete') && content.includes('Project 1'))).toBeInTheDocument();
    await userEvent.click(screen.getByText('Yes, delete'));

    await waitFor(() => {
      expect(api.companies.projects.remove).toHaveBeenCalledWith('test-company', 'project-1');
      expect(screen.queryByText('Project 1')).not.toBeInTheDocument();
    });
  });

  test('sends an invite', async () => {
    const inviteResponse = { invite: { id: 'i2', email: 'new@example.com', role: 'member' } };
    api.companies.invites.create.mockResolvedValue(inviteResponse);
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await userEvent.click(screen.getByText('Invite'));

    await userEvent.type(screen.getByPlaceholderText('teammate@company.com'), 'new@example.com');
    await userEvent.click(screen.getByText('Send invite'));

    await waitFor(() => {
      expect(api.companies.invites.create).toHaveBeenCalledWith('test-company', 'new@example.com', 'member');
      expect(screen.getByText('Invite sent to new@example.com')).toBeInTheDocument();
    });
  });

  test('revokes an invite', async () => {
    api.companies.invites.revoke.mockResolvedValue({});
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await userEvent.click(screen.getByText('Invite'));

    const revokeButtons = screen.getAllByText('Revoke');
    await userEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(api.companies.invites.revoke).toHaveBeenCalledWith('test-company', 'i1');
      expect(screen.queryByText('invitee@example.com')).not.toBeInTheDocument();
    });
  });

  test('shows error when invite fails', async () => {
    api.companies.invites.create.mockRejectedValue(new Error('Invalid email'));
    render(<CompanyDetailPage />);
    await screen.findByText('Test Company');
    await userEvent.click(screen.getByText('Invite'));
    await screen.findByText('Invite someone');

    const emailInput = screen.getByPlaceholderText('teammate@company.com');
    await userEvent.type(emailInput, 'invalid');

    const form = emailInput.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.companies.invites.create).toHaveBeenCalled();
    });

    const errorAlerts = await screen.findAllByTestId('alert-error', {}, { timeout: 5000 });
    expect(errorAlerts.length).toBeGreaterThan(0);
    expect(errorAlerts[0]).toHaveTextContent('Invalid email');
  }, 15000);
});