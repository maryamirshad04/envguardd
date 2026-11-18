import { render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'next/navigation';
import SharePage from '@/app/share/[token]/page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    share: {
      get: jest.fn(),
    },
  },
}));

describe('SharePage', () => {
  const mockToken = 'abc123';
  const mockShareData = {
    variables: [
      { key: 'DB_URL', value: 'postgres://...', is_secret: false },
      { key: 'API_KEY', value: 'secret-key', is_secret: true },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useParams.mockReturnValue({ token: mockToken });
    api.share.get.mockResolvedValue(mockShareData);
  });

  test('shows loading spinner', () => {
    api.share.get.mockImplementation(() => new Promise(() => {}));
    render(<SharePage />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('renders shared variables', async () => {
    render(<SharePage />);
    await screen.findByText('DB_URL');
    expect(screen.getByText('postgres://...')).toBeInTheDocument();
    expect(screen.getByText('API_KEY')).toBeInTheDocument();
    // Secret values are masked with 10 bullets (actual count from DOM)
    expect(screen.getByText('••••••••••')).toBeInTheDocument();
    // Check the "viewed once" message
    expect(screen.getByText(/This link was viewed once/i)).toBeInTheDocument();
  });

  test('shows error when token invalid', async () => {
    api.share.get.mockRejectedValue(new Error('Invalid or expired link'));
    render(<SharePage />);
    const error = await screen.findByText(/Invalid or expired link/i);
    expect(error).toBeInTheDocument();
  });
});