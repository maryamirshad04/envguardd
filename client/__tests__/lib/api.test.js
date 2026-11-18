import { api } from '@/lib/api';

describe('api client', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  const mockFetch = (responseData, ok = true, status = 200) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      status,
      json: jest.fn().mockResolvedValue(responseData),
    });
  };

  describe('request helper', () => {
    it('calls fetch with correct URL and options', async () => {
      mockFetch({ message: 'ok' });
      await api.me();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
      );
    });

    it('throws when response is not ok', async () => {
      mockFetch({ error: 'Invalid token' }, false, 401);
      await expect(api.me()).rejects.toThrow('Invalid token');
    });

    it('throws generic error if no error field in response', async () => {
      mockFetch({}, false, 500);
      await expect(api.me()).rejects.toThrow('Something went wrong');
    });
  });

  describe('auth endpoints', () => {
    it('login sends correct body', async () => {
      mockFetch({ user: {} });
      await api.login('test@example.com', 'pass');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
        })
      );
    });

    it('signup sends correct body', async () => {
      mockFetch({});
      await api.signup('new@example.com', 'secret');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com', password: 'secret' }),
        })
      );
    });

  });

  describe('CLI approve', () => {
    it('sends code in body', async () => {
      mockFetch({ success: true });
      await api.cli.approve('ABC123');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/cli/approve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'ABC123' }),
        })
      );
    });
  });

});