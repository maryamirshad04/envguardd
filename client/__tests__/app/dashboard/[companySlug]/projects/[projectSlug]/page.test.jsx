import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams } from 'next/navigation';
import ProjectDetailPage from '@/app/dashboard/[companySlug]/projects/[projectSlug]/page';
import { useProject } from '@/hooks/useProject';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

jest.mock('@/hooks/useProject', () => ({
  useProject: jest.fn(),
}));

// Mock child components
jest.mock('@/components/Project/EnvironmentSection', () => {
  return function MockEnvironmentSection({ environments, activeEnvId, onSwitchEnv }) {
    return (
      <div data-testid="environment-section">
        {environments.map(env => (
          <button key={env.id} data-testid={`env-${env.id}`} onClick={() => onSwitchEnv(env.id)}>
            {env.name}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/Project/VariableSection', () => {
  return function MockVariableSection({ variables, onCopyAll, onDownloadEnv, onDownloadCsv, onGenerateLink, addVarOpen, setAddVarOpen }) {
    return (
      <div data-testid="variable-section">
        {variables.map(v => <div key={v.id}>{v.key}</div>)}
        <button data-testid="copy-all" onClick={onCopyAll}>Copy All</button>
        <button data-testid="download-env" onClick={onDownloadEnv}>Download .env</button>
        <button data-testid="download-csv" onClick={onDownloadCsv}>Download CSV</button>
        <button data-testid="generate-link" onClick={onGenerateLink}>Generate Link</button>
        {addVarOpen && <div data-testid="add-var-modal">Add variable modal</div>}
        <button data-testid="open-add-var" onClick={() => setAddVarOpen(true)}>Add Variable</button>
      </div>
    );
  };
});

jest.mock('@/components/Project/ShareModal', () => {
  return function MockShareModal({ open, onClose }) {
    if (!open) return null;
    return <div data-testid="share-modal">Share Modal</div>;
  };
});

jest.mock('@/components/Skeleton', () => ({
  ProjectSkeleton: () => <div data-testid="project-skeleton">Loading project...</div>,
}));

jest.mock('@/components/Alert', () => {
  return function MockAlert({ variant, children }) {
    return <div data-testid={`alert-${variant}`}>{children}</div>;
  };
});

describe('ProjectDetailPage', () => {
  const mockUseProject = {
    project: { id: 'p1', name: 'Test Project' },
    companyName: 'Test Company',
    environments: [
      { id: 'e1', name: 'development' },
      { id: 'e2', name: 'staging' },
    ],
    activeEnvId: 'e1',
    activeEnv: { id: 'e1', name: 'development' },
    variables: [
      { id: 'v1', key: 'DB_URL', value: 'postgres://...', is_secret: false },
      { id: 'v2', key: 'API_KEY', value: 'secret-key', is_secret: true },
    ],
    loading: false,
    varsLoading: false,
    error: null,
    notice: null,
    setError: jest.fn(),
    setNotice: jest.fn(),
    varSearch: '',
    varFilter: 'all',
    varPage: 1,
    setVarPage: jest.fn(),
    varTotalPages: 1,
    varPageSafe: 1,
    paginatedVariables: [
      { id: 'v1', key: 'DB_URL', value: 'postgres://...', is_secret: false },
      { id: 'v2', key: 'API_KEY', value: 'secret-key', is_secret: true },
    ],
    filteredVariables: [
      { id: 'v1', key: 'DB_URL', value: 'postgres://...', is_secret: false },
      { id: 'v2', key: 'API_KEY', value: 'secret-key', is_secret: true },
    ],
    handleVarSearchChange: jest.fn(),
    handleVarFilterChange: jest.fn(),
    handleSwitchEnv: jest.fn(),
    addEnvOpen: false,
    setAddEnvOpen: jest.fn(),
    newEnvName: '',
    setNewEnvName: jest.fn(),
    addEnvSubmitting: false,
    handleAddEnvironment: jest.fn(),
    addVarOpen: false,
    setAddVarOpen: jest.fn(),
    newKey: '',
    setNewKey: jest.fn(),
    newValue: '',
    setNewValue: jest.fn(),
    showNewValue: false,
    setShowNewValue: jest.fn(),
    newIsSecret: false,
    setNewIsSecret: jest.fn(),
    addVarSubmitting: false,
    addVarError: '',
    setAddVarError: jest.fn(),
    handleAddVariable: jest.fn(),
    importOpen: false,
    setImportOpen: jest.fn(),
    importText: '',
    setImportText: jest.fn(),
    importIsSecret: false,
    setImportIsSecret: jest.fn(),
    importSubmitting: false,
    importError: '',
    setImportError: jest.fn(),
    handleImport: jest.fn(),
    handleFileSelect: jest.fn(),
    deletingVar: null,
    setDeletingVar: jest.fn(),
    deleteSubmitting: false,
    handleConfirmDelete: jest.fn(),
    revealed: {},
    copiedId: null,
    toggleReveal: jest.fn(),
    handleCopy: jest.fn(),
    handleCopyAll: jest.fn(),
    handleDownloadEnv: jest.fn(),
    handleDownloadCsv: jest.fn(),
    shareExpiryOpen: false,
    setShareExpiryOpen: jest.fn(),
    shareExpiryMinutes: 60,
    setShareExpiryMinutes: jest.fn(),
    customExpiryValue: 1,
    setCustomExpiryValue: jest.fn(),
    customExpiryUnit: 'hours',
    setCustomExpiryUnit: jest.fn(),
    isCustomExpiry: false,
    setIsCustomExpiry: jest.fn(),
    generatingLink: false,
    shareError: null,
    setShareError: jest.fn(),
    shareLink: null,
    showShareModal: false,
    setShowShareModal: jest.fn(),
    shareCopied: false,
    shareStep: 1,
    setShareStep: jest.fn(),
    shareAll: true,
    setShareAll: jest.fn(),
    selectedKeys: [],
    setSelectedKeys: jest.fn(),
    handleGenerateLink: jest.fn(),
    copyShareLink: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ companySlug: 'test-company', projectSlug: 'test-project' });
    useProject.mockReturnValue(mockUseProject);
  });

  test('shows loading state', () => {
    useProject.mockReturnValue({ ...mockUseProject, loading: true });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId('project-skeleton')).toBeInTheDocument();
  });

  test('renders project details and sections', () => {
    render(<ProjectDetailPage />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByTestId('environment-section')).toBeInTheDocument();
    expect(screen.getByTestId('variable-section')).toBeInTheDocument();
    expect(screen.getByText('DB_URL')).toBeInTheDocument();
    expect(screen.getByText('API_KEY')).toBeInTheDocument();
  });

  test('switches environment', async () => {
    render(<ProjectDetailPage />);
    const envButtons = screen.getAllByTestId('env-e2');
    await userEvent.click(envButtons[0]);
    expect(mockUseProject.handleSwitchEnv).toHaveBeenCalledWith('e2');
  });

  test('opens add variable modal', async () => {
    render(<ProjectDetailPage />);
    await userEvent.click(screen.getByTestId('open-add-var'));
    expect(mockUseProject.setAddVarOpen).toHaveBeenCalledWith(true);
  });

  test('calls copy all', async () => {
    render(<ProjectDetailPage />);
    await userEvent.click(screen.getByTestId('copy-all'));
    expect(mockUseProject.handleCopyAll).toHaveBeenCalled();
  });

  test('calls download .env', async () => {
    render(<ProjectDetailPage />);
    await userEvent.click(screen.getByTestId('download-env'));
    expect(mockUseProject.handleDownloadEnv).toHaveBeenCalled();
  });

  test('calls download CSV', async () => {
    render(<ProjectDetailPage />);
    await userEvent.click(screen.getByTestId('download-csv'));
    expect(mockUseProject.handleDownloadCsv).toHaveBeenCalled();
  });

  test('opens share modal', async () => {
    render(<ProjectDetailPage />);
    await userEvent.click(screen.getByTestId('generate-link'));
    expect(mockUseProject.setShareExpiryOpen).toHaveBeenCalledWith(true);
  });

  test('shows error alert', () => {
    useProject.mockReturnValue({ ...mockUseProject, error: 'Something went wrong' });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId('alert-error')).toHaveTextContent('Something went wrong');
  });

  test('shows success notice', () => {
    useProject.mockReturnValue({ ...mockUseProject, notice: 'Variable created' });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId('alert-success')).toHaveTextContent('Variable created');
  });
});