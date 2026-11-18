import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '@/components/Pagination';

describe('Pagination', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when totalPages <= 1', () => {
    render(<Pagination page={1} totalPages={1} onChange={onChangeMock} />);
    expect(screen.queryByText('Prev')).not.toBeInTheDocument();
  });

  test('renders pagination controls', () => {
    render(<Pagination page={2} totalPages={5} onChange={onChangeMock} />);
    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 5/)).toBeInTheDocument();
  });

  test('disables Prev on first page', () => {
    render(<Pagination page={1} totalPages={5} onChange={onChangeMock} />);
    expect(screen.getByText('Prev')).toBeDisabled();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  test('disables Next on last page', () => {
    render(<Pagination page={5} totalPages={5} onChange={onChangeMock} />);
    expect(screen.getByText('Next')).toBeDisabled();
    expect(screen.getByText('Prev')).not.toBeDisabled();
  });

  test('calls onChange with correct page when Prev/Next clicked', () => {
    render(<Pagination page={3} totalPages={5} onChange={onChangeMock} />);
    fireEvent.click(screen.getByText('Prev'));
    expect(onChangeMock).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByText('Next'));
    expect(onChangeMock).toHaveBeenCalledWith(4);
  });
});