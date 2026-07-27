import { render, screen } from '@testing-library/react';
import VariableSection from '@/components/Project/VariableSection';

jest.mock('@/components/Modal', () => {
  return function MockModal({ open, onClose, title, children }) {
    if (!open) return null;
    return <div data-testid="modal">{children}</div>;
  };
});

describe('VariableSection', () => {
  const mockVariables = [
    { id: 'v1', key: 'DB_URL', value: 'postgres://...', is_secret: false },
    { id: 'v2', key: 'API_KEY', value: 'secret', is_secret: true },
  ];

  const defaultProps = {
    variables: mockVariables,
    varsLoading: false,
    filteredVariables: mockVariables,
    paginatedVariables: mockVariables,
    varPageSafe: 1,
    varTotalPages: 1,
    onVarPageChange: jest.fn(),
    varSearch: '',
    onVarSearchChange: jest.fn(),
    varFilter: 'all',
    onVarFilterChange: jest.fn(),
    onCopyAll: jest.fn(),
    onDownloadEnv: jest.fn(),
    onDownloadCsv: jest.fn(),
    onGenerateLink: jest.fn(),
    hasVariables: true,
    addVarOpen: false,
    setAddVarOpen: jest.fn(),
    addVarError: '',
    setAddVarError: jest.fn(),
    newKey: '',
    setNewKey: jest.fn(),
    newValue: '',
    setNewValue: jest.fn(),
    showNewValue: false,
    setShowNewValue: jest.fn(),
    newIsSecret: false,
    setNewIsSecret: jest.fn(),
    addVarSubmitting: false,
    handleAddVariable: jest.fn(),
    importOpen: false,
    setImportOpen: jest.fn(),
    importError: '',
    setImportError: jest.fn(),
    importText: '',
    setImportText: jest.fn(),
    importIsSecret: false,
    setImportIsSecret: jest.fn(),
    importSubmitting: false,
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
  };

  test('renders variable list', () => {
    render(<VariableSection {...defaultProps} />);
    expect(screen.getByText('DB_URL')).toBeInTheDocument();
    expect(screen.getByText('API_KEY')).toBeInTheDocument();
    // Secret value is masked with 6 bullets (actual DOM shows ••••••)
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });
});