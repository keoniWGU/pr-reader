import { Validator } from '../utils/validator';

describe('Validator', () => {
  describe('isValidRepoFormat', () => {
    it('should return true for valid repository format', () => {
      expect(Validator.isValidRepoFormat('owner/repo')).toBe(true);
      expect(Validator.isValidRepoFormat('vercel/next.js')).toBe(true);
      expect(Validator.isValidRepoFormat('facebook/react')).toBe(true);
    });

    it('should return false for invalid repository format', () => {
      expect(Validator.isValidRepoFormat('')).toBe(false);
      expect(Validator.isValidRepoFormat('invalid')).toBe(false);
      expect(Validator.isValidRepoFormat('owner/')).toBe(false);
      expect(Validator.isValidRepoFormat('/repo')).toBe(false);
      expect(Validator.isValidRepoFormat('owner/repo/extra')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(Validator.isValidRepoFormat(null as any)).toBe(false);
      expect(Validator.isValidRepoFormat(undefined as any)).toBe(false);
      expect(Validator.isValidRepoFormat(123 as any)).toBe(false);
    });
  });

  describe('parseRepo', () => {
    it('should parse valid repository string', () => {
      const result = Validator.parseRepo('owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid repository string', () => {
      expect(Validator.parseRepo('invalid')).toBeNull();
      expect(Validator.parseRepo('')).toBeNull();
      expect(Validator.parseRepo('owner/')).toBeNull();
    });
  });

  describe('isValidTokenFormat', () => {
    it('should return true for valid token formats', () => {
      // Classic token format
      expect(Validator.isValidTokenFormat('ghp_' + 'a'.repeat(40))).toBe(true);
      // Fine-grained token format
      expect(Validator.isValidTokenFormat('github_pat_' + 'a'.repeat(40))).toBe(true);
      // Legacy hex format
      expect(Validator.isValidTokenFormat('a'.repeat(40))).toBe(true);
    });

    it('should return false for invalid token formats', () => {
      expect(Validator.isValidTokenFormat('')).toBe(false);
      expect(Validator.isValidTokenFormat('short')).toBe(false);
      expect(Validator.isValidTokenFormat('a'.repeat(30))).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(Validator.isValidTokenFormat(null as any)).toBe(false);
      expect(Validator.isValidTokenFormat(undefined as any)).toBe(false);
    });
  });

  describe('isValidDisplayFormat', () => {
    it('should return true for valid display formats', () => {
      expect(Validator.isValidDisplayFormat('compact')).toBe(true);
      expect(Validator.isValidDisplayFormat('detailed')).toBe(true);
      expect(Validator.isValidDisplayFormat('json')).toBe(true);
    });

    it('should return false for invalid display formats', () => {
      expect(Validator.isValidDisplayFormat('invalid')).toBe(false);
      expect(Validator.isValidDisplayFormat('')).toBe(false);
      expect(Validator.isValidDisplayFormat('COMPACT')).toBe(false);
    });
  });

  describe('isValidSortField', () => {
    it('should return true for valid sort fields', () => {
      expect(Validator.isValidSortField('created')).toBe(true);
      expect(Validator.isValidSortField('updated')).toBe(true);
      expect(Validator.isValidSortField('comments')).toBe(true);
      expect(Validator.isValidSortField('title')).toBe(true);
    });

    it('should return false for invalid sort fields', () => {
      expect(Validator.isValidSortField('invalid')).toBe(false);
      expect(Validator.isValidSortField('')).toBe(false);
      expect(Validator.isValidSortField('CREATED')).toBe(false);
    });
  });

  describe('isValidSortDirection', () => {
    it('should return true for valid sort directions', () => {
      expect(Validator.isValidSortDirection('asc')).toBe(true);
      expect(Validator.isValidSortDirection('desc')).toBe(true);
    });

    it('should return false for invalid sort directions', () => {
      expect(Validator.isValidSortDirection('invalid')).toBe(false);
      expect(Validator.isValidSortDirection('')).toBe(false);
      expect(Validator.isValidSortDirection('ASC')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(Validator.sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(Validator.sanitizeInput('test"value')).toBe('testvalue');
      expect(Validator.sanitizeInput("test'value")).toBe('testvalue');
      expect(Validator.sanitizeInput('test&value')).toBe('testvalue');
    });

    it('should trim whitespace', () => {
      expect(Validator.sanitizeInput('  test  ')).toBe('test');
      expect(Validator.sanitizeInput('\ntest\n')).toBe('test');
    });

    it('should return empty string for invalid input', () => {
      expect(Validator.sanitizeInput(null as any)).toBe('');
      expect(Validator.sanitizeInput(undefined as any)).toBe('');
      expect(Validator.sanitizeInput(123 as any)).toBe('');
    });

    it('should allow safe characters', () => {
      expect(Validator.sanitizeInput('owner/repo-name_v1.0')).toBe('owner/repo-name_v1.0');
      expect(Validator.sanitizeInput('user@example.com')).toBe('user@example.com'); // @ is safe
    });
  });
});
