import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/Modal';

describe('Modal', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when closed', () => {
    render(<Modal open={false} onClose={onCloseMock} title="Test">Content</Modal>);
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  test('renders when open', () => {
    render(<Modal open={true} onClose={onCloseMock} title="Test">Content</Modal>);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('calls onClose when clicking backdrop', () => {
    render(<Modal open={true} onClose={onCloseMock} title="Test">Content</Modal>);
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop);
    expect(onCloseMock).toHaveBeenCalled();
  });

  test('calls onClose when pressing Escape key', () => {
    render(<Modal open={true} onClose={onCloseMock} title="Test">Content</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalled();
  });

  test('does not call onClose when clicking inside modal', () => {
    render(<Modal open={true} onClose={onCloseMock} title="Test">Content</Modal>);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  test('renders close button and calls onClose when clicked', () => {
    render(<Modal open={true} onClose={onCloseMock} title="Test">Content</Modal>);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalled();
  });
});