import {
  ENV_COLORS,
  envDotColor,
  parseEnvText,
  toEnvFormat,
  csvEscape,
  toCsvFormat,
  downloadText,
  PRESET_EXPIRY,
} from '@/lib/projectUtils';

describe('projectUtils', () => {
  test('envDotColor returns correct color', () => {
    expect(envDotColor('development')).toBe('bg-sky-400');
    expect(envDotColor('staging')).toBe('bg-amber-400');
    expect(envDotColor('production')).toBe('bg-alert');
    expect(envDotColor('unknown')).toBe('bg-mist');
  });

  test('parseEnvText parses .env content', () => {
    const input = `
      # comment
      DB_URL=postgres://localhost
      API_KEY=secret
      EMPTY=
      INVALID
    `;
    const result = parseEnvText(input);
    // The function includes EMPTY= as a variable with empty string
    expect(result).toEqual([
      { key: 'DB_URL', value: 'postgres://localhost' },
      { key: 'API_KEY', value: 'secret' },
      { key: 'EMPTY', value: '' },
    ]);
  });

  test('parseEnvText handles quoted values', () => {
    const input = `KEY="value with spaces"`;
    const result = parseEnvText(input);
    expect(result).toEqual([{ key: 'KEY', value: 'value with spaces' }]);
  });

  test('toEnvFormat formats variables correctly', () => {
    const vars = [
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
    ];
    expect(toEnvFormat(vars)).toBe('A=1\nB=2');
  });

  test('csvEscape escapes values', () => {
    expect(csvEscape('simple')).toBe('simple');
    expect(csvEscape('with, comma')).toBe('"with, comma"');
    expect(csvEscape('with "quote"')).toBe('"with ""quote"""');
  });

  test('toCsvFormat generates CSV header and rows', () => {
    const vars = [
      { key: 'DB', value: 'postgres', is_secret: false },
      { key: 'API', value: 'secret', is_secret: true },
    ];
    const csv = toCsvFormat(vars);
    expect(csv).toContain('key,value,protected');
    expect(csv).toContain('DB,postgres,false');
    expect(csv).toContain('API,secret,true');
  });

  test('downloadText creates a download link', () => {
    // Mock URL methods
    const mockCreateObjectURL = jest.fn(() => 'blob:url');
    const mockRevokeObjectURL = jest.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement to return a mock anchor
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    downloadText('test.txt', 'content');

    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:url');
    expect(mockAnchor.download).toBe('test.txt');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');

    // Restore mocks
    createElementSpy.mockRestore();
    URL.createObjectURL = global.URL.createObjectURL;
    URL.revokeObjectURL = global.URL.revokeObjectURL;
  });

  test('PRESET_EXPIRY has expected values', () => {
    expect(PRESET_EXPIRY).toContainEqual({ label: '1 hour', minutes: 60 });
    expect(PRESET_EXPIRY).toContainEqual({ label: '7 days', minutes: 10080 });
  });
});