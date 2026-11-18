import { render, screen } from '@testing-library/react';
import GoogleSignInButton from '@/components/GoogleSignInButton';

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

describe('GoogleSignInButton', () => {
  let originalGoogle;
  let originalEnv;

  beforeEach(() => {
    originalGoogle = global.window.google;
    originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'mock-client-id';
  });

  afterEach(() => {
    global.window.google = originalGoogle;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
    jest.clearAllMocks();
  });

  test('renders container div', () => {
    global.window.google = {
      accounts: {
        id: {
          initialize: jest.fn(),
          renderButton: jest.fn(),
        },
      },
    };
    const onCredential = jest.fn();
    render(<GoogleSignInButton onCredential={onCredential} />);
    const container = document.querySelector('.flex.justify-center.w-full');
    expect(container).toBeInTheDocument();
  });

  test('calls onCredential when Google callback is triggered', () => {
    const mockInitialize = jest.fn();
    global.window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: jest.fn(),
        },
      },
    };
    const onCredential = jest.fn();
    render(<GoogleSignInButton onCredential={onCredential} />);

    const initializeCall = mockInitialize.mock.calls[0][0];
    const callback = initializeCall.callback;
    callback({ credential: 'mock-credential' });
    expect(onCredential).toHaveBeenCalledWith('mock-credential');
  });

  test('calls onError when Google callback has no credential', () => {
    const mockInitialize = jest.fn();
    global.window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: jest.fn(),
        },
      },
    };
    const onCredential = jest.fn();
    const onError = jest.fn();
    render(<GoogleSignInButton onCredential={onCredential} onError={onError} />);

    const initializeCall = mockInitialize.mock.calls[0][0];
    const callback = initializeCall.callback;
    callback({});
    expect(onCredential).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      'Google sign-in did not return a credential'
    );
  });

  test('loads script when google is not defined initially', () => {
    delete global.window.google;
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const onCredential = jest.fn();
    render(<GoogleSignInButton onCredential={onCredential} />);
    expect(appendChildSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        src: 'https://accounts.google.com/gsi/client',
        async: true,
        defer: true,
      })
    );
  });
});