/**
 * Input validation utilities
 */

export class Validator {
  /**
   * Validate GitHub repository format (owner/repo)
   * @param repo - Repository string in format "owner/repo"
   * @returns True if valid format
   */
  static isValidRepoFormat(repo: string): boolean {
    if (!repo || typeof repo !== 'string') {
      return false;
    }

    const parts = repo.split('/');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  }

  /**
   * Parse repository string into owner and repo name
   * @param repo - Repository string in format "owner/repo"
   * @returns Object with owner and repo, or null if invalid
   */
  static parseRepo(repo: string): { owner: string; repo: string } | null {
    if (!this.isValidRepoFormat(repo)) {
      return null;
    }

    const [owner, repoName] = repo.split('/');
    return { owner, repo: repoName };
  }

  /**
   * Validate GitHub token format (basic check)
   * @param token - GitHub personal access token
   * @returns True if token looks valid
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // GitHub tokens are typically 40+ characters
    // Classic tokens start with 'ghp_', fine-grained with 'github_pat_'
    const trimmed = token.trim();
    return (
      trimmed.length >= 40 &&
      (trimmed.startsWith('ghp_') ||
        trimmed.startsWith('github_pat_') ||
        /^[a-f0-9]+$/i.test(trimmed))
    );
  }

  /**
   * Validate display format option
   * @param format - Display format string
   * @returns True if valid format
   */
  static isValidDisplayFormat(format: string): format is 'compact' | 'detailed' | 'json' {
    return ['compact', 'detailed', 'json'].includes(format);
  }

  /**
   * Validate sort field option
   * @param field - Sort field string
   * @returns True if valid field
   */
  static isValidSortField(field: string): field is 'created' | 'updated' | 'comments' | 'title' {
    return ['created', 'updated', 'comments', 'title'].includes(field);
  }

  /**
   * Validate sort direction option
   * @param direction - Sort direction string
   * @returns True if valid direction
   */
  static isValidSortDirection(direction: string): direction is 'asc' | 'desc' {
    return ['asc', 'desc'].includes(direction);
  }

  /**
   * Sanitize user input to prevent injection
   * @param input - User input string
   * @returns Sanitized string
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '').trim();
  }
}
