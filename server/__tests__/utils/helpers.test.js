process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key';

const { maskEmail, generateUniqueSlug } = require('../../src/utils/helpers');
const supabase = require('../../src/config/supabase');

jest.mock('../../src/config/supabase');

describe('Helpers', () => {
  describe('maskEmail', () => {
    it('should return "unknown" for null/undefined', () => {
      expect(maskEmail(null)).toBe('unknown');
      expect(maskEmail(undefined)).toBe('unknown');
      expect(maskEmail('')).toBe('unknown');
    });

    it('should return email if no @', () => {
      expect(maskEmail('noat')).toBe('noat');
    });

    it('should mask email with 3 chars before @', () => {
      expect(maskEmail('test@example.com')).toBe('tes***@example.com');
    });

    it('should mask short local part (<=3 chars)', () => {
      expect(maskEmail('ab@example.com')).toBe('***@example.com');
      expect(maskEmail('abc@example.com')).toBe('***@example.com');
    });
  });

  describe('generateUniqueSlug', () => {
    it('should generate a slug from name', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      const slug = await generateUniqueSlug('My Workspace', 'companies');
      expect(slug).toBe('my-workspace');
      expect(supabase.from).toHaveBeenCalledWith('companies');
      expect(mockChain.select).toHaveBeenCalledWith('id');
      expect(mockChain.eq).toHaveBeenCalledWith('slug', 'my-workspace');
      expect(mockChain.maybeSingle).toHaveBeenCalled();
    });

    it('should append number if slug exists', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn()
          .mockResolvedValueOnce({ data: { id: '1' }, error: null })
          .mockResolvedValueOnce({ data: { id: '2' }, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      const slug = await generateUniqueSlug('My Workspace', 'companies');
      expect(slug).toBe('my-workspace-2');
    });

    it('should throw error when database fails', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockRejectedValue(new Error('DB error')),
      };
      supabase.from.mockReturnValue(mockChain);

      await expect(generateUniqueSlug('My Workspace', 'companies')).rejects.toThrow('DB error');
    });
  });
});