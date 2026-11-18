import { render, screen, fireEvent } from '@testing-library/react';
import SearchInput from '@/components/SearchInput';

describe('SearchInput', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders input with placeholder', () => {
    render(<SearchInput value="" onChange={onChangeMock} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  test('calls onChange when typing', () => {
    render(<SearchInput value="" onChange={onChangeMock} placeholder="Search" />);
    const input = screen.getByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChangeMock).toHaveBeenCalledWith('test');
  });

  test('renders with custom className', () => {
    render(<SearchInput value="" onChange={onChangeMock} className="custom-class" />);
    expect(screen.getByRole('textbox').parentElement).toHaveClass('custom-class');
  });
});