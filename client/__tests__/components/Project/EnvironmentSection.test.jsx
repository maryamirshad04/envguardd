import { render, screen, fireEvent } from '@testing-library/react';
import EnvironmentSection from '@/components/Project/EnvironmentSection';

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

describe('EnvironmentSection', () => {
  const mockEnvironments = [
    { id: 'env1', name: 'development' },
    { id: 'env2', name: 'staging' },
  ];
  const onSwitchEnvMock = jest.fn();
  const setAddEnvOpenMock = jest.fn();
  const handleAddEnvironmentMock = jest.fn();
  const setErrorMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders environment buttons', () => {
    render(
      <EnvironmentSection
        environments={mockEnvironments}
        activeEnvId="env1"
        onSwitchEnv={onSwitchEnvMock}
        addEnvOpen={false}
        setAddEnvOpen={setAddEnvOpenMock}
        newEnvName=""
        setNewEnvName={jest.fn()}
        addEnvSubmitting={false}
        handleAddEnvironment={handleAddEnvironmentMock}
        error=""
        setError={setErrorMock}
      />
    );
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('+ environment')).toBeInTheDocument();
  });

  test('calls onSwitchEnv when environment button clicked', () => {
    render(
      <EnvironmentSection
        environments={mockEnvironments}
        activeEnvId="env1"
        onSwitchEnv={onSwitchEnvMock}
        addEnvOpen={false}
        setAddEnvOpen={setAddEnvOpenMock}
        newEnvName=""
        setNewEnvName={jest.fn()}
        addEnvSubmitting={false}
        handleAddEnvironment={handleAddEnvironmentMock}
        error=""
        setError={setErrorMock}
      />
    );
    fireEvent.click(screen.getByText('staging'));
    expect(onSwitchEnvMock).toHaveBeenCalledWith('env2');
  });

  test('opens modal when + environment clicked', () => {
    render(
      <EnvironmentSection
        environments={mockEnvironments}
        activeEnvId="env1"
        onSwitchEnv={onSwitchEnvMock}
        addEnvOpen={false}
        setAddEnvOpen={setAddEnvOpenMock}
        newEnvName=""
        setNewEnvName={jest.fn()}
        addEnvSubmitting={false}
        handleAddEnvironment={handleAddEnvironmentMock}
        error=""
        setError={setErrorMock}
      />
    );
    fireEvent.click(screen.getByText('+ environment'));
    expect(setAddEnvOpenMock).toHaveBeenCalledWith(true);
  });

  test('renders modal when addEnvOpen is true', () => {
    render(
      <EnvironmentSection
        environments={mockEnvironments}
        activeEnvId="env1"
        onSwitchEnv={onSwitchEnvMock}
        addEnvOpen={true}
        setAddEnvOpen={setAddEnvOpenMock}
        newEnvName="qa"
        setNewEnvName={jest.fn()}
        addEnvSubmitting={false}
        handleAddEnvironment={handleAddEnvironmentMock}
        error=""
        setError={setErrorMock}
      />
    );
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. qa')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});